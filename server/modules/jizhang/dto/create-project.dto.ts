import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { CreateJizhangProjectRequest } from '@shared/api.interface';

export class CreateJizhangProjectDto implements CreateJizhangProjectRequest {
  @IsString({ message: '标题格式不正确' })
  @MaxLength(200, { message: '标题最多 200 个字符' })
  title!: string;

  @IsString({ message: '可读范围格式不正确' })
  @IsIn(['all', 'group', 'owner', 'users'], { message: '可读范围取值无效' })
  readScope!: 'all' | 'group' | 'owner' | 'users';

  @IsOptional()
  @IsArray({ message: '可读用户列表格式不正确' })
  @IsUUID('4', { each: true, message: '可读用户ID格式不正确' })
  readUserIds?: string[];

  @IsString({ message: '可编辑范围格式不正确' })
  @IsIn(['all', 'group', 'owner', 'users'], { message: '可编辑范围取值无效' })
  editScope!: 'all' | 'group' | 'owner' | 'users';

  @IsOptional()
  @IsArray({ message: '可编辑用户列表格式不正确' })
  @IsUUID('4', { each: true, message: '可编辑用户ID格式不正确' })
  editUserIds?: string[];
}
