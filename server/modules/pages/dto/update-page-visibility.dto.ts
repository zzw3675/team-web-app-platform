import { IsArray, IsIn, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdatePageVisibilityDto {
  @IsIn(['all', 'group', 'users', 'owner'], {
    message: '可见性类型不正确',
  })
  visibility!: 'all' | 'group' | 'users' | 'owner';

  @IsOptional()
  @IsArray({ message: '可见用户列表格式不正确' })
  @IsUUID('4', { each: true, message: '用户ID格式不正确' })
  visibleUserIds?: string[];

  @IsOptional()
  @IsArray({ message: '可见分组列表格式不正确' })
  @IsUUID('4', { each: true, message: '分组ID格式不正确' })
  visibleGroupIds?: string[];

  @ValidateIf((o: UpdatePageVisibilityDto) => o.groupId !== null && o.groupId !== undefined)
  @IsUUID('4', { message: '分组ID格式不正确' })
  groupId?: string | null;
}
