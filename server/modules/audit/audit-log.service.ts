import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { auditLogs, users } from '@server/database/schema';
import { parseDateParam } from '@server/common/utils/date';
import type { AuditLog, ListResponse } from '@shared/api.interface';

interface AuditLogWithOperator {
  id: string;
  operatorId: string | null;
  operatorNickname: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  createdAt: Date;
}

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getList(params: {
    page: number;
    pageSize: number;
    operatorId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ListResponse<AuditLog>> {
    const { page, pageSize, operatorId, action, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (operatorId) {
      conditions.push(eq(auditLogs.operatorId, operatorId));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (startDate) {
      conditions.push(
        gte(auditLogs.createdAt, parseDateParam(startDate, '开始日期格式不正确')),
      );
    }

    if (endDate) {
      const end = parseDateParam(endDate, '结束日期格式不正确');
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(auditLogs)
        .where(whereClause),
      this.db
        .select({
          id: auditLogs.id,
          operatorId: auditLogs.operatorId,
          operatorNickname: users.nickname,
          action: auditLogs.action,
          target: auditLogs.target,
          detail: auditLogs.detail,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.operatorId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: AuditLogWithOperator) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  private toDto(row: AuditLogWithOperator): AuditLog {
    return {
      id: row.id,
      operatorId: row.operatorId ?? undefined,
      operatorName: row.operatorNickname ?? undefined,
      action: row.action,
      target: row.target ?? undefined,
      detail: row.detail ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
