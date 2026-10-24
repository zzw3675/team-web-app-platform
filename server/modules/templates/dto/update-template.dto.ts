import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { UpdateTemplateRequest } from '@shared/api.interface';

export class UpdateTemplateDto implements UpdateTemplateRequest {
  @IsOptional()
  @IsString({ message: '模板名称不能为空' })
  @MaxLength(100, { message: '模板名称最多 100 个字符' })
  name?: string;

  @IsOptional()
  @IsIn(['html', 'app'], { message: '模板类型不正确' })
  type?: 'html' | 'app';

  @IsOptional()
  @IsString({ message: '图标格式不正确' })
  @MaxLength(100, { message: '图标最多 100 个字符' })
  icon?: string | null;

  @IsOptional()
  @IsString({ message: '描述格式不正确' })
  description?: string | null;

  @IsOptional()
  @IsString({ message: 'HTML内容格式不正确' })
  htmlContent?: string | null;

  @IsOptional()
  @IsString({ message: 'URL格式不正确' })
  @MaxLength(500, { message: 'URL最多 500 个字符' })
  url?: string | null;

  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  sortOrder?: number;
}
