import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePageFromTemplateDto {
  @IsUUID()
  templateId!: string;

  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsString()
  @IsIn(['all', 'group', 'users', 'owner'])
  visibility!: 'all' | 'group' | 'users' | 'owner';

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  visibleUserIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  visibleGroupIds?: string[];

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
