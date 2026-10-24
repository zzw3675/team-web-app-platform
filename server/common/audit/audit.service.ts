import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { auditLogs } from '@server/database/schema';
import { toUuidOrNull } from '@server/common/utils/uuid';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async log(
    operatorId: string,
    action: string,
    target?: string,
    detail?: string,
  ): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        operatorId: toUuidOrNull(operatorId),
        action,
        target,
        detail,
      });
    } catch (error) {
      this.logger.error('写入审计日志失败', error);
      // 审计日志失败不影响主流程
    }
  }
}
