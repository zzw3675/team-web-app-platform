import { IsEmail, IsString, MinLength } from 'class-validator';
import type { LoginRequest } from '@shared/api.interface';

export class LoginDto implements LoginRequest {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少 6 位' })
  password!: string;
}
