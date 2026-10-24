import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { AuditLogService } from './audit-log.service';
import { RequireLevel } from '@server/common/decorators/require-level.decorator';
import { parsePagination } from '@server/common/utils/pagination';
import type { AuditLog, ListResponse, UserLevel } from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/admin/audit-logs')
@RequireLevel('super_admin', 'level_1', 'level_2')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getList(
    @Req() req: Request & { user: AuthUser },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('operatorId') operatorId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ListResponse<AuditLog>> {
    const { page: pageNum, pageSize: pageSizeNum } = parsePagination(
      page,
      pageSize,
    );
    // level_2 只能看自己的操作日志
    const effectiveOperatorId =
      req.user.level === 'level_2' ? req.user.userId : operatorId;
    return this.auditLogService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      operatorId: effectiveOperatorId,
      action,
      startDate,
      endDate,
    });
  }
}
