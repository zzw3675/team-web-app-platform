'use client';

import { useQuery, queryOptions, type QueryClient } from '@tanstack/react-query';

import { fetchUserProfile, type AccountType } from './service';

export const userProfileQueries = {
  all: () => ['userProfiles'] as const,
  byId: (userId: string, accountType: AccountType = 'apaas') =>
    queryOptions({
      queryKey: [...userProfileQueries.all(), 'byId', accountType, userId],
      queryFn: ({ signal }) => fetchUserProfile(userId, accountType, signal),
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      enabled: !!userId,
    }),
};

export type UseUserProfileOptions = {
  userId: string;
  accountType?: AccountType;
  enabled?: boolean;
};

export function useUserProfile(options: UseUserProfileOptions) {
  const { userId, accountType = 'apaas', enabled = true } = options;

  return useQuery({
    ...userProfileQueries.byId(userId, accountType),
    enabled: enabled && !!userId,
  });
}

export function clearUserProfileCache(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: userProfileQueries.all() });
}
