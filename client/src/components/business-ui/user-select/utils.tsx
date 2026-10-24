import type { UserInfo, SearchAvatar } from '@lark-apaas/client-toolkit/tools/services';

import type { AccountType } from '@client/src/components/business-ui/api/users/service';
import type {
  UserSelectItemValue,
  UserSelectValue,
} from '@client/src/components/business-ui/user-select/types';
import { getI18nText } from '@client/src/components/business-ui/utils/user';
import type { User } from '@client/src/components/business-ui/types/user';

export function getUserDisplayName(name: UserInfo['name']): string {
  return name.zh_cn || name.en_us || '';
}

export function getUserId(
  user: Pick<UserInfo, 'userID' | 'larkUserID'>,
  accountType: AccountType,
): string {
  if (accountType === 'lark') {
    return user.larkUserID || `_unknown_${Math.random().toString(36).slice(2)}`;
  }
  return user.userID || user.larkUserID || `_unknown_${Math.random().toString(36).slice(2)}`;
}

export function isUnregisteredExternalContact(user: UserSelectItemValue): boolean {
  const raw = user.raw;
  return !!raw && !raw.user_id && !!raw.larkUserId;
}

export function createUnknownUser(id: string): UserSelectItemValue {
  return {
    id,
    name: '未知用户',
    avatar: undefined,
    raw: undefined,
  };
}

export function userInfoToUser(
  userInfo: UserInfo & SearchAvatar,
  accountType: AccountType,
): UserSelectItemValue {
  const rawUser: User = {
    user_id: userInfo.userID || undefined,
    larkUserId: userInfo.larkUserID || undefined,
    name: userInfo.name,
    avatar: userInfo.avatar?.image?.large,
    user_type: userInfo.userType,
    department: userInfo.department as any,
  };

  return {
    id: getUserId(userInfo, accountType),
    name: getI18nText(userInfo.name),
    avatar: userInfo.avatar?.image?.large,
    raw: rawUser,
  };
}

export function searchUserInfoToUser(
  userInfo: UserInfo & { avatar?: string; tenantName?: string },
  accountType: AccountType,
): UserSelectItemValue {
  const rawUser: User = {
    user_id: userInfo.userID || undefined,
    larkUserId: userInfo.larkUserID || undefined,
    name: userInfo.name,
    avatar: userInfo.avatar,
    user_type: userInfo.userType,
    department: userInfo.department as any,
    tenantName: userInfo.tenantName,
  };

  return {
    id: getUserId(userInfo, accountType),
    name: getI18nText(userInfo.name),
    avatar: userInfo.avatar,
    raw: rawUser,
  };
}

declare global {
  interface Window {
    MIAODA_APP_ID?: string;
    __platform__?: {
      appId?: string;
    };
    appId?: string;
  }
}

export function getAppId(path: string): string | null | undefined {
  if (window?.__platform__?.appId) {
    return window.__platform__.appId;
  }

  if (window.MIAODA_APP_ID) {
    return window.MIAODA_APP_ID;
  }

  let prefix: string;

  const appMatch = path.match(/\/app\/([^/]+)/);
  if (appMatch) {
    return appMatch[1];
  }

  if (path.includes('/ai/feida/runtime/')) {
    prefix = '/ai/feida/runtime/';
  } else if (path.includes('/spark/r/')) {
    prefix = '/spark/r/';
  } else {
    prefix = '/ai/miaoda/';
  }

  const windowAppId = window.appId || null;

  if (!path.startsWith(prefix)) {
    return windowAppId;
  }

  const remainder = path.substring(prefix.length);

  const nextSlashIndex = remainder.indexOf('/');

  if (nextSlashIndex === -1) {
    return remainder || windowAppId;
  }
  return remainder.substring(0, nextSlashIndex) || windowAppId;
}

export function extractIdsFromValue(value: UserSelectValue): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }
    if (typeof value[0] === 'string') {
      return value as string[];
    }
    return value.map((item: any) => {
      if ('id' in item && item.id) {
        return item.id;
      }
      if ('user_id' in item && item.user_id) {
        return item.user_id;
      }
      return '';
    }).filter(Boolean);
  }
  const item = value as any;
  if ('id' in item && item.id) {
    return [item.id];
  }
  if ('user_id' in item && item.user_id) {
    return [item.user_id];
  }
  return [];
}
