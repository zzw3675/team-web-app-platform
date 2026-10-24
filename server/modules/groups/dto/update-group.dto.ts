import { IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import type { UpdateGroupRequest } from '@shared/api.interface';

export class UpdateGroupDto implements UpdateGroupRequest {
  @IsOptional()
  @IsString({ message: '分组名称不能为空' })
  @MaxLength(100, { message: '分组名称最多 100 个字符' })
  name?: string;

  @IsOptional()
  @IsString({ message: '备注格式不正确' })
  @MaxLength(500, { message: '备注最多 500 个字符' })
  remark?: string;

  @ValidateIf((o: UpdateGroupDto) => o.leaderId !== null && o.leaderId !== undefined)
  @IsUUID('4', { message: '组长ID格式不正确' })
  leaderId?: string | null;
}
