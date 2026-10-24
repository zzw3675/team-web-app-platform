import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import {
  history,
  jizhangRecords,
  appData,
  pages,
} from '@server/database/schema';
import type { HistoryRecord, ListResponse } from '@shared/api.interface';
import { toUuidOrNull } from '@server/common/utils/uuid';

interface SaveSnapshotParams {
  targetCollection: string;
  targetRecordId: string;
  targetTitle?: string;
  projectId?: string;
  snapshot: Record<string, any>;
  action: 'update' | 'delete' | 'restore';
  operatorId: string | null;
}

const MAX_VERSIONS_PER_RECORD = 50;
const HISTORY_RETENTION_DAYS = 180;

const SYSTEM_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', '_created_at', '_updated_at']);

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async saveSnapshot(params: SaveSnapshotParams): Promise<void> {
    const {
      targetCollection,
      targetRecordId,
      targetTitle,
      projectId,
      snapshot,
      action,
      operatorId,
    } = params;

    await this.db.insert(history).values({
      targetCollection,
      targetRecordId,
      targetTitle: targetTitle ?? undefined,
      projectId: projectId ?? undefined,
      snapshot,
      action,
      operatorId: toUuidOrNull(operatorId),
    });

    // 保留最近 50 条版本
    await this.pruneOldVersions(targetCollection, targetRecordId);

    // 清理项目下超过 180 天的历史记录
    if (projectId) {
      await this.cleanupExpiredByProject(projectId);
    }
  }

  async getHistory(
    targetCollection: string,
    targetRecordId: string,
  ): Promise<HistoryRecord[]> {
    const rows = await this.db
      .select()
      .from(history)
      .where(
        and(
          eq(history.targetCollection, targetCollection),
          eq(history.targetRecordId, targetRecordId),
        ),
      )
      .orderBy(desc(history.createdAt));

    return rows.map((row: typeof history.$inferSelect) =>
      this.mapToHistoryRecord(row),
    );
  }

  async getProjectHistory(
    projectId: string,
    page: number,
    pageSize: number,
  ): Promise<ListResponse<HistoryRecord>> {
    const offset = (page - 1) * pageSize;

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(history)
        .where(eq(history.projectId, projectId)),
      this.db
        .select()
        .from(history)
        .where(eq(history.projectId, projectId))
        .orderBy(desc(history.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: typeof history.$inferSelect) =>
        this.mapToHistoryRecord(row),
      ),
      total,
      page,
      pageSize,
    };
  }

  async restore(historyId: string, operatorId: string): Promise<void> {
    // 读取历史快照
    const historyRows = await this.db
      .select()
      .from(history)
      .where(eq(history.id, historyId))
      .limit(1);

    if (historyRows.length === 0) {
      throw new NotFoundException('历史记录不存在');
    }

    const historyRow = historyRows[0];
    const { targetCollection, targetRecordId, snapshot } = historyRow;

    // 根据 targetCollection 找到目标记录并保存当前版本快照
    let currentSnapshot: Record<string, any> | null = null;
    let targetTitle = historyRow.targetTitle ?? undefined;

    switch (targetCollection) {
      case 'jizhang_records': {
        const records = await this.db
          .select()
          .from(jizhangRecords)
          .where(eq(jizhangRecords.id, targetRecordId))
          .limit(1);
        if (records.length === 0) {
          throw new NotFoundException('记账记录不存在');
        }
        currentSnapshot = this.recordToSnapshot(records[0]);
        targetTitle = records[0].category;
        break;
      }
      case 'app_data': {
        const records = await this.db
          .select()
          .from(appData)
          .where(eq(appData.id, targetRecordId))
          .limit(1);
        if (records.length === 0) {
          throw new NotFoundException('项目不存在');
        }
        currentSnapshot = this.appDataToSnapshot(records[0]);
        targetTitle = records[0].title;
        break;
      }
      case 'pages': {
        const records = await this.db
          .select()
          .from(pages)
          .where(eq(pages.id, targetRecordId))
          .limit(1);
        if (records.length === 0) {
          throw new NotFoundException('页面不存在');
        }
        currentSnapshot = this.pageToSnapshot(records[0]);
        targetTitle = records[0].title;
        break;
      }
      default:
        throw new BadRequestException(
          `不支持的 targetCollection: ${targetCollection}`,
        );
    }

    // 恢复前保存当前版本快照（action='update'）
    if (currentSnapshot) {
      await this.saveSnapshot({
        targetCollection,
        targetRecordId,
        targetTitle,
        projectId: historyRow.projectId ?? undefined,
        snapshot: currentSnapshot,
        action: 'update',
        operatorId,
      });
    }

    // 用快照内容更新目标记录（只恢复业务字段）
    const businessSnapshot = this.filterBusinessFields(snapshot);

    switch (targetCollection) {
      case 'jizhang_records':
        await this.db
          .update(jizhangRecords)
          .set(this.snapshotToJizhangRecordUpdate(businessSnapshot))
          .where(eq(jizhangRecords.id, targetRecordId));
        break;
      case 'app_data':
        await this.db
          .update(appData)
          .set(this.snapshotToAppDataUpdate(businessSnapshot))
          .where(eq(appData.id, targetRecordId));
        break;
      case 'pages': {
        const pagePatch = this.snapshotToPageUpdate(businessSnapshot);

        if (pagePatch.slug !== undefined) {
          const slugOwner = await this.db
            .select({ id: pages.id })
            .from(pages)
            .where(
              and(eq(pages.slug, pagePatch.slug), ne(pages.id, targetRecordId)),
            )
            .limit(1);
          if (slugOwner.length > 0) {
            delete pagePatch.slug;
          }
        }

        const updated = await this.db
          .update(pages)
          .set(pagePatch)
          .where(eq(pages.id, targetRecordId))
          .returning({ id: pages.id });
        if (updated.length === 0) {
          throw new NotFoundException('页面不存在');
        }
        break;
      }
    }

    // 插入一条 action='restore' 的历史记录
    await this.saveSnapshot({
      targetCollection,
      targetRecordId,
      targetTitle,
      projectId: historyRow.projectId ?? undefined,
      snapshot: businessSnapshot,
      action: 'restore',
      operatorId,
    });
  }

  private async pruneOldVersions(
    targetCollection: string,
    targetRecordId: string,
  ): Promise<void> {
    // 单条删除：超出保留条数的记录由子查询选出，避免先查后删
    await this.db.delete(history).where(
      and(
        eq(history.targetCollection, targetCollection),
        eq(history.targetRecordId, targetRecordId),
        sql`${history.id} IN (
          SELECT h.id FROM history AS h
          WHERE h.target_collection = ${targetCollection}
            AND h.target_record_id = ${targetRecordId}
          ORDER BY h._created_at DESC
          OFFSET ${MAX_VERSIONS_PER_RECORD}
        )`,
      ),
    );
  }

  private async cleanupExpiredByProject(projectId: string): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HISTORY_RETENTION_DAYS);
    const cutoffIso = cutoffDate.toISOString();

    await this.db
      .delete(history)
      .where(
        and(
          eq(history.projectId, projectId),
          lte(history.createdAt, sql`${cutoffIso}::timestamptz`),
        ),
      );
  }

  private recordToSnapshot(
    record: typeof jizhangRecords.$inferSelect,
  ): Record<string, any> {
    return {
      id: record.id,
      recordDate: record.recordDate,
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

  private appDataToSnapshot(
    record: typeof appData.$inferSelect,
  ): Record<string, any> {
    return {
      id: record.id,
      app: record.app,
      title: record.title,
      content: record.content,
      ownerId: record.ownerId,
      readScope: record.readScope,
      readUserIds: record.readUserIds,
      editScope: record.editScope,
      editUserIds: record.editUserIds,
      parentId: record.parentId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private pageToSnapshot(
    record: typeof pages.$inferSelect,
  ): Record<string, any> {
    return {
      id: record.id,
      title: record.title,
      slug: record.slug,
      icon: record.icon,
      type: record.type,
      url: record.url,
      htmlContent: record.htmlContent,
      visibility: record.visibility,
      visibleUserIds: record.visibleUserIds,
      sortOrder: record.sortOrder,
      enabled: record.enabled,
      groupId: record.groupId,
      ownerId: record.ownerId,
      isDeleted: record.isDeleted,
      appMode: record.appMode,
      templateId: record.templateId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private filterBusinessFields(
    snapshot: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(snapshot)) {
      if (!SYSTEM_FIELDS.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  private snapshotToJizhangRecordUpdate(
    snapshot: Record<string, any>,
  ): Partial<typeof jizhangRecords.$inferInsert> {
    const patch: Partial<typeof jizhangRecords.$inferInsert> = {};
    if (snapshot.recordDate !== undefined) patch.recordDate = snapshot.recordDate;
    if (snapshot.incomeExpense !== undefined)
      patch.incomeExpense = snapshot.incomeExpense;
    if (snapshot.category !== undefined) patch.category = snapshot.category;
    if (snapshot.amount !== undefined) patch.amount = snapshot.amount;
    if (snapshot.remark !== undefined) patch.remark = snapshot.remark ?? null;
    if (snapshot.recorderId !== undefined)
      patch.recorderId = snapshot.recorderId ?? null;
    if (snapshot.isDeleted !== undefined) patch.isDeleted = snapshot.isDeleted;
    if (snapshot.ownerId !== undefined) patch.ownerId = snapshot.ownerId ?? null;
    if (snapshot.projectId !== undefined)
      patch.projectId = snapshot.projectId ?? null;
    return patch;
  }

  private snapshotToAppDataUpdate(
    snapshot: Record<string, any>,
  ): Partial<typeof appData.$inferInsert> {
    const patch: Partial<typeof appData.$inferInsert> = {};
    if (snapshot.app !== undefined) patch.app = snapshot.app;
    if (snapshot.title !== undefined) patch.title = snapshot.title;
    if (snapshot.content !== undefined) patch.content = snapshot.content;
    if (snapshot.ownerId !== undefined) patch.ownerId = snapshot.ownerId ?? null;
    if (snapshot.readScope !== undefined)
      patch.readScope = snapshot.readScope;
    if (snapshot.readUserIds !== undefined)
      patch.readUserIds = snapshot.readUserIds ?? [];
    if (snapshot.editScope !== undefined)
      patch.editScope = snapshot.editScope;
    if (snapshot.editUserIds !== undefined)
      patch.editUserIds = snapshot.editUserIds ?? [];
    if (snapshot.parentId !== undefined)
      patch.parentId = snapshot.parentId ?? null;
    return patch;
  }

  private snapshotToPageUpdate(
    snapshot: Record<string, any>,
  ): Partial<typeof pages.$inferInsert> {
    const patch: Partial<typeof pages.$inferInsert> = {};
    if (snapshot.title !== undefined) patch.title = snapshot.title;
    if (snapshot.slug !== undefined) patch.slug = snapshot.slug;
    if (snapshot.icon !== undefined) patch.icon = snapshot.icon ?? null;
    if (snapshot.type !== undefined) patch.type = snapshot.type;
    if (snapshot.url !== undefined) patch.url = snapshot.url ?? null;
    if (snapshot.htmlContent !== undefined)
      patch.htmlContent = snapshot.htmlContent ?? null;
    if (snapshot.visibility !== undefined)
      patch.visibility = snapshot.visibility;
    if (snapshot.visibleUserIds !== undefined)
      patch.visibleUserIds = snapshot.visibleUserIds ?? [];
    if (snapshot.sortOrder !== undefined) patch.sortOrder = snapshot.sortOrder;
    if (snapshot.enabled !== undefined) patch.enabled = snapshot.enabled;
    if (snapshot.groupId !== undefined) patch.groupId = snapshot.groupId ?? null;
    if (snapshot.ownerId !== undefined) patch.ownerId = snapshot.ownerId ?? null;
    if (snapshot.isDeleted !== undefined) patch.isDeleted = snapshot.isDeleted;
    if (snapshot.appMode !== undefined) patch.appMode = snapshot.appMode;
    if (snapshot.templateId !== undefined)
      patch.templateId = snapshot.templateId ?? null;
    return patch;
  }

  private mapToHistoryRecord(
    row: typeof history.$inferSelect,
  ): HistoryRecord {
    return {
      id: row.id,
      targetCollection: row.targetCollection,
      targetRecordId: row.targetRecordId,
      targetTitle: row.targetTitle ?? undefined,
      projectId: row.projectId ?? undefined,
      snapshot: row.snapshot as Record<string, any>,
      action: row.action as 'update' | 'delete' | 'restore',
      operatorId: row.operatorId ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
