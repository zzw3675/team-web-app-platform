import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';

import { JizhangService } from './jizhang.service';
import { CreateJizhangRecordDto } from './dto/create-record.dto';
import { UpdateJizhangRecordDto } from './dto/update-record.dto';
import { parsePagination } from '@server/common/utils/pagination';
import { Public } from '@server/common/decorators/public.decorator';
import type {
  AppData,
  JizhangCategorySummary,
  JizhangRecord,
  ListResponse,
  UserLevel,
} from '@shared/api.interface';

const SYSTEM_USER = { userId: 'openapi-system', level: 'super_admin' as UserLevel };
const SYSTEM_GROUP_ID: string | null = null;
const SYSTEM_APPROVED = true;

export class OpenApiCreateRecordDto extends CreateJizhangRecordDto {
  @IsOptional()
  @IsUUID('4', { message: '记录人ID格式不正确' })
  recorderId?: string | null;
}

// 访问边界说明：本控制器的访问边界由平台网关 API Key 控制，代码内不再做用户级鉴权。
// 读写接口保留，路径与响应结构保持不变。
@Controller('openapi/jizhang')
@Public()
export class JizhangOpenApiController {
  constructor(private readonly jizhangService: JizhangService) {}

  @Get('projects')
  async listProjects(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<ListResponse<AppData>> {
    const { page: pageNum, pageSize: pageSizeNum } = parsePagination(
      page,
      pageSize,
    );
    return this.jizhangService.getProjectList(
      SYSTEM_USER,
      pageNum,
      pageSizeNum,
      SYSTEM_GROUP_ID,
      SYSTEM_APPROVED,
    );
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string): Promise<AppData> {
    return this.jizhangService.getProjectDetail(
      SYSTEM_USER,
      id,
      SYSTEM_GROUP_ID,
      SYSTEM_APPROVED,
    );
  }

  @Get('projects/:projectId/records/summary/category')
  async getCategorySummary(
    @Param('projectId') projectId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('incomeExpense') incomeExpense?: 'income' | 'expense',
  ): Promise<JizhangCategorySummary[]> {
    return this.jizhangService.getCategorySummary(
      SYSTEM_USER,
      projectId,
      { dateFrom, dateTo, incomeExpense },
      SYSTEM_GROUP_ID,
      SYSTEM_APPROVED,
    );
  }

  @Get('projects/:projectId/records')
  async listRecords(
    @Param('projectId') projectId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('category') category?: string,
    @Query('incomeExpense') incomeExpense?: 'income' | 'expense',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<ListResponse<JizhangRecord>> {
    const { page: pageNum, pageSize: pageSizeNum } = parsePagination(
      page,
      pageSize,
    );
    return this.jizhangService.getRecordList(
      SYSTEM_USER,
      projectId,
      {
        page: pageNum,
        pageSize: pageSizeNum,
        category,
        incomeExpense,
        dateFrom,
        dateTo,
        includeDeleted: includeDeleted === 'true',
      },
      SYSTEM_GROUP_ID,
      SYSTEM_APPROVED,
    );
  }

  @Post('projects/:projectId/records')
  async createRecord(
    @Param('projectId') projectId: string,
    @Body() dto: OpenApiCreateRecordDto,
  ): Promise<JizhangRecord> {
    return this.jizhangService.createRecord(
      SYSTEM_USER,
      projectId,
      dto,
      SYSTEM_GROUP_ID,
      SYSTEM_APPROVED,
      { recorderIdOverride: dto.recorderId ?? undefined },
    );
  }

  @Patch('projects/:projectId/records/:id')
  async updateRecord(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJizhangRecordDto,
  ): Promise<JizhangRecord> {
    return this.jizhangService.updateRecord(
      SYSTEM_USER,
      projectId,
      id,
      dto,
      SYSTEM_GROUP_ID,
      SYSTEM_APPROVED,
    );
  }

  @Delete('projects/:projectId/records/:id')
  async deleteRecord(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.jizhangService.deleteRecord(
      SYSTEM_USER,
      projectId,
      id,
      SYSTEM_GROUP_ID,
      SYSTEM_APPROVED,
    );
  }
}
