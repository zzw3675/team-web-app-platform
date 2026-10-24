import { IsEmail, IsString } from 'class-validator';
import type { ResetPasswordRequest } from '@shared/api.interface';

export class ResetPasswordRequestDto implements ResetPasswordRequest {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;
}

export class ResetPasswordConfirmDto {
  @IsString({ message: '重置令牌不能为空' })
  token!: string;

  @IsString({ message: '新密码不能为空' })
  newPassword!: string;
}
