import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';

import { HistoryService } from './history.service';
import { AuditService } from '@server/common/audit/audit.service';
import { PermissionService } from '@server/common/permission/permission.service';
import {
  appData,
  history,
  jizhangRecords,
  pages,
  users,
} from '@server/database/schema';
import type {
  HistoryRecord,
  ListResponse,
  ScopeType,
  UserLevel,
  VisibilityType,
} from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

type AuthRequest = Request & { user: AuthUser };

interface UserContext {
  id: string;
  level: UserLevel;
  groupId: string | null;
  approved: boolean;
}

// app_data 无 groupId：group 范围按负责人所在分组判定，需要一并带出负责人 groupId
type ProjectWithOwnerGroup = typeof appData.$inferSelect & {
  ownerGroupId: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('api/history')
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // 单条记录的历史版本
  @Get()
  async listByTarget(
    @Req() req: AuthRequest,
    @Query('targetCollection') targetCollection?: string,
    @Query('targetRecordId') targetRecordId?: string,
  ): Promise<HistoryRecord[]> {
    if (!targetCollection || !targetRecordId) {
      throw new BadRequestException('缺少 targetCollection 或 targetRecordId 参数');
    }
    this.assertUuid(targetRecordId, 'targetRecordId');

    const user = await this.getUserContext(req.user);
    await this.assertCanAccess(user, targetCollection, targetRecordId, false);

    const records = await this.historyService.getHistory(
      targetCollection,
      targetRecordId,
    );
    return this.withOperatorNames(records);
  }

  // 项目下的全部历史版本（静态路由，必须写在动态路由之前）
  @Get('project/:projectId')
  async listByProject(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<ListResponse<HistoryRecord>> {
    this.assertUuid(projectId, 'projectId');

    const user = await this.getUserContext(req.user);
    const project = await this.loadProject(projectId);
    this.assertProjectAccess(user, project, false);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);

    const result = await this.historyService.getProjectHistory(
      projectId,
      pageNum,
      pageSizeNum,
    );

    return {
      ...result,
      items: await this.withOperatorNames(result.items),
    };
  }

  // 恢复到指定历史版本（需要目标记录的编辑权限）
  @Post(':historyId/restore')
  async restore(
    @Req() req: AuthRequest,
    @Param('historyId') historyId: string,
  ): Promise<void> {
    this.assertUuid(historyId, 'historyId');

    const user = await this.getUserContext(req.user);

    const rows = await this.db
      .select()
      .from(history)
      .where(eq(history.id, historyId))
      .limit(1);
    const historyRow = rows[0];
    if (!historyRow) {
      throw new NotFoundException('历史记录不存在');
    }

    await this.assertCanAccess(
      user,
      historyRow.targetCollection,
      historyRow.targetRecordId,
      true,
    );

    await this.historyService.restore(historyId, user.id);

    await this.auditService.log(
      user.id,
      'history_restore',
      `${historyRow.targetCollection}:${historyRow.targetRecordId}`,
      `恢复历史版本: ${historyRow.targetTitle ?? historyRow.targetCollection}`,
    );
  }

  // ========== 内部方法 ==========

  private assertUuid(value: string, field: string): void {
    if (!UUID_PATTERN.test(value)) {
      throw new BadRequestException(`${field} 格式不正确`);
    }
  }

  private async getUserContext(authUser: AuthUser): Promise<UserContext> {
    const rows = await this.db
      .select({
        id: users.id,
        level: users.level,
        groupId: users.groupId,
        approved: users.approved,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('用户不存在');
    }

    return {
      id: row.id,
      level: (row.level as UserLevel) ?? 'level_3',
      groupId: row.groupId,
      approved: row.approved,
    };
  }

  private async loadProject(
    projectId: string,
  ): Promise<ProjectWithOwnerGroup> {
    const rows = await this.db
      .select({ project: appData, ownerGroupId: users.groupId })
      .from(appData)
      .leftJoin(users, eq(appData.ownerId, users.id))
      .where(eq(appData.id, projectId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('项目不存在');
    }
    return { ...row.project, ownerGroupId: row.ownerGroupId ?? null };
  }

  private assertProjectAccess(
    user: UserContext,
    project: ProjectWithOwnerGroup,
    needEdit: boolean,
  ): void {
    const projectRow = {
      ...project,
      readScope: project.readScope as ScopeType,
      editScope: project.editScope as ScopeType,
    };

    const allowed = needEdit
      ? this.permissionService.canEditProject(user, projectRow)
      : this.permissionService.canReadProject(user, projectRow);

    if (allowed) return;

    if (needEdit) {
      throw new ForbiddenException('无权恢复该版本');
    }
    throw new NotFoundException('项目不存在');
  }

  private async assertCanAccess(
    user: UserContext,
    targetCollection: string,
    targetRecordId: string,
    needEdit: boolean,
  ): Promise<void> {
    switch (targetCollection) {
      case 'app_data': {
        const project = await this.loadProject(targetRecordId);
        this.assertProjectAccess(user, project, needEdit);
        return;
      }
      case 'jizhang_records': {
        const rows = await this.db
          .select({
            id: jizhangRecords.id,
            ownerId: jizhangRecords.ownerId,
            projectId: jizhangRecords.projectId,
          })
          .from(jizhangRecords)
          .where(eq(jizhangRecords.id, targetRecordId))
          .limit(1);

        const record = rows[0];
        if (!record) {
          throw new NotFoundException('记录不存在');
        }

        if (record.projectId) {
          const project = await this.loadProject(record.projectId);
          this.assertProjectAccess(user, project, needEdit);
          return;
        }

        const isGlobalAdmin =
          this.permissionService.isLevel1Admin(user) ||
          this.permissionService.isSuperAdmin(user);
        if (isGlobalAdmin || record.ownerId === user.id) return;

        if (needEdit) {
          throw new ForbiddenException('无权恢复该版本');
        }
        throw new NotFoundException('记录不存在');
      }
      case 'pages': {
        const rows = await this.db
          .select({
            id: pages.id,
            visibility: pages.visibility,
            visibleUserIds: pages.visibleUserIds,
            groupId: pages.groupId,
            ownerId: pages.ownerId,
          })
          .from(pages)
          .where(eq(pages.id, targetRecordId))
          .limit(1);

        const page = rows[0];
        if (!page) {
          throw new NotFoundException('页面不存在');
        }

        const pageRow = {
          ...page,
          visibility: page.visibility as VisibilityType,
        };
        const allowed = needEdit
          ? this.permissionService.canEditPage(user, pageRow)
          : this.permissionService.canViewPage(user, pageRow);

        if (allowed) return;

        if (needEdit) {
          throw new ForbiddenException('无权恢复该版本');
        }
        throw new NotFoundException('页面不存在');
      }
      default:
        throw new BadRequestException(
          `不支持的 targetCollection: ${targetCollection}`,
        );
    }
  }

  private async withOperatorNames(
    records: HistoryRecord[],
  ): Promise<HistoryRecord[]> {
    const operatorIds: string[] = Array.from(
      new Set(
        records
          .map((record: HistoryRecord) => record.operatorId)
          .filter((id: string | undefined): id is string => !!id),
      ),
    );

    if (operatorIds.length === 0) {
      return records;
    }

    const rows = await this.db
      .select({ id: users.id, nickname: users.nickname })
      .from(users)
      .where(inArray(users.id, operatorIds));

    const nameMap = new Map<string, string>(
      rows.map((row: { id: string; nickname: string }) => [row.id, row.nickname]),
    );

    return records.map((record: HistoryRecord) => {
      if (!record.operatorId) return record;
      return {
        ...record,
        operatorName: nameMap.get(record.operatorId) ?? undefined,
      };
    });
  }
}
