import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为 1' })
  @Max(100, { message: '每页数量最大为 100' })
  pageSize?: number;

  @IsOptional()
  @IsString({ message: '关键词格式不正确' })
  keyword?: string;

  @IsOptional()
  @IsIn(['super_admin', 'level_1', 'level_2', 'level_3'], {
    message: '用户级别不正确',
  })
  level?: string;

  @IsOptional()
  @IsIn(['true', 'false', 'approved', 'pending'], {
    message: '审核状态不正确',
  })
  approved?: string;

  @IsOptional()
  @IsUUID('4', { message: '分组ID格式不正确' })
  groupId?: string;
}
