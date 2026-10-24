import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { PagesService } from './pages.service';
import { UpdatePageAdminDto } from './dto/update-page-admin.dto';
import { UpdatePageOwnerDto } from './dto/update-page-owner.dto';
import { UpdatePageVisibilityDto } from './dto/update-page-visibility.dto';
import { RequireLevel } from '@server/common/decorators/require-level.decorator';
import { parsePagination } from '@server/common/utils/pagination';
import type { ListResponse, Page, UserLevel } from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/admin/pages')
@RequireLevel('super_admin', 'level_1', 'level_2')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  async getList(
    @Req() req: Request & { user: AuthUser },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('isDeleted') isDeleted?: string,
    @Query('status') status?: string,
  ): Promise<ListResponse<Page>> {
    const pagination = parsePagination(page, pageSize);
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    const isDeletedBool = isDeleted === 'true';

    return this.pagesService.getAdminList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword,
      isDeleted: isDeletedBool,
      status,
      operatorId: req.user.userId,
      operatorLevel: req.user.level,
      operatorGroupId: userInfo?.groupId ?? null,
    });
  }

  @Get(':id')
  async getDetail(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<Page> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    return this.pagesService.getAdminDetail(
      id,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdatePageAdminDto,
  ): Promise<Page> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    return this.pagesService.adminUpdatePage(
      id,
      dto,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Put(':id/owner')
  async updateOwner(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdatePageOwnerDto,
  ): Promise<Page> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    return this.pagesService.updateOwner(
      id,
      dto.ownerId ?? null,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Put(':id/visibility')
  async updateVisibility(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdatePageVisibilityDto,
  ): Promise<Page> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    return this.pagesService.updateVisibility(
      id,
      dto,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  async enable(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    await this.pagesService.setEnabled(
      id,
      true,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    await this.pagesService.setEnabled(
      id,
      false,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/trash')
  @HttpCode(HttpStatus.OK)
  async trash(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    await this.pagesService.softDelete(
      id,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    await this.pagesService.softDelete(
      id,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/restore')
  async restore(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<Page> {
    const userInfo = await this.pagesService.getUserInfo(req.user.userId);
    return this.pagesService.restore(
      id,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/delete-forever')
  @RequireLevel('super_admin', 'level_1')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteForever(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    await this.pagesService.deletePermanently(
      id,
      req.user.userId,
      req.user.level,
    );
  }
}
