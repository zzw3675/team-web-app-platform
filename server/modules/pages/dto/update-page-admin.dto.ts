import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePageAdminDto {
  @IsOptional()
  @IsString({ message: '标题格式不正确' })
  @MaxLength(100, { message: '标题最多 100 个字符' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'slug格式不正确' })
  @MaxLength(100, { message: 'slug最多 100 个字符' })
  slug?: string;

  @ValidateIf((o: UpdatePageAdminDto) => o.icon !== null && o.icon !== undefined)
  @IsString({ message: '图标格式不正确' })
  @MaxLength(100, { message: '图标最多 100 个字符' })
  icon?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '启用状态格式不正确' })
  enabled?: boolean;

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

  @ValidateIf((o: UpdatePageAdminDto) => o.groupId !== null && o.groupId !== undefined)
  @IsUUID('4', { message: '分组ID格式不正确' })
  groupId?: string | null;

  @ValidateIf((o: UpdatePageAdminDto) => o.ownerId !== null && o.ownerId !== undefined)
  @IsUUID('4', { message: '负责人ID格式不正确' })
  ownerId?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '应用模式格式不正确' })
  appMode?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '排序必须是整数' })
  sortOrder?: number;
}
