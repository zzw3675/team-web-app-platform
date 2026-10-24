import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ApproveUserRequest } from '@shared/api.interface';

export class ApproveUserDto implements ApproveUserRequest {
  @IsOptional()
  @IsIn(['level_1', 'level_2', 'level_3'], {
    message: '用户级别不正确',
  })
  level?: 'level_1' | 'level_2' | 'level_3';

  @ValidateIf((o: ApproveUserDto) => o.groupId !== null && o.groupId !== undefined)
  @IsUUID('4', { message: '分组ID格式不正确' })
  groupId?: string | null;
}
