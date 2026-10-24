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

import { UsersService, type GroupCountItem } from './users.service';
import { ListUsersDto } from './dto/list-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { RequireLevel } from '@server/common/decorators/require-level.decorator';
import type {
  ListResponse,
  OrganizationResponse,
  ResetPasswordAdminResponse,
  User,
  UserOverviewResponse,
  UserLevel,
} from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/admin/users')
@RequireLevel('super_admin', 'level_1', 'level_2')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('overview')
  async getOverview(
    @Req() req: Request & { user: AuthUser },
  ): Promise<UserOverviewResponse> {
    const userInfo = await this.usersService.getUserInfo(req.user.userId);
    return this.usersService.getOverview(req.user.level, userInfo?.groupId ?? null);
  }

  @Get()
  async getList(
    @Req() req: Request & { user: AuthUser },
    @Query() dto: ListUsersDto,
  ): Promise<ListResponse<User>> {
    const userInfo = await this.usersService.getUserInfo(req.user.userId);
    return this.usersService.getList(
      dto,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Get('group-counts')
  @RequireLevel('super_admin', 'level_1')
  async getGroupCounts(): Promise<{ items: GroupCountItem[] }> {
    return this.usersService.getGroupCounts();
  }

  @Get('organization')
  @RequireLevel('super_admin', 'level_1')
  async getOrganization(): Promise<OrganizationResponse> {
    return this.usersService.getOrganization();
  }

  @Post()
  @RequireLevel('super_admin', 'level_1')
  async create(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: CreateUserDto,
  ): Promise<User> {
    return this.usersService.createUser(dto, req.user.userId, req.user.level);
  }

  @Get(':id')
  async getDetail(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<User> {
    const userInfo = await this.usersService.getUserInfo(req.user.userId);
    return this.usersService.getDetail(
      id,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/approve')
  async approve(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: ApproveUserDto,
  ): Promise<User> {
    const userInfo = await this.usersService.getUserInfo(req.user.userId);
    return this.usersService.approveUser(
      id,
      dto,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/reject')
  async reject(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<User> {
    const userInfo = await this.usersService.getUserInfo(req.user.userId);
    return this.usersService.rejectUser(
      id,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Post(':id/reset-password')
  @RequireLevel('super_admin', 'level_1')
  async resetPassword(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<ResetPasswordAdminResponse> {
    return this.usersService.resetPassword(
      id,
      req.user.userId,
      req.user.level,
    );
  }

  @Patch(':id')
  async updateUser(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    const userInfo = await this.usersService.getUserInfo(req.user.userId);
    return this.usersService.updateUser(
      id,
      dto,
      req.user.userId,
      req.user.level,
      userInfo?.groupId ?? null,
    );
  }

  @Delete(':id')
  @RequireLevel('super_admin', 'level_1')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ): Promise<void> {
    await this.usersService.deleteUser(
      id,
      req.user.userId,
      req.user.level,
    );
  }
}
