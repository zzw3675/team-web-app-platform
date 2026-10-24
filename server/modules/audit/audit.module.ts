import { Module } from '@nestjs/common';

import { AuditController } from './audit.controller';
import { AuditLogService } from './audit-log.service';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AuditController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
