import { SetMetadata } from '@nestjs/common';
import type { UserLevel } from '@shared/api.interface';

export const REQUIRE_LEVEL_KEY = 'requireLevel';
export const RequireLevel = (...levels: UserLevel[]) =>
  SetMetadata(REQUIRE_LEVEL_KEY, levels);
