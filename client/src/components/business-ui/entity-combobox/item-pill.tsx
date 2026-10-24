'use client';

import React from 'react';

import {
  itemPillTextVariants,
  itemPillVariants,
  tagAvatarVariants,
  type ComboboxSize,
} from '@client/src/components/business-ui/entity-combobox/size-variants';
import { cn } from '@/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@client/src/components/ui/avatar';
import { Badge } from '@client/src/components/ui/badge';

export type ItemPillProps = {
  label: string;
  size?: ComboboxSize;
  avatarUrl?: string;
  avatar?: React.ReactNode;
  avatarFallback?: boolean;
  className?: string;
  disabled?: boolean;
  maxTextLength?: number;
  suffix?: React.ReactNode;
};

export const isHexColor = (str?: string): boolean => {
  if (!str) return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(str);
};

export type RenderPillAvatarOptions = {
  avatarUrl?: string;
  label: string;
  size?: ComboboxSize;
  avatarFallback?: boolean;
};

export const renderPillAvatar = ({
  avatarUrl,
  label,
  size = 'medium',
  avatarFallback = true,
}: RenderPillAvatarOptions): React.ReactNode => {
  if (avatarUrl) {
    if (isHexColor(avatarUrl)) {
      return (
        <Avatar className={tagAvatarVariants({ size })}>
          <AvatarFallback style={{ backgroundColor: avatarUrl }}>
            {label?.charAt?.(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }
    return (
      <Avatar className={tagAvatarVariants({ size })}>
        <AvatarImage src={avatarUrl} alt={label} loading="eager" />
      </Avatar>
    );
  }

  if (avatarFallback) {
    return (
      <Avatar className={tagAvatarVariants({ size })}>
        <AvatarFallback>{label?.charAt?.(0).toUpperCase()}</AvatarFallback>
      </Avatar>
    );
  }

  return null;
};

export const ItemPill: React.FC<ItemPillProps> = ({
  className,
  avatarUrl,
  disabled,
  label,
  maxTextLength,
  suffix,
  avatar,
  avatarFallback = true,
  size = 'medium',
}) => {
  const displayLabel = React.useMemo(() => {
    if (!maxTextLength || label?.length <= maxTextLength) {
      return label;
    }
    return label.slice(0, maxTextLength) + '...';
  }, [maxTextLength, label]);

  const avatarElement = React.useMemo(() => {
    if (avatar) {
      return avatar;
    }

    return renderPillAvatar({ avatarUrl, label, size, avatarFallback });
  }, [avatar, avatarUrl, avatarFallback, label, size]);

  return (
    <Badge
      variant="secondary"
      className={cn(
        itemPillVariants({ size }),
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {avatarElement}
      <span className={itemPillTextVariants({ size })}>{displayLabel}</span>
      {suffix}
    </Badge>
  );
};
