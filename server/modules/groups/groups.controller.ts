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
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { GroupsService, type GroupListItem } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddGroupMembersDto } from './dto/add-group-members.dto';
import { RequireLevel } from '@server/common/decorators/require-level.decorator';
import { parsePagination } from '@server/common/utils/pagination';
import type { Group, ListResponse, UserLevel } from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/admin/groups')
@RequireLevel('super_admin', 'level_1')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async getList(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string,
  ): Promise<ListResponse<GroupListItem>> {
    const { page: pageNum, pageSize: pageSizeNum } = parsePagination(
      page,
      pageSize,
    );

    return this.groupsService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      keyword,
    });
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<Group> {
    return this.groupsService.getDetail(id);
  }

  @Post()
  async create(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: CreateGroupDto,
  ): Promise<Group> {
    return this.groupsService.create(dto, req.user.userId);
  }

  @Post(':id/members')
  async addMembers(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: AddGroupMembersDto,
  ): Promise<{ added: number }> {
    return this.groupsService.addMembers(id, dto.userIds, req.user.userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.groupsService.removeMember(id, userId, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ): Promise<Group> {
    return this.groupsService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    await this.groupsService.delete(id, req.user.userId);
  }
}
