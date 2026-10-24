import { Module } from '@nestjs/common';

import { AuditService } from './audit/audit.service';
import { PermissionService } from './permission/permission.service';

@Module({
  providers: [AuditService, PermissionService],
  exports: [AuditService, PermissionService],
})
export class CommonModule {}
