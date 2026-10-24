'use client';

import { useQuery, queryOptions, type QueryClient } from '@tanstack/react-query';

import { listUsersByIds, type AccountType } from './service';

export const userQueries = {
  all: () => ['users'] as const,
  byIds: (userIds: string[], accountType: AccountType = 'apaas') =>
    queryOptions({
      queryKey: [...userQueries.all(), 'byIds', accountType, userIds.join(',')],
      queryFn: () => listUsersByIds(userIds),
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      enabled: userIds.length > 0,
    }),
};

export function useUsersByIds(
  userIds: string[],
  accountType: AccountType = 'apaas',
) {
  return useQuery(userQueries.byIds(userIds, accountType));
}

export function clearUserCache(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: userQueries.all() });
}
