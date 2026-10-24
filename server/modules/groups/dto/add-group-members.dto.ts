import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

import type { AddGroupMembersRequest } from '@shared/api.interface';

export class AddGroupMembersDto implements AddGroupMembersRequest {
  @IsArray()
  @ArrayNotEmpty({ message: '请选择要添加的用户' })
  @IsUUID('4', { each: true, message: '用户ID格式不正确' })
  userIds!: string[];
}
