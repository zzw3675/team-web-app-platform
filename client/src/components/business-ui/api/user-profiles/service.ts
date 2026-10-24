import {
  UserProfileService,
  getAssetsUrl,
  type AccountType,
  type UserProfileData,
} from '@lark-apaas/client-toolkit/tools/services';

const userProfileService = new UserProfileService();

export async function fetchUserProfile(
  userId: string,
  accountType: AccountType = 'apaas',
  signal?: AbortSignal,
): Promise<UserProfileData> {
  return userProfileService.getUserProfile(userId, accountType, signal);
}

export { getAssetsUrl };
export type { AccountType, UserProfileData };
