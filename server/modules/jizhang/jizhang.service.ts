import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { appData, jizhangRecords, users } from '@server/database/schema';
import { AuditService } from '@server/common/audit/audit.service';
import { PermissionService } from '@server/common/permission/permission.service';
import { HistoryService } from '../history/history.service';
import { toUuidOrNull } from '@server/common/utils/uuid';
import { parseDateParam, parseRecordDate } from '@server/common/utils/date';
import type {
  AppData,
  JizhangCategorySummary,
  JizhangRecord,
  ListResponse,
  ScopeType,
  UserLevel,
} from '@shared/api.interface';
import type { CreateJizhangProjectDto } from './dto/create-project.dto';
import type { UpdateJizhangProjectDto } from './dto/update-project.dto';
import type { CreateJizhangRecordDto } from './dto/create-record.dto';
import type { UpdateJizhangRecordDto } from './dto/update-record.dto';

interface UserContext {
  userId: string;
  level: UserLevel;
}

// CSV 导出每批读取的记录数
const CSV_EXPORT_BATCH_SIZE = 500;

interface ProjectRow {
  id: string;
  app: string;
  title: string;
  content: Record<string, any>;
  ownerId: string | null;
  readScope: string;
  readUserIds: string[];
  editScope: string;
  editUserIds: string[];
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerNickname?: string | null;
  ownerGroupId?: string | null;
}

interface RecordRow {
  id: string;
  recordDate: string | Date;
  incomeExpense: string;
  category: string;
  amount: string | number;
  remark: string | null;
  recorderId: string | null;
  isDeleted: boolean;
  ownerId: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  recorderNickname?: string | null;
}

