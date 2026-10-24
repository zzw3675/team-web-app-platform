import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { CreateTemplateRequest } from '@shared/api.interface';

export class CreateTemplateDto implements CreateTemplateRequest {
  @IsString({ message: '模板名称不能为空' })
  @MaxLength(100, { message: '模板名称最多 100 个字符' })
  name!: string;

  @IsIn(['html', 'app'], { message: '模板类型不正确' })
  type!: 'html' | 'app';

  @IsOptional()
  @IsString({ message: '图标格式不正确' })
  @MaxLength(100, { message: '图标最多 100 个字符' })
  icon?: string;

  @IsOptional()
  @IsString({ message: '描述格式不正确' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'HTML内容格式不正确' })
  htmlContent?: string;

  @IsOptional()
  @IsString({ message: 'URL格式不正确' })
  @MaxLength(500, { message: 'URL最多 500 个字符' })
  url?: string;

  @IsOptional()
  @IsIn(['all', 'group', 'users', 'owner'], {
    message: '可见性类型不正确',
  })
  visibility?: 'all' | 'group' | 'users' | 'owner';

  @IsOptional()
  @IsArray({ message: '可见用户列表格式不正确' })
  @IsUUID('4', { each: true, message: '用户ID格式不正确' })
  visibleUserIds?: string[];

  @IsOptional()
  @IsArray({ message: '可见分组列表格式不正确' })
  @IsUUID('4', { each: true, message: '分组ID格式不正确' })
  visibleGroupIds?: string[];

  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  sortOrder?: number;

  @IsOptional()
  @IsUUID('4', { message: '负责人ID格式不正确' })
  ownerId?: string;
}
