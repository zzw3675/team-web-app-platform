import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import type { RegisterRequest } from '@shared/api.interface';

export class RegisterDto implements RegisterRequest {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少 6 位' })
  @MaxLength(100, { message: '密码长度不能超过 100 位' })
  password!: string;

  @IsString({ message: '昵称不能为空' })
  @MinLength(1, { message: '昵称不能为空' })
  @MaxLength(50, { message: '昵称长度不能超过 50 位' })
  nickname!: string;
}
