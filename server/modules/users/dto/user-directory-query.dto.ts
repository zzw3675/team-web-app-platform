import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UserDirectoryQueryDto {
  @IsOptional()
  @IsString({ message: '关键词格式不正确' })
  @MaxLength(100, { message: '关键词最多 100 个字符' })
  keyword?: string;

  @IsOptional()
  @IsString({ message: '数量参数格式不正确' })
  limit?: string;

  @IsOptional()
  @IsString({ message: '用户ID参数格式不正确' })
  @MaxLength(4000, { message: '用户ID列表过长' })
  ids?: string;
}
