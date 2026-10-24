'use client';

import { useCallback, useMemo } from 'react';

import { useUsersByIds } from '@client/src/components/business-ui/api/users/queries';
import type {
  AccountType,
  UserSelectItemValue,
  UserSelectValue,
  ValueType,
} from '@client/src/components/business-ui/user-select/types';
import {
  extractIdsFromValue,
  userInfoToUser,
  createUnknownUser,
} from '@client/src/components/business-ui/user-select/utils';
import { getI18nText } from '@client/src/components/business-ui/utils/user';
import type { User } from '@client/src/components/business-ui/types/user';

function userToItemValue(user: User, accountType: AccountType): UserSelectItemValue {
  return {
    id: accountType === 'lark' ? (user.larkUserId || user.user_id || '') : (user.user_id || user.larkUserId || ''),
    name: getI18nText(user.name) || '未知用户',
    avatar: user.avatar,
    raw: user,
  };
}

export type UseUserValueResult = {
  internalValue: UserSelectItemValue | UserSelectItemValue[] | null;
  isLoading: boolean;
  toExternalValue: (
    internalVal: UserSelectItemValue | UserSelectItemValue[] | null,
    multiple: boolean,
  ) => UserSelectValue;
};

export function useUserValue(
  value: UserSelectValue,
  multiple: boolean = false,
  accountType: AccountType = 'apaas',
  valueType: ValueType = 'string',
): UseUserValueResult {
  const isIdMode = valueType === 'string';

  const currentIds = useMemo(() => extractIdsFromValue(value), [value]);

  const idsToFetch = useMemo(() => {
    if (!isIdMode) return [];
    return [...new Set(currentIds.map(String))].filter(Boolean).sort();
  }, [isIdMode, currentIds]);

  const { data: response, isLoading } = useUsersByIds(idsToFetch, accountType);

  const usersMap = useMemo(() => {
    const map = new Map<string, UserSelectItemValue>();
    const userInfoMap = response?.data?.userInfoMap || {};

    for (const id of idsToFetch) {
      const userInfo = userInfoMap[id];
      const user = userInfo
        ? userInfoToUser(userInfo, accountType)
        : createUnknownUser(id);
      map.set(String(id), user);
    }
    return map;
  }, [response, idsToFetch, accountType]);

  const internalValue = useMemo((): UserSelectItemValue | UserSelectItemValue[] | null => {
    if (value === null || value === undefined) {
      return multiple ? [] : null;
    }

    if (Array.isArray(value) && value.length === 0) {
      return [];
    }

    if (!isIdMode) {
      if (Array.isArray(value)) {
        return (value as User[]).map((user) => userToItemValue(user, accountType));
      }
      return userToItemValue(value as User, accountType);
    }

    const users = currentIds
      .map((id) => usersMap.get(String(id)))
      .filter((u): u is UserSelectItemValue => u !== undefined);

    if (multiple) {
      return users;
    }

    return users[0] ?? null;
  }, [value, isIdMode, currentIds, usersMap, multiple, accountType]);

  const toExternalValue = useCallback(
    (
      internalVal: UserSelectItemValue | UserSelectItemValue[] | null,
      isMultiple: boolean,
    ): UserSelectValue => {
      if (internalVal === null) {
        return null;
      }

      if (isIdMode) {
        if (isMultiple) {
          return (internalVal as UserSelectItemValue[]).map((u) => String(u.id));
        }
        return String((internalVal as UserSelectItemValue).id);
      }

      if (isMultiple) {
        return (internalVal as UserSelectItemValue[]).map((u) => u.raw!);
      }
      return (internalVal as UserSelectItemValue).raw!;
    },
    [isIdMode],
  );

  return {
    internalValue,
    isLoading,
    toExternalValue,
  };
}
