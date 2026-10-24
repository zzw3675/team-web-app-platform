'use client';

import React from 'react';

import { normalizeUser, isValidUserId } from '@client/src/components/business-ui/utils/user';
import type { UserInput } from '@client/src/components/business-ui/types/user';
import { UserWithAvatar } from '@client/src/components/business-ui/user-display/user-with-avatar';
import { UserProfile } from '@client/src/components/business-ui/user-profile/user-profile';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';

export interface IUserDisplayProps {
  value?: string | string[] | UserInput | UserInput[];
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
  showUserProfile?: boolean;
  userId?: string;
  user_id?: string;
}

export const UserDisplay: React.FC<IUserDisplayProps> = ({
  userId,
  user_id,
  value,
  size,
  className,
  style,
  showLabel = true,
}) => {
  const normalizedUsers = React.useMemo(() => {
    let list: UserInput[];

    if (value) {
      if (Array.isArray(value)) {
        list = value.map((item: string | UserInput) =>
          typeof item === 'string' ? { user_id: item } : item,
        );
      } else {
        list = [typeof value === 'string' ? { user_id: value } : value];
      }
    } else if (userId) {
      list = [{ user_id: userId }];
    } else if (user_id) {
      list = [{ user_id }];
    } else {
      return [];
    }

    return list
      .map(normalizeUser)
      .filter((user) => isValidUserId(user.user_id));
  }, [value, userId, user_id]);

  if (!normalizedUsers.length) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)} style={style}>
      {normalizedUsers.map((user) => (
        <Popover key={user.user_id}>
          <PopoverTrigger asChild>
            <div>
              <UserWithAvatar
                data={user}
                size={size}
                showLabel={showLabel}
                className="cursor-pointer hover:bg-[rgba(31_35_41_0.15)] active:bg-[rgba(31_35_41_0.2)]"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-[320px] border-0 border-border/50 bg-card p-0 shadow-[0px_8px_24px_8px_rgba(31_35_41_0.04),0px_6px_12px_rgba(31_35_41_0.04),0px_4px_8px_-8px_rgba(31_35_41_0.06)]"
          >
            <UserProfile value={user} />
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
};
