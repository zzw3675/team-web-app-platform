import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { JizhangService } from './jizhang.service';
import { CreateJizhangProjectDto } from './dto/create-project.dto';
import { UpdateJizhangProjectDto } from './dto/update-project.dto';
import { CreateJizhangRecordDto } from './dto/create-record.dto';
import { UpdateJizhangRecordDto } from './dto/update-record.dto';
import { parsePagination } from '@server/common/utils/pagination';
import type {
  AppData,
  JizhangCategorySummary,
  JizhangRecord,
  ListResponse,
  UserLevel,
} from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/jizhang/projects')
export class JizhangController {
  constructor(private readonly jizhangService: JizhangService) {}

  private async getUserInfo(req: Request & { user: AuthUser }) {
    const ctx = await this.jizhangService.getUserContext(req.user.userId);
    return {
      user: {
        userId: req.user.userId,
        level: req.user.level,
      },
      groupId: ctx?.groupId ?? null,
      approved: ctx?.approved ?? false,
    };
  }

  // ========== 项目管理 ==========

  @Get()
  async getProjectList(
    @Req() req: Request & { user: AuthUser },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<ListResponse<AppData>> {
    const { page: pageNum, pageSize: pageSizeNum } = parsePagination(
      page,
      pageSize,
    );
    const { user, groupId, approved } = await this.getUserInfo(req);

    return this.jizhangService.getProjectList(
      user,
      pageNum,
      pageSizeNum,
      groupId,
      approved,
    );
  }

  @Get(':id')
  async getProjectDetail(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<AppData> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    return this.jizhangService.getProjectDetail(user, id, groupId, approved);
  }

  @Post()
  async createProject(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: CreateJizhangProjectDto,
  ): Promise<AppData> {
    return this.jizhangService.createProject(
      { userId: req.user.userId, level: req.user.level },
      dto,
    );
  }

  @Patch(':id')
  async updateProject(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateJizhangProjectDto,
  ): Promise<AppData> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    return this.jizhangService.updateProject(
      user,
      id,
      dto,
      groupId,
      approved,
    );
  }

  @Delete(':id')
  async deleteProject(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    await this.jizhangService.deleteProject(user, id, groupId, approved);
  }

  // ========== 记账记录管理 ==========

  @Get(':projectId/records')
  async getRecordList(
    @Req() req: Request & { user: AuthUser },
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
    const { user, groupId, approved } = await this.getUserInfo(req);

    return this.jizhangService.getRecordList(
      user,
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
      groupId,
      approved,
    );
  }

  @Get(':projectId/records/recycle')
  async getRecycleList(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<ListResponse<JizhangRecord>> {
    const { page: pageNum, pageSize: pageSizeNum } = parsePagination(
      page,
      pageSize,
    );
    const { user, groupId, approved } = await this.getUserInfo(req);

    return this.jizhangService.getRecycleList(
      user,
      projectId,
      pageNum,
      pageSizeNum,
      groupId,
      approved,
    );
  }

  @Get(':projectId/records/summary/category')
  async getCategorySummary(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('incomeExpense') incomeExpense?: 'income' | 'expense',
  ): Promise<JizhangCategorySummary[]> {
    const { user, groupId, approved } = await this.getUserInfo(req);

    return this.jizhangService.getCategorySummary(
      user,
      projectId,
      { dateFrom, dateTo, incomeExpense },
      groupId,
      approved,
    );
  }

  @Get(':projectId/records/export')
  async exportCsv(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { user, groupId, approved } = await this.getUserInfo(req);

    const csvContent = await this.jizhangService.exportCsv(
      user,
      projectId,
      groupId,
      approved,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="jizhang_${projectId}.csv"`,
    );
    res.send(csvContent);
  }

  @Get(':projectId/records/:id')
  async getRecordDetail(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<JizhangRecord> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    return this.jizhangService.getRecordDetail(
      user,
      projectId,
      id,
      groupId,
      approved,
    );
  }

  @Post(':projectId/records')
  async createRecord(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Body() dto: CreateJizhangRecordDto,
  ): Promise<JizhangRecord> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    return this.jizhangService.createRecord(
      user,
      projectId,
      dto,
      groupId,
      approved,
    );
  }

  @Patch(':projectId/records/:id')
  async updateRecord(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJizhangRecordDto,
  ): Promise<JizhangRecord> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    return this.jizhangService.updateRecord(
      user,
      projectId,
      id,
      dto,
      groupId,
      approved,
    );
  }

  @Delete(':projectId/records/:id')
  async deleteRecord(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    await this.jizhangService.deleteRecord(
      user,
      projectId,
      id,
      groupId,
      approved,
    );
  }

  @Post(':projectId/records/:id/restore')
  async restoreRecord(
    @Req() req: Request & { user: AuthUser },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const { user, groupId, approved } = await this.getUserInfo(req);
    await this.jizhangService.restoreRecord(
      user,
      projectId,
      id,
      groupId,
      approved,
    );
  }
}
