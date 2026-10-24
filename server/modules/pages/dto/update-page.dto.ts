import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { UpdatePageRequest } from '@shared/api.interface';

export class UpdatePageDto implements UpdatePageRequest {
  @IsOptional()
  @IsString({ message: '标题格式不正确' })
  @MaxLength(100, { message: '标题最多 100 个字符' })
  title?: string;

  @ValidateIf((o: UpdatePageDto) => o.icon !== null && o.icon !== undefined)
  @IsString({ message: '图标格式不正确' })
  @MaxLength(100, { message: '图标最多 100 个字符' })
  icon?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '排序必须是整数' })
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '启用状态格式不正确' })
  enabled?: boolean;
}
