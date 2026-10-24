import { Controller, Get, Query } from '@nestjs/common';

import { UsersService } from './users.service';
import { UserDirectoryQueryDto } from './dto/user-directory-query.dto';
import type { UserDirectoryItem } from '@shared/api.interface';

// 响应契约：{ items: UserDirectoryItem[] }，只含 id / nickname / level
interface UserDirectoryResponse {
  items: UserDirectoryItem[];
}

// 人员目录：任何已登录用户可用（不加 @RequireLevel），仅返回已审核用户的精简信息
@Controller('api/users')
export class UserDirectoryController {
  constructor(private readonly usersService: UsersService) {}

  @Get('directory')
  async getDirectory(
    @Query() query: UserDirectoryQueryDto,
  ): Promise<UserDirectoryResponse> {
    const items = await this.usersService.getDirectory(query);
    return { items };
  }
}
