import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import type { CreateUserRequest } from '@shared/api.interface';

export class CreateUserDto implements CreateUserRequest {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1, { message: '昵称不能为空' })
  @MaxLength(100)
  nickname!: string;

  @IsString()
  @MinLength(8, { message: '初始密码至少 8 位' })
  @MaxLength(64)
  password!: string;

  @IsOptional()
  @IsString()
  @IsIn(['level_1', 'level_2', 'level_3'], { message: '级别不合法' })
  level?: 'level_1' | 'level_2' | 'level_3';

  @IsOptional()
  @IsUUID('4', { message: '分组 ID 格式不正确' })
  groupId?: string | null;
}
