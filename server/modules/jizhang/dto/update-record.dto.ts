import { IsIn, IsString, Matches, MaxLength, IsOptional } from 'class-validator';
import type { UpdateJizhangRecordRequest } from '@shared/api.interface';

// 金额：最多 12 位整数、最多 2 位小数
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const RECORD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateJizhangRecordDto implements UpdateJizhangRecordRequest {
  @IsOptional()
  @IsString({ message: '日期格式不正确' })
  @Matches(RECORD_DATE_PATTERN, { message: '日期格式应为 YYYY-MM-DD' })
  recordDate?: string;

  @IsOptional()
  @IsString({ message: '收支类型格式不正确' })
  @IsIn(['income', 'expense'], { message: '收支类型取值无效' })
  incomeExpense?: 'income' | 'expense';

  @IsOptional()
  @IsString({ message: '分类格式不正确' })
  @MaxLength(20, { message: '分类最多 20 个字符' })
  category?: string;

  @IsOptional()
  @IsString({ message: '金额格式不正确' })
  @Matches(AMOUNT_PATTERN, { message: '金额最多 12 位整数、2 位小数' })
  amount?: string;

  @IsOptional()
  @IsString({ message: '备注格式不正确' })
  @MaxLength(500, { message: '备注最多 500 个字符' })
  remark?: string;
}
