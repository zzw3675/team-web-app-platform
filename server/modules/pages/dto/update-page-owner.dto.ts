import { IsOptional, IsUUID } from 'class-validator';

export class UpdatePageOwnerDto {
  @IsOptional()
  @IsUUID('4', { message: '负责人ID格式不正确' })
  ownerId?: string | null;
}
