import {
  IsArray,
  IsIn,
  IsUUID,
} from 'class-validator';
import type { UpdateTemplateVisibilityRequest } from '@shared/api.interface';

export class UpdateTemplateVisibilityDto
  implements UpdateTemplateVisibilityRequest
{
  @IsIn(['all', 'group', 'users', 'owner'], {
    message: '可见性类型不正确',
  })
  visibility!: 'all' | 'group' | 'users' | 'owner';

  @IsArray({ message: '可见分组列表格式不正确' })
  @IsUUID('4', { each: true, message: '分组ID格式不正确' })
  visibleGroupIds!: string[];

  @IsArray({ message: '可见用户列表格式不正确' })
  @IsUUID('4', { each: true, message: '用户ID格式不正确' })
  visibleUserIds!: string[];
}
