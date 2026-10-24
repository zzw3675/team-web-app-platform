import { BadRequestException } from '@nestjs/common';

export function parseDateParam(value: string, message: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(message);
  }
  return date;
}

const RECORD_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseRecordDate(value: string, message: string): string {
  const matched = RECORD_DATE_PATTERN.exec(value);
  if (!matched) {
    throw new BadRequestException(message);
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  if (!isRealDate) {
    throw new BadRequestException(message);
  }

  return value;
}