@Injectable()
export class JizhangService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
    private readonly historyService: HistoryService,
  ) {}

  // ========== 项目管理 ==========

  async getProjectList(
    user: UserContext,
    page: number,
    pageSize: number,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<ListResponse<AppData>> {
    const offset = (page - 1) * pageSize;
    const conditions = [eq(appData.app, 'jizhang')];

    // 全局管理员看到全部
    const isGlobalAdmin =
      user.level === 'super_admin' || user.level === 'level_1';

    if (!isGlobalAdmin) {
      const ownerCheck = eq(appData.ownerId, user.userId);

      if (!userApproved) {
        // 未审核用户只能看到自己的
        conditions.push(ownerCheck);
      } else {
        // app_data 无 groupId：group 范围按负责人所在分组判定
        const groupCheck = userGroupId
          ? and(
              eq(appData.readScope, 'group'),
              eq(users.groupId, userGroupId),
            )
          : undefined;

        conditions.push(
          or(
            ownerCheck,
            eq(appData.readScope, 'all'),
            and(
              eq(appData.readScope, 'users'),
              sql`${user.userId} = ANY(${appData.readUserIds})`,
            ),
            groupCheck,
          ),
        );
      }
    }

    const whereClause = and(...conditions);

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(appData)
        .leftJoin(users, eq(appData.ownerId, users.id))
        .where(whereClause),
      this.db
        .select({
          id: appData.id,
          app: appData.app,
          title: appData.title,
          content: appData.content,
          ownerId: appData.ownerId,
          readScope: appData.readScope,
          readUserIds: appData.readUserIds,
          editScope: appData.editScope,
          editUserIds: appData.editUserIds,
          parentId: appData.parentId,
          createdAt: appData.createdAt,
          updatedAt: appData.updatedAt,
          ownerNickname: users.nickname,
          ownerGroupId: users.groupId,
        })
        .from(appData)
        .leftJoin(users, eq(appData.ownerId, users.id))
        .where(whereClause)
        .orderBy(desc(appData.updatedAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row) => this.mapToAppData(row as ProjectRow)),
      total,
      page,
      pageSize,
    };
  }

  async getProjectDetail(
    user: UserContext,
    projectId: string,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<AppData> {
    const rows = await this.db
      .select({
        id: appData.id,
        app: appData.app,
        title: appData.title,
        content: appData.content,
        ownerId: appData.ownerId,
        readScope: appData.readScope,
        readUserIds: appData.readUserIds,
        editScope: appData.editScope,
        editUserIds: appData.editUserIds,
        parentId: appData.parentId,
        createdAt: appData.createdAt,
        updatedAt: appData.updatedAt,
        ownerNickname: users.nickname,
        ownerGroupId: users.groupId,
      })
      .from(appData)
      .leftJoin(users, eq(appData.ownerId, users.id))
      .where(and(eq(appData.id, projectId), eq(appData.app, 'jizhang')))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('项目不存在');
    }

    const project = rows[0] as ProjectRow;
    if (!this.canReadProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    return this.mapToAppData(project);
  }

  async createProject(
    user: UserContext,
    dto: CreateJizhangProjectDto,
  ): Promise<AppData> {
    const userContext = await this.getUserContext(user.userId);
    if (userContext && !userContext.approved) {
      throw new ForbiddenException('账号未通过审核，无法创建项目');
    }

    const inserted = await this.db
      .insert(appData)
      .values({
        app: 'jizhang',
        title: dto.title,
        content: {},
        ownerId: user.userId,
        readScope: dto.readScope,
        readUserIds: dto.readUserIds,
        editScope: dto.editScope,
        editUserIds: dto.editUserIds,
      })
      .returning();

    const project = inserted[0];

    await this.auditService.log(
      user.userId,
      'jizhang_project_create',
      project.id,
      `创建记账本项目: ${dto.title}`,
    );

    return this.mapToAppData({ ...project, ownerNickname: null });
  }

  async updateProject(
    user: UserContext,
    projectId: string,
    dto: UpdateJizhangProjectDto,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<AppData> {
    const project = await this.getProjectRaw(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (!this.canEditProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const patch: Partial<typeof appData.$inferInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.readScope !== undefined) patch.readScope = dto.readScope;
    if (dto.readUserIds !== undefined) patch.readUserIds = dto.readUserIds;
    if (dto.editScope !== undefined) patch.editScope = dto.editScope;
    if (dto.editUserIds !== undefined) patch.editUserIds = dto.editUserIds;

    // 没有任何待更新字段时直接返回当前记录
    if (Object.keys(patch).length === 0) {
      return this.mapToAppData(project);
    }

    patch.updatedAt = new Date();

    // 修改前保存历史快照
    await this.historyService.saveSnapshot({
      targetCollection: 'app_data',
      targetRecordId: project.id,
      targetTitle: project.title,
      projectId: project.id,
      snapshot: this.projectToSnapshot(project),
      action: 'update',
      operatorId: user.userId,
    });

    const updated = await this.db
      .update(appData)
      .set(patch)
      .where(eq(appData.id, projectId))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('项目不存在');
    }

    await this.auditService.log(
      user.userId,
      'jizhang_project_update',
      projectId,
      `更新记账本项目: ${dto.title ?? project.title}`,
    );

    const refreshed = await this.getProjectRaw(projectId);
    if (!refreshed) {
      throw new NotFoundException('项目不存在');
    }

    return this.mapToAppData(refreshed);
  }

  async deleteProject(
    user: UserContext,
    projectId: string,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<void> {
    const project = await this.getProjectRaw(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (!this.canEditProject(user, project, userGroupId, userApproved)) {
      // 负责人也可以删除
      if (project.ownerId !== user.userId) {
        throw new NotFoundException('项目不存在');
      }
    }

    // 删除前保存历史快照
    await this.historyService.saveSnapshot({
      targetCollection: 'app_data',
      targetRecordId: project.id,
      targetTitle: project.title,
      projectId: project.id,
      snapshot: this.projectToSnapshot(project),
      action: 'delete',
      operatorId: user.userId,
    });

    await this.db.delete(appData).where(eq(appData.id, projectId));

    await this.auditService.log(
      user.userId,
      'jizhang_project_delete',
      projectId,
      `删除记账本项目: ${project.title}`,
    );
  }

  // ========== 记账记录管理 ==========

  async getRecordList(
    user: UserContext,
    projectId: string,
    params: {
      page: number;
      pageSize: number;
      category?: string;
      incomeExpense?: 'income' | 'expense';
      dateFrom?: string;
      dateTo?: string;
      includeDeleted?: boolean;
      onlyDeleted?: boolean;
    },
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<ListResponse<JizhangRecord>> {
    // 先校验项目可读权限
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canReadProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const {
      page,
      pageSize,
      category,
      incomeExpense,
      dateFrom,
      dateTo,
      includeDeleted,
      onlyDeleted,
    } = params;
    const offset = (page - 1) * pageSize;

    const dateFromValue = dateFrom
      ? this.toRecordDateParam(dateFrom, '开始日期格式不正确')
      : undefined;
    const dateToValue = dateTo
      ? this.toRecordDateParam(dateTo, '结束日期格式不正确')
      : undefined;

    const conditions = [eq(jizhangRecords.projectId, projectId)];

    if (onlyDeleted) {
      conditions.push(eq(jizhangRecords.isDeleted, true));
    } else if (!includeDeleted) {
      conditions.push(eq(jizhangRecords.isDeleted, false));
    }

    if (category) {
      conditions.push(eq(jizhangRecords.category, category));
    }

    if (incomeExpense) {
      conditions.push(eq(jizhangRecords.incomeExpense, incomeExpense));
    }

    if (dateFromValue) {
      conditions.push(gte(jizhangRecords.recordDate, dateFromValue));
    }

    if (dateToValue) {
      conditions.push(lte(jizhangRecords.recordDate, dateToValue));
    }

    const whereClause = and(...conditions);

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(jizhangRecords)
        .where(whereClause),
      this.db
        .select({
          id: jizhangRecords.id,
          recordDate: jizhangRecords.recordDate,
          incomeExpense: jizhangRecords.incomeExpense,
          category: jizhangRecords.category,
          amount: jizhangRecords.amount,
          remark: jizhangRecords.remark,
          recorderId: jizhangRecords.recorderId,
          isDeleted: jizhangRecords.isDeleted,
          ownerId: jizhangRecords.ownerId,
          projectId: jizhangRecords.projectId,
          createdAt: jizhangRecords.createdAt,
          updatedAt: jizhangRecords.updatedAt,
          recorderNickname: users.nickname,
        })
        .from(jizhangRecords)
        .leftJoin(users, eq(jizhangRecords.recorderId, users.id))
        .where(whereClause)
        .orderBy(desc(jizhangRecords.recordDate), desc(jizhangRecords.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row) => this.mapToJizhangRecord(row as RecordRow)),
      total,
      page,
      pageSize,
    };
  }

  async getRecycleList(
    user: UserContext,
    projectId: string,
    page: number,
    pageSize: number,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<ListResponse<JizhangRecord>> {
    return this.getRecordList(
      user,
      projectId,
      { page, pageSize, onlyDeleted: true },
      userGroupId,
      userApproved,
    );
  }

  async getRecordDetail(
    user: UserContext,
    projectId: string,
    recordId: string,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<JizhangRecord> {
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canReadProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const rows = await this.db
      .select({
        id: jizhangRecords.id,
        recordDate: jizhangRecords.recordDate,
        incomeExpense: jizhangRecords.incomeExpense,
        category: jizhangRecords.category,
        amount: jizhangRecords.amount,
        remark: jizhangRecords.remark,
        recorderId: jizhangRecords.recorderId,
        isDeleted: jizhangRecords.isDeleted,
        ownerId: jizhangRecords.ownerId,
        projectId: jizhangRecords.projectId,
        createdAt: jizhangRecords.createdAt,
        updatedAt: jizhangRecords.updatedAt,
        recorderNickname: users.nickname,
      })
      .from(jizhangRecords)
      .leftJoin(users, eq(jizhangRecords.recorderId, users.id))
      .where(
        and(
          eq(jizhangRecords.id, recordId),
          eq(jizhangRecords.projectId, projectId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('记录不存在');
    }

    return this.mapToJizhangRecord(rows[0] as RecordRow);
  }

  async createRecord(
    user: UserContext,
    projectId: string,
    dto: CreateJizhangRecordDto,
    userGroupId: string | null,
    userApproved: boolean,
    options?: { recorderIdOverride?: string | null },
  ): Promise<JizhangRecord> {
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canEditProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const inserted = await this.db
      .insert(jizhangRecords)
      .values({
        recordDate: parseRecordDate(dto.recordDate, '日期格式应为 YYYY-MM-DD'),
        incomeExpense: dto.incomeExpense,
        category: dto.category,
        amount: dto.amount,
        remark: dto.remark,
        recorderId:
          options && 'recorderIdOverride' in options
            ? toUuidOrNull(options.recorderIdOverride)
            : toUuidOrNull(user.userId),
        ownerId: project.ownerId ?? undefined,
        projectId,
      })
      .returning();

    const record = inserted[0];

    await this.auditService.log(
      user.userId,
      'jizhang_record_create',
      record.id,
      `新增记账记录: ${dto.category} ${dto.amount}`,
    );

    return this.mapToJizhangRecord({ ...record, recorderNickname: null });
  }

  async updateRecord(
    user: UserContext,
    projectId: string,
    recordId: string,
    dto: UpdateJizhangRecordDto,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<JizhangRecord> {
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canEditProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const recordRows = await this.db
      .select()
      .from(jizhangRecords)
      .where(
        and(
          eq(jizhangRecords.id, recordId),
          eq(jizhangRecords.projectId, projectId),
          eq(jizhangRecords.isDeleted, false),
        ),
      )
      .limit(1);

    if (recordRows.length === 0) {
      throw new NotFoundException('记录不存在');
    }

    const oldRecord = recordRows[0];

    const patch: Partial<typeof jizhangRecords.$inferInsert> = {};
    if (dto.recordDate !== undefined) {
      patch.recordDate = parseRecordDate(dto.recordDate, '日期格式应为 YYYY-MM-DD');
    }
    if (dto.incomeExpense !== undefined) patch.incomeExpense = dto.incomeExpense;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.amount !== undefined) patch.amount = dto.amount;
    if (dto.remark !== undefined) patch.remark = dto.remark;

    // 没有任何待更新字段时直接返回当前记录
    if (Object.keys(patch).length === 0) {
      return this.mapToJizhangRecord({ ...oldRecord, recorderNickname: null });
    }

    patch.updatedAt = new Date();

    // 修改前保存历史快照
    await this.historyService.saveSnapshot({
      targetCollection: 'jizhang_records',
      targetRecordId: oldRecord.id,
      targetTitle: oldRecord.category,
      projectId,
      snapshot: this.recordToSnapshot(oldRecord),
      action: 'update',
      operatorId: user.userId,
    });

    const updated = await this.db
      .update(jizhangRecords)
      .set(patch)
      .where(
        and(
          eq(jizhangRecords.id, recordId),
          eq(jizhangRecords.isDeleted, false),
        ),
      )
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('记录不存在');
    }

    await this.auditService.log(
      user.userId,
      'jizhang_record_update',
      recordId,
      `更新记账记录: ${dto.category ?? oldRecord.category}`,
    );

    return this.mapToJizhangRecord({ ...updated[0], recorderNickname: null });
  }

  async deleteRecord(
    user: UserContext,
    projectId: string,
    recordId: string,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<void> {
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canEditProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const recordRows = await this.db
      .select()
      .from(jizhangRecords)
      .where(
        and(
          eq(jizhangRecords.id, recordId),
          eq(jizhangRecords.projectId, projectId),
        ),
      )
      .limit(1);

    if (recordRows.length === 0) {
      throw new NotFoundException('记录不存在');
    }

    const oldRecord = recordRows[0];

    // 删除前保存历史快照
    await this.historyService.saveSnapshot({
      targetCollection: 'jizhang_records',
      targetRecordId: oldRecord.id,
      targetTitle: oldRecord.category,
      projectId,
      snapshot: this.recordToSnapshot(oldRecord),
      action: 'delete',
      operatorId: user.userId,
    });

    await this.db
      .update(jizhangRecords)
      .set({ isDeleted: true })
      .where(eq(jizhangRecords.id, recordId));

    await this.auditService.log(
      user.userId,
      'jizhang_record_delete',
      recordId,
      `删除记账记录: ${oldRecord.category} ${oldRecord.amount}`,
    );
  }

  async restoreRecord(
    user: UserContext,
    projectId: string,
    recordId: string,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<void> {
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canEditProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const recordRows = await this.db
      .select()
      .from(jizhangRecords)
      .where(
        and(
          eq(jizhangRecords.id, recordId),
          eq(jizhangRecords.projectId, projectId),
        ),
      )
      .limit(1);

    if (recordRows.length === 0) {
      throw new NotFoundException('记录不存在');
    }

    const oldRecord = recordRows[0];

    // 恢复前保存当前版本快照
    await this.historyService.saveSnapshot({
      targetCollection: 'jizhang_records',
      targetRecordId: oldRecord.id,
      targetTitle: oldRecord.category,
      projectId,
      snapshot: this.recordToSnapshot(oldRecord),
      action: 'update',
      operatorId: user.userId,
    });

    await this.db
      .update(jizhangRecords)
      .set({ isDeleted: false })
      .where(eq(jizhangRecords.id, recordId));

    // 恢复操作也记一条 restore 历史
    const restoredRecord = { ...oldRecord, isDeleted: false };
    await this.historyService.saveSnapshot({
      targetCollection: 'jizhang_records',
      targetRecordId: oldRecord.id,
      targetTitle: oldRecord.category,
      projectId,
      snapshot: this.recordToSnapshot(restoredRecord),
      action: 'restore',
      operatorId: user.userId,
    });

    await this.auditService.log(
      user.userId,
      'jizhang_record_restore',
      recordId,
      `恢复记账记录: ${oldRecord.category}`,
    );
  }

  async getCategorySummary(
    user: UserContext,
    projectId: string,
    params: {
      dateFrom?: string;
      dateTo?: string;
      incomeExpense?: 'income' | 'expense';
    },
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<JizhangCategorySummary[]> {
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canReadProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const { dateFrom, dateTo, incomeExpense } = params;

    const dateFromValue = dateFrom
      ? this.toRecordDateParam(dateFrom, '开始日期格式不正确')
      : undefined;
    const dateToValue = dateTo
      ? this.toRecordDateParam(dateTo, '结束日期格式不正确')
      : undefined;

    const conditions = [
      eq(jizhangRecords.projectId, projectId),
      eq(jizhangRecords.isDeleted, false),
    ];

    if (incomeExpense) {
      conditions.push(eq(jizhangRecords.incomeExpense, incomeExpense));
    }

    if (dateFromValue) {
      conditions.push(gte(jizhangRecords.recordDate, dateFromValue));
    }

    if (dateToValue) {
      conditions.push(lte(jizhangRecords.recordDate, dateToValue));
    }

    const whereClause = and(...conditions);

    const results = await this.db
      .select({
        category: jizhangRecords.category,
        totalAmount: sql<string>`SUM(${jizhangRecords.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(jizhangRecords)
      .where(whereClause)
      .groupBy(jizhangRecords.category)
      .orderBy(jizhangRecords.category);

    return results.map((row: { category: string; totalAmount: string; count: number }) => ({
      category: row.category,
      totalAmount: row.totalAmount,
      count: Number(row.count),
    }));
  }

  async exportCsv(
    user: UserContext,
    projectId: string,
    userGroupId: string | null,
    userApproved: boolean,
  ): Promise<string> {
    const project = await this.getProjectRaw(projectId);
    if (!project || !this.canReadProject(user, project, userGroupId, userApproved)) {
      throw new NotFoundException('项目不存在');
    }

    const header = '日期,类型,分类,金额,备注';
    const csvLines: string[] = [header];

    // 游标分批查询（record_date + id 降序），避免一次性把整表读入内存
    let lastRecordDate: string | null = null;
    let lastId: string | null = null;

    for (;;) {
      const conditions: SQL[] = [
        eq(jizhangRecords.projectId, projectId),
        eq(jizhangRecords.isDeleted, false),
      ];

      if (lastRecordDate !== null && lastId !== null) {
        conditions.push(
          sql`(${jizhangRecords.recordDate}, ${jizhangRecords.id}) < (${lastRecordDate}::date, ${lastId}::uuid)`,
        );
      }

      const batch = await this.db
        .select({
          id: jizhangRecords.id,
          recordDate: jizhangRecords.recordDate,
          incomeExpense: jizhangRecords.incomeExpense,
          category: jizhangRecords.category,
          amount: jizhangRecords.amount,
          remark: jizhangRecords.remark,
        })
        .from(jizhangRecords)
        .where(and(...conditions))
        .orderBy(desc(jizhangRecords.recordDate), desc(jizhangRecords.id))
        .limit(CSV_EXPORT_BATCH_SIZE);

      for (const row of batch) {
        const dateValue: string = String(row.recordDate);
        const typeValue: string = row.incomeExpense === 'income' ? '收入' : '支出';
        const category: string = this.escapeCsv(row.category);
        const amount: string = String(row.amount);
        const remark: string = this.escapeCsv(row.remark ?? '');
        csvLines.push(`${dateValue},${typeValue},${category},${amount},${remark}`);
      }

      if (batch.length < CSV_EXPORT_BATCH_SIZE) {
        break;
      }

      // 游标推进到最后一行，保证循环必然结束
      const lastRow = batch[batch.length - 1];
      lastRecordDate = String(lastRow.recordDate);
      lastId = lastRow.id;
    }

    // UTF-8 BOM + CSV 内容
    const BOM = '\uFEFF';
    return BOM + csvLines.join('\n');
  }

  // ========== 辅助方法 ==========

  private async getProjectRaw(projectId: string): Promise<ProjectRow | null> {
    const rows = await this.db
      .select({ project: appData, ownerGroupId: users.groupId })
      .from(appData)
      .leftJoin(users, eq(appData.ownerId, users.id))
      .where(and(eq(appData.id, projectId), eq(appData.app, 'jizhang')))
      .limit(1);

    if (rows.length === 0) return null;

    return {
      ...rows[0].project,
      ownerGroupId: rows[0].ownerGroupId ?? null,
    };
  }

  // recordDate 是 date 列，按 YYYY-MM-DD 传入；非法值在此抛 400
  private toRecordDateParam(value: string, message: string): string {
    const date = parseDateParam(value, message);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    return date.toISOString().slice(0, 10);
  }

  private isSameGroup(
    userGroupId: string | null,
    ownerGroupId?: string | null,
  ): boolean {
    return !!userGroupId && !!ownerGroupId && userGroupId === ownerGroupId;
  }

  private canReadProject(
    user: UserContext,
    project: ProjectRow,
    userGroupId: string | null,
    userApproved: boolean,
  ): boolean {
    // 全局管理员总能看到
    if (user.level === 'super_admin' || user.level === 'level_1') return true;
    // 负责人能看到
    if (project.ownerId === user.userId) return true;
    // 未审核用户只能看自己的
    if (!userApproved) return false;

    switch (project.readScope as ScopeType) {
      case 'all':
        return true;
      case 'users':
        return project.readUserIds.includes(user.userId);
      case 'group':
        // app_data 无 groupId：按负责人所在分组判定
        return this.isSameGroup(userGroupId, project.ownerGroupId);
      case 'owner':
        return false;
      default:
        return false;
    }
  }

  private canEditProject(
    user: UserContext,
    project: ProjectRow,
    userGroupId: string | null,
    userApproved: boolean,
  ): boolean {
    // 全局管理员绕过编辑范围限制
    if (user.level === 'super_admin' || user.level === 'level_1') return true;
    // 先判断能不能读
    if (!this.canReadProject(user, project, userGroupId, userApproved)) return false;
    // 负责人能编辑
    if (project.ownerId === user.userId) return true;

    switch (project.editScope as ScopeType) {
      case 'all':
        return true;
      case 'users':
        return project.editUserIds.includes(user.userId);
      case 'group':
        return this.isSameGroup(userGroupId, project.ownerGroupId);
      case 'owner':
        return false;
      default:
        return false;
    }
  }

  private projectToSnapshot(project: ProjectRow): Record<string, any> {
    return {
      id: project.id,
      app: project.app,
      title: project.title,
      content: project.content,
      ownerId: project.ownerId,
      readScope: project.readScope,
      readUserIds: project.readUserIds,
      editScope: project.editScope,
      editUserIds: project.editUserIds,
      parentId: project.parentId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  private recordToSnapshot(
    record: typeof jizhangRecords.$inferSelect,
  ): Record<string, any> {
    return {
      id: record.id,
      recordDate: String(record.recordDate),
      incomeExpense: record.incomeExpense,
      category: record.category,
      amount: String(record.amount),
      remark: record.remark,
      recorderId: record.recorderId,
      isDeleted: record.isDeleted,
      ownerId: record.ownerId,
      projectId: record.projectId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private mapToAppData(row: ProjectRow): AppData {
    return {
      id: row.id,
      app: row.app,
      title: row.title,
      content: row.content as Record<string, any>,
      ownerId: row.ownerId ?? undefined,
      ownerName: row.ownerNickname ?? undefined,
      readScope: row.readScope as ScopeType,
      readUserIds: row.readUserIds,
      editScope: row.editScope as ScopeType,
      editUserIds: row.editUserIds,
      parentId: row.parentId ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapToJizhangRecord(row: RecordRow): JizhangRecord {
    return {
      id: row.id,
      recordDate: String(row.recordDate),
      incomeExpense: row.incomeExpense as 'income' | 'expense',
      category: row.category,
      amount: String(row.amount),
      remark: row.remark ?? undefined,
      recorderId: row.recorderId ?? undefined,
      recorderName: row.recorderNickname ?? undefined,
      isDeleted: row.isDeleted,
      ownerId: row.ownerId ?? undefined,
      projectId: row.projectId ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private escapeCsv(value: string): string {
    // 中和 CSV 公式注入：首字符命中 = + - @ 或制表 / 回车时前置单引号
    const neutralized = /^[=+@\t\r-]/.test(value) ? `'${value}` : value;
    if (
      neutralized.includes(',') ||
      neutralized.includes('"') ||
      neutralized.includes('\n')
    ) {
      return `"${neutralized.replace(/"/g, '""')}"`;
    }
    return neutralized;
  }

  // 获取用户的完整信息（level + groupId + approved）
  async getUserContext(userId: string): Promise<{
    userId: string;
    level: UserLevel;
    groupId: string | null;
    approved: boolean;
  } | null> {
    const rows = await this.db
      .select({
        id: users.id,
        level: users.level,
        groupId: users.groupId,
        approved: users.approved,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) return null;

    return {
      userId: rows[0].id,
      level: rows[0].level as UserLevel,
      groupId: rows[0].groupId,
      approved: rows[0].approved,
    };
  }
}
