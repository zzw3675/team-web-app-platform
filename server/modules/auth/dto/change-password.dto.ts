import { IsString, MinLength, MaxLength } from 'class-validator';
import type { ChangePasswordRequest } from '@shared/api.interface';

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString({ message: '旧密码不能为空' })
  oldPassword!: string;

  @IsString({ message: '新密码不能为空' })
  @MinLength(6, { message: '新密码长度至少 6 位' })
  @MaxLength(100, { message: '新密码长度不能超过 100 位' })
  newPassword!: string;
}
