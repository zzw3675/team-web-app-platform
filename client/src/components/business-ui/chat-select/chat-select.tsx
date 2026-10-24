'use client';

import React, { useCallback, useMemo } from 'react';

import { searchChats } from '@client/src/components/business-ui/api/chats/service';
import { ChatItem } from '@client/src/components/business-ui/chat-select/chat-item';
import { ChatSelectTag } from '@client/src/components/business-ui/chat-select/chat-select-tag';
import type {
  Chat,
  ChatSelectProps,
} from '@client/src/components/business-ui/chat-select/types';
import { useChatValue } from '@client/src/components/business-ui/chat-select/use-chat-value';
import { chatInfoToChat } from '@client/src/components/business-ui/chat-select/utils';
import { BaseCombobox } from '@client/src/components/business-ui/entity-combobox/base-combobox';
import { useEntityComboboxContext } from '@client/src/components/business-ui/entity-combobox/context';

function createChatsFetcher(pageSize: number = 100) {
  return async (search: string) => {
    const response = await searchChats({ query: search, pageSize });
    const chatList = response?.data?.result?.chatResult?.items || [];
    return { items: chatList.map((chat) => chatInfoToChat(chat)) };
  };
}

const ChatItemWrapper = ({
  chatValue,
  isSelected,
  className,
  disabled,
}: {
  chatValue: Chat;
  isSelected: boolean;
  className?: string;
  disabled?: boolean;
}) => {
  const { size, searchValue } = useEntityComboboxContext();
  return (
    <ChatItem
      chatValue={chatValue}
      isSelected={isSelected}
      className={className}
      size={size}
      searchKeyword={searchValue}
      disabled={disabled}
    />
  );
};

const ChatSelectTagWrapper = ({
  chatValue,
  onClose,
  className,
  disabled,
  isLoading,
}: {
  chatValue: Chat;
  onClose: (value: Chat, e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
}) => {
  const { size } = useEntityComboboxContext();
  return (
    <ChatSelectTag
      chatValue={chatValue}
      onClose={onClose}
      className={className}
      size={size}
      disabled={disabled}
      isLoading={isLoading}
    />
  );
};

export const ChatSelect: React.FC<ChatSelectProps> = (props) => {
  const {
    size = 'medium',
    triggerType = 'button',
    renderTrigger,
    multiple = false,
    value,
    valueType = 'string',
    defaultValue,
    onChange,
    defaultOpen,
    disabled,
    autoFocus,
    required,
    name,
    className,
    classNames,
    placeholder = '请选择',
    emptyText = '没有匹配结果，换个关键词试试吧',
    tagClosable,
    maxTagCount,
    onSelect,
    onDeselect,
    onClear,
    onFocus,
    onBlur,
    slotProps,
    getOptionDisabled,
  } = props;

  const isControlled = value !== undefined;

  const { internalValue, isLoading, toExternalValue } = useChatValue(
    value ?? null,
    multiple,
    valueType,
  );

  const { internalValue: internalDefaultValue } = useChatValue(
    defaultValue ?? null,
    multiple,
    valueType,
  );

  const fetchFn = useMemo(() => createChatsFetcher(), []);

  const handleChange = useCallback(
    (newValue: Chat | Chat[] | null) => {
      if (!onChange) return;

      const externalValue = toExternalValue(newValue, multiple);
      (onChange as (value: unknown) => void)(externalValue);
    },
    [onChange, toExternalValue, multiple],
  );

  const renderTagWithLoading = useCallback(
    (
      chatValue: Chat,
      onClose: (value: Chat, e: React.MouseEvent) => void,
      tagDisabled?: boolean,
    ) => (
      <ChatSelectTagWrapper
        key={chatValue.id}
        chatValue={chatValue}
        onClose={onClose}
        disabled={tagDisabled}
        isLoading={isLoading}
      />
    ),
    [isLoading],
  );

  return (
    <BaseCombobox
      autoFocus={autoFocus}
      className={className}
      classNames={classNames}
      debounce={300}
      defaultOpen={defaultOpen}
      defaultValue={internalDefaultValue}
      disabled={disabled}
      emptyText={emptyText}
      fetchFn={fetchFn}
      getItemLabel={(chatValue: Chat) => chatValue.name}
      getItemValue={(chatValue: Chat) => chatValue}
      getOptionDisabled={getOptionDisabled}
      maxTagCount={maxTagCount}
      multiple={multiple}
      name={name}
      onBlur={onBlur}
      onChange={handleChange}
      onClear={onClear}
      onDeselect={onDeselect}
      onFocus={onFocus}
      onSelect={onSelect}
      placeholder={placeholder}
      renderItem={(chatValue, isSelected, itemClassName, itemDisabled) => (
        <ChatItemWrapper
          key={chatValue.id}
          chatValue={chatValue}
          isSelected={isSelected}
          className={itemClassName}
          disabled={itemDisabled}
        />
      )}
      renderTag={renderTagWithLoading}
      renderTrigger={renderTrigger}
      required={required}
      searchPlaceholder=""
      showSearch
      size={size}
      slotProps={slotProps}
      tagClosable={tagClosable}
      triggerType={triggerType}
      value={isControlled ? internalValue : undefined}
    />
  );
};
