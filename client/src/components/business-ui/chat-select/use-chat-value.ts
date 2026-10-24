'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { listChatsByIds } from '@client/src/components/business-ui/api/chats/service';
import type {
  Chat,
  ChatSelectValue,
  ValueType,
} from '@client/src/components/business-ui/chat-select/types';
import {
  chatInfoToChat,
  createUnknownChat,
  extractIdsFromValue,
} from '@client/src/components/business-ui/chat-select/utils';
import { logger } from '@lark-apaas/client-toolkit/logger';

export type UseChatValueResult = {
  internalValue: Chat | Chat[] | null;
  isLoading: boolean;
  toExternalValue: (
    internalVal: Chat | Chat[] | null,
    multiple: boolean,
  ) => ChatSelectValue;
};

export function useChatValue(
  value: ChatSelectValue,
  multiple: boolean = false,
  valueType: ValueType = 'string',
): UseChatValueResult {
  const isIdMode = valueType === 'string';

  const [resolvedChats, setResolvedChats] = useState<Map<string, Chat>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const currentIds = useMemo(() => extractIdsFromValue(value), [value]);

  const missingIds = useMemo(() => {
    if (!isIdMode) return [];
    return currentIds.filter((id) => !resolvedChats.has(String(id)));
  }, [isIdMode, currentIds, resolvedChats]);

  const missingIdsKey = missingIds.join(',');

  useEffect(() => {
    if (!missingIdsKey) {
      return;
    }

    const ids = missingIdsKey.split(',');
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await listChatsByIds(ids);
        if (cancelled) return;

        const chatInfoMap = response?.data?.chatInfoMap || {};
        setResolvedChats((prev) => {
          const next = new Map(prev);
          for (const [chatId, chatInfo] of Object.entries(chatInfoMap)) {
            const chat = chatInfoToChat(chatInfo);
            next.set(String(chatId), chat);
          }
          for (const id of ids) {
            if (!next.has(String(id))) {
              next.set(String(id), createUnknownChat(id));
            }
          }
          return next;
        });
      } catch (error) {
        logger.error('Failed to resolve chat IDs:', String(error));
        if (!cancelled) {
          setResolvedChats((prev) => {
            const next = new Map(prev);
            for (const id of ids) {
              if (!next.has(String(id))) {
                next.set(String(id), createUnknownChat(id));
              }
            }
            return next;
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [missingIdsKey]);

  const internalValue = useMemo((): Chat | Chat[] | null => {
    if (value === null || value === undefined) {
      return multiple ? [] : null;
    }

    if (Array.isArray(value) && value.length === 0) {
      return [];
    }

    if (!isIdMode) {
      return value as Chat | Chat[];
    }

    const chats = currentIds
      .map((id) => resolvedChats.get(String(id)))
      .filter((c): c is Chat => c !== undefined);

    if (multiple) {
      return chats;
    }

    return chats[0] ?? null;
  }, [value, isIdMode, currentIds, resolvedChats, multiple]);

  const toExternalValue = useCallback(
    (
      internalVal: Chat | Chat[] | null,
      isMultiple: boolean,
    ): ChatSelectValue => {
      if (internalVal === null) {
        return null;
      }

      if (isIdMode) {
        if (isMultiple) {
          return (internalVal as Chat[]).map((c) => String(c.id));
        }
        return String((internalVal as Chat).id);
      }

      return internalVal;
    },
    [isIdMode],
  );

  return {
    internalValue,
    isLoading,
    toExternalValue,
  };
}
