import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsString, MaxLength } from 'class-validator';

import { SettingsService } from './settings.service';
import { RequireLevel } from '@server/common/decorators/require-level.decorator';
import type { Setting, UserLevel } from '@shared/api.interface';

class UpdateSettingDto {
  @IsString({ message: '设置值不能为空' })
  @MaxLength(500, { message: '设置值最多 500 个字符' })
  value!: string;
}

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/admin/settings')
@RequireLevel('super_admin', 'level_1')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAllSettings(): Promise<{ items: Setting[] }> {
    const items = await this.settingsService.getAllSettings();
    return { items };
  }

  @Patch(':key')
  async updateSetting(
    @Req() req: Request & { user: AuthUser },
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ): Promise<Setting> {
    const setting = await this.settingsService.updateSetting(
      key,
      dto.value,
      req.user.userId,
    );
    if (!setting) {
      throw new NotFoundException('设置项不存在');
    }
    return setting;
  }
}
