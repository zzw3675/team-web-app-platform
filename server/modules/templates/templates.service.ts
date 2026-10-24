import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { templates, users } from '@server/database/schema';
import { AuditService } from '@server/common/audit/audit.service';
import { PermissionService } from '@server/common/permission/permission.service';
import { escapeLikePattern } from '@server/common/utils/escape-like';
import type {
  ListResponse,
  Template,
  TemplateType,
  UserLevel,
  VisibilityType,
} from '@shared/api.interface';
import type { UpdateTemplateVisibilityDto } from './dto/update-template-visibility.dto';

interface TemplateWithOwner {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  description: string | null;
  htmlContent?: string | null;
  url: string | null;
  visibility: string;
  visibleUserIds: string[];
  visibleGroupIds: string[];
  sortOrder: number;
  ownerId: string | null;
  ownerNickname: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const JIZHANG_TEMPLATE_NAME = '记账本';
const JIZHANG_APP = 'jizhang';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
  ) {}

  async onModuleInit(): Promise<void> {
    // 预置记账本模板
    try {
      const existing = await this.db
        .select({ id: templates.id })
        .from(templates)
        .where(eq(templates.name, JIZHANG_TEMPLATE_NAME))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(templates).values({
          name: JIZHANG_TEMPLATE_NAME,
          type: 'app',
          icon: 'Wallet',
          description: '团队收支记账应用，支持分类统计、导出CSV、历史版本',
          visibility: 'all',
          visibleUserIds: [],
          visibleGroupIds: [],
          sortOrder: 1,
          url: JIZHANG_APP,
        });
      }
    } catch {
      // 初始化失败不影响服务启动
    }
  }

  private isGlobalAdmin(level: string): boolean {
    return level === 'super_admin' || level === 'level_1';
  }

  async getList(params: {
    page: number;
    pageSize: number;
    keyword?: string;
  }): Promise<ListResponse<Template>> {
    const { page, pageSize, keyword } = params;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (keyword) {
      const keywordPattern = `%${escapeLikePattern(keyword)}%`;
      conditions.push(
        or(
          ilike(templates.name, keywordPattern),
          ilike(templates.description, keywordPattern),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(templates)
        .where(whereClause),
      this.db
        .select({
          id: templates.id,
          name: templates.name,
          type: templates.type,
          icon: templates.icon,
          description: templates.description,
          url: templates.url,
          visibility: templates.visibility,
          visibleUserIds: templates.visibleUserIds,
          visibleGroupIds: templates.visibleGroupIds,
          sortOrder: templates.sortOrder,
          ownerId: templates.ownerId,
          ownerNickname: users.nickname,
          createdAt: templates.createdAt,
          updatedAt: templates.updatedAt,
        })
        .from(templates)
        .leftJoin(users, eq(templates.ownerId, users.id))
        .where(whereClause)
        .orderBy(desc(templates.sortOrder), desc(templates.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: TemplateWithOwner) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async getDetail(id: string): Promise<Template> {
    const rows = await this.db
      .select({
        id: templates.id,
        name: templates.name,
        type: templates.type,
        icon: templates.icon,
        description: templates.description,
        htmlContent: templates.htmlContent,
        url: templates.url,
        visibility: templates.visibility,
        visibleUserIds: templates.visibleUserIds,
        visibleGroupIds: templates.visibleGroupIds,
        sortOrder: templates.sortOrder,
        ownerId: templates.ownerId,
        ownerNickname: users.nickname,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .leftJoin(users, eq(templates.ownerId, users.id))
      .where(eq(templates.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('模板不存在');
    }

    return this.toDto(rows[0] as TemplateWithOwner);
  }

  async updateVisibility(
    id: string,
    dto: UpdateTemplateVisibilityDto,
    operatorId: string,
    operatorLevel: string,
  ): Promise<Template> {
    if (!this.isGlobalAdmin(operatorLevel)) {
      throw new ForbiddenException('权限不足');
    }

    const existing = await this.db
      .select({ id: templates.id, name: templates.name })
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('模板不存在');
    }

    await this.db
      .update(templates)
      .set({
        visibility: dto.visibility,
        visibleGroupIds: dto.visibleGroupIds,
        visibleUserIds: dto.visibleUserIds,
      })
      .where(eq(templates.id, id));

    void this.auditService.log(
      operatorId,
      'update_template_visibility',
      `template:${id}`,
      `调整模板可见性: visibility=${dto.visibility}, groups=${dto.visibleGroupIds.length}, users=${dto.visibleUserIds.length}`,
    );

    return this.getDetail(id);
  }

  // ========== Public API methods ==========

  async listTemplates(userId: string): Promise<Template[]> {
    // 获取当前用户信息
    const userRows = await this.db
      .select({
        id: users.id,
        level: users.level,
        groupId: users.groupId,
        approved: users.approved,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRows.length === 0) {
      return [];
    }

    const currentUser = userRows[0];

    // 管理员能看到全部
    if (this.isGlobalAdmin(currentUser.level)) {
      const rows = await this.db
        .select({
          id: templates.id,
          name: templates.name,
          type: templates.type,
          icon: templates.icon,
          description: templates.description,
          htmlContent: templates.htmlContent,
          url: templates.url,
          visibility: templates.visibility,
          visibleUserIds: templates.visibleUserIds,
          visibleGroupIds: templates.visibleGroupIds,
          sortOrder: templates.sortOrder,
          ownerId: templates.ownerId,
          ownerNickname: users.nickname,
          createdAt: templates.createdAt,
          updatedAt: templates.updatedAt,
        })
        .from(templates)
        .leftJoin(users, eq(templates.ownerId, users.id))
        .orderBy(desc(templates.sortOrder), desc(templates.createdAt));

      return rows.map((row: TemplateWithOwner) => this.toDto(row));
    }

    // 普通用户：可见性条件下推到 SQL
    const visibilityConditions: SQL[] = [];

    if (!currentUser.approved) {
      // 未审核用户只能看到自己负责的模板
      visibilityConditions.push(eq(templates.ownerId, currentUser.id));
    } else {
      visibilityConditions.push(
        eq(templates.visibility, 'all'),
        eq(templates.ownerId, currentUser.id),
        sql`${currentUser.id} = ANY(${templates.visibleUserIds})`,
      );
      if (currentUser.groupId) {
        visibilityConditions.push(
          sql`${currentUser.groupId} = ANY(${templates.visibleGroupIds})`,
        );
      }
    }

    const rows = await this.db
      .select({
        id: templates.id,
        name: templates.name,
        type: templates.type,
        icon: templates.icon,
        description: templates.description,
        htmlContent: templates.htmlContent,
        url: templates.url,
        visibility: templates.visibility,
        visibleUserIds: templates.visibleUserIds,
        visibleGroupIds: templates.visibleGroupIds,
        sortOrder: templates.sortOrder,
        ownerId: templates.ownerId,
        ownerNickname: users.nickname,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .leftJoin(users, eq(templates.ownerId, users.id))
      .where(or(...visibilityConditions))
      .orderBy(desc(templates.sortOrder), desc(templates.createdAt));

    return rows.map((row: TemplateWithOwner) => this.toDto(row));
  }

  async getTemplate(id: string, userId: string): Promise<Template> {
    const rows = await this.db
      .select({
        id: templates.id,
        name: templates.name,
        type: templates.type,
        icon: templates.icon,
        description: templates.description,
        htmlContent: templates.htmlContent,
        url: templates.url,
        visibility: templates.visibility,
        visibleUserIds: templates.visibleUserIds,
        visibleGroupIds: templates.visibleGroupIds,
        sortOrder: templates.sortOrder,
        ownerId: templates.ownerId,
        ownerNickname: users.nickname,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .leftJoin(users, eq(templates.ownerId, users.id))
      .where(eq(templates.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('模板不存在');
    }

    const template = rows[0] as TemplateWithOwner;

    // 获取用户信息做权限校验
    const userRows = await this.db
      .select({
        id: users.id,
        level: users.level,
        groupId: users.groupId,
        approved: users.approved,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRows.length === 0) {
      throw new NotFoundException('模板不存在');
    }

    const currentUser = {
      id: userRows[0].id,
      level: userRows[0].level as UserLevel,
      groupId: userRows[0].groupId,
      approved: userRows[0].approved,
    };

    const canView = this.permissionService.canViewTemplate(currentUser, {
      id: template.id,
      visibility: template.visibility as VisibilityType,
      visibleUserIds: template.visibleUserIds,
      visibleGroupIds: template.visibleGroupIds,
      ownerId: template.ownerId,
    });

    if (!canView) {
      throw new NotFoundException('模板不存在');
    }

    return this.toDto(template);
  }

  private toDto(row: TemplateWithOwner): Template {
    return {
      id: row.id,
      name: row.name,
      type: row.type as TemplateType,
      icon: row.icon ?? undefined,
      description: row.description ?? undefined,
      htmlContent: row.htmlContent ?? undefined,
      url: row.url ?? undefined,
      visibility: row.visibility as VisibilityType,
      visibleUserIds: row.visibleUserIds ?? [],
      visibleGroupIds: row.visibleGroupIds ?? [],
      sortOrder: row.sortOrder,
      ownerId: row.ownerId ?? undefined,
      ownerName: row.ownerNickname ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
