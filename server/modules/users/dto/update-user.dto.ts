import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { UpdateUserRequest } from '@shared/api.interface';

export class UpdateUserDto implements UpdateUserRequest {
  @IsOptional()
  @IsIn(['super_admin', 'level_1', 'level_2', 'level_3'], {
    message: '用户级别不正确',
  })
  level?: 'super_admin' | 'level_1' | 'level_2' | 'level_3';

  @ValidateIf((o: UpdateUserDto) => o.groupId !== null && o.groupId !== undefined)
  @IsUUID('4', { message: '分组ID格式不正确' })
  groupId?: string | null;

  @IsOptional()
  @IsString({ message: '昵称格式不正确' })
  @MaxLength(100, { message: '昵称最多 100 个字符' })
  nickname?: string;

  @ValidateIf((o: UpdateUserDto) => o.avatar !== null && o.avatar !== undefined)
  @IsString({ message: '头像格式不正确' })
  @MaxLength(500, { message: '头像URL最多 500 个字符' })
  avatar?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '审核状态格式不正确' })
  approved?: boolean;
}
