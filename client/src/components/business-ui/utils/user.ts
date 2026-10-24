// client/src/utils/user.ts

import type { I18nText, User, UserInput } from '../types/user';

export function getI18nText(
  text: I18nText | string | undefined,
  locale: 'zh_cn' | 'en_us' | 'ja_jp' = 'zh_cn',
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[locale] || text.zh_cn || text.en_us || text.ja_jp || '';
}

export function normalizeUser(input: UserInput): User {
  const data = input as any;

  const user_id = data.user_id || data.userId || '';
  const larkUserId = data.larkUserId;
  const name = data.name;
  const avatar = data.avatar;
  const email = data.email;
  const user_type = data.user_type || data.userType;
  const department = data.department;

  return {
    user_id,
    larkUserId,
    name,
    avatar,
    email,
    user_type,
    department,
  };
}

export function isValidUserId(user_id: string | undefined): boolean {
  if (!user_id) return false;
  const trimmed = user_id.trim();
  if (!trimmed) return false;
  if (trimmed === '""') return false;
  return true;
}

export function getUserDisplayName(
  user: User | undefined,
  locale: 'zh_cn' | 'en_us' | 'ja_jp' = 'zh_cn',
): string {
  if (!user) return '';
  return getI18nText(user.name, locale) || '无效人员';
}
