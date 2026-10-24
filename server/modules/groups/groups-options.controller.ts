import { Controller, Get } from '@nestjs/common';

import { GroupsService } from './groups.service';
import type { GroupOption } from '@shared/api.interface';

// 任意已登录用户可读的分组选项，不放到仅管理员可用的 GroupsController 中
@Controller('api/groups')
export class GroupsOptionsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('options')
  async getOptions(): Promise<{ items: GroupOption[] }> {
    const items = await this.groupsService.listOptions();
    return { items };
  }
}
