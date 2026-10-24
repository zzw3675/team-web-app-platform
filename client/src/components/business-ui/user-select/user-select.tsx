'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  searchUsers,
  convertExternalContact,
  type AccountType,
} from '@client/src/components/business-ui/api/users/service';
import { BaseCombobox } from '@client/src/components/business-ui/entity-combobox/base-combobox';
import { useEntityComboboxContext } from '@client/src/components/business-ui/entity-combobox/context';
import type {
  UserSelectItemValue,
  UserSelectProps,
} from '@client/src/components/business-ui/user-select/types';
import { useUserValue } from '@client/src/components/business-ui/user-select/use-user-value';
import { UserItem } from '@client/src/components/business-ui/user-select/user-item';
import { UserSelectTag } from '@client/src/components/business-ui/user-select/user-select-tag';
import {
  searchUserInfoToUser,
  isUnregisteredExternalContact,
} from '@client/src/components/business-ui/user-select/utils';

function createUsersFetcher(options: { accountType?: AccountType; pageSize?: number } = {}) {
  const { accountType = 'apaas', pageSize = 100 } = options;

  return async (search: string) => {
    const response = await searchUsers({ query: search, pageSize });
    const userList = response?.data?.userList || [];

    return {
      items: userList.map((user) => searchUserInfoToUser(user, accountType)),
    };
  };
}

const UserItemWrapper = ({
  userValue,
  isSelected,
  className,
  disabled,
  isConverting,
}: {
  userValue: UserSelectItemValue;
  isSelected: boolean;
  className?: string;
  disabled?: boolean;
  isConverting?: boolean;
}) => {
  const { size, searchValue } = useEntityComboboxContext();
  return (
    <UserItem
      userValue={userValue}
      isSelected={isSelected}
      className={className}
      size={size}
      searchKeyword={searchValue}
      disabled={disabled}
      isConverting={isConverting}
    />
  );
};

const UserSelectTagWrapper = ({
  userValue,
  onClose,
  className,
  disabled,
  isLoading,
  accountType,
}: {
  userValue: UserSelectItemValue;
  onClose: (value: UserSelectItemValue, e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  accountType?: 'apaas' | 'lark';
}) => {
  const { size } = useEntityComboboxContext();
  return (
    <UserSelectTag
      userValue={userValue}
      onClose={onClose}
      className={className}
      size={size}
      disabled={disabled}
      isLoading={isLoading}
      accountType={accountType}
    />
  );
};

export const UserSelect: React.FC<UserSelectProps> = (props) => {
  const {
    size = 'medium',
    triggerType = 'button',
    renderTrigger,
    multiple = false,
    value,
    valueType = 'string',
    accountType = 'apaas',
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

  const { internalValue, isLoading, toExternalValue } = useUserValue(
    value ?? null,
    multiple,
    accountType,
    valueType,
  );

  const internalValueRef = useRef(internalValue);
  internalValueRef.current = internalValue;

  const { internalValue: internalDefaultValue } = useUserValue(
    defaultValue ?? null,
    multiple,
    accountType,
    valueType,
  );

  const baseFetchFn = useMemo(() => createUsersFetcher({ accountType }), [accountType]);

  const [convertingSet, setConvertingSet] = useState<Set<string>>(() => new Set());

  const [convertedMap, setConvertedMap] = useState<Map<string, UserSelectItemValue>>(
    () => new Map(),
  );

  const fetchFn = useCallback(
    async (search: string) => {
      const result = await baseFetchFn(search);
      if (convertedMap.size === 0) return result;
      return {
        ...result,
        items: result.items.map((item) => convertedMap.get(item.id) ?? item),
      };
    },
    [baseFetchFn, convertedMap],
  );

  const pendingConvertRef = useRef(false);

  const [open, setOpen] = useState(defaultOpen ?? false);
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && pendingConvertRef.current) return;
    setOpen(nextOpen);
  }, []);

  const mergedGetOptionDisabled = useCallback(
    (option: UserSelectItemValue) => {
      if (convertingSet.has(option.id)) return true;
      if (isUnregisteredExternalContact(option)) return false;
      return getOptionDisabled?.(option) ?? false;
    },
    [getOptionDisabled, convertingSet],
  );

  const handleChange = useCallback(
    (newValue: UserSelectItemValue | UserSelectItemValue[] | null) => {
      if (!onChange) return;

      if (multiple && Array.isArray(newValue)) {
        const hasUnregistered = newValue.some((u) => isUnregisteredExternalContact(u));
        if (hasUnregistered) {
          pendingConvertRef.current = true;
        }
        const filtered = newValue.filter((u) => !isUnregisteredExternalContact(u));
        const externalValue = toExternalValue(filtered, multiple);
        (onChange as (value: unknown) => void)(externalValue);
      } else if (!multiple) {
        const user = newValue as UserSelectItemValue | null;
        if (user && isUnregisteredExternalContact(user)) {
          pendingConvertRef.current = true;
          return;
        }
        const externalValue = toExternalValue(newValue, multiple);
        (onChange as (value: unknown) => void)(externalValue);
      }
    },
    [onChange, multiple, toExternalValue],
  );

  const handleSelect = useCallback(
    (user: UserSelectItemValue) => {
      if (!isUnregisteredExternalContact(user)) {
        onSelect?.(user);
        return;
      }

      const larkUserID = user.raw?.larkUserId;
      if (!larkUserID) return;
      if (convertingSet.has(user.id)) return;

      setConvertingSet((prev) => new Set(prev).add(user.id));

      void (async () => {
        try {
          const result = await convertExternalContact(larkUserID);
          const { userInfo } = result.data;
          const forceUserID = String(userInfo.userID);
          const convertedUser: UserSelectItemValue = {
            ...user,
            id: forceUserID,
            raw: user.raw ? { ...user.raw, user_id: forceUserID } : undefined,
          };

          setConvertedMap((prev) => new Map(prev).set(user.id, convertedUser));

          onSelect?.(convertedUser);
          if (onChange) {
            if (multiple) {
              const current = Array.isArray(internalValueRef.current)
                ? internalValueRef.current
                : [];
              const externalValue = toExternalValue([...current, convertedUser], multiple);
              (onChange as (value: unknown) => void)(externalValue);
            } else {
              const externalValue = toExternalValue(convertedUser, multiple);
              (onChange as (value: unknown) => void)(externalValue);
            }
          }
          if (!multiple) {
            pendingConvertRef.current = false;
            setOpen(false);
          }
        } catch {
          toast.error('外部用户添加失败');
        } finally {
          setConvertingSet((prev) => {
            const next = new Set(prev);
            next.delete(user.id);
            if (next.size === 0) {
              pendingConvertRef.current = false;
            }
            return next;
          });
        }
      })();
    },
    [onSelect, onChange, multiple, toExternalValue, convertingSet],
  );

  const renderTagWithLoading = useCallback(
    (
      userValue: UserSelectItemValue,
      onClose: (value: UserSelectItemValue, e: React.MouseEvent) => void,
      tagDisabled?: boolean,
    ) => (
      <UserSelectTagWrapper
        key={userValue.id}
        userValue={userValue}
        onClose={onClose}
        disabled={tagDisabled}
        isLoading={isLoading}
        accountType={accountType}
      />
    ),
    [isLoading, accountType],
  );

  return (
    <BaseCombobox
      autoFocus={autoFocus}
      className={className}
      classNames={classNames}
      debounce={300}
      open={open}
      onOpenChange={handleOpenChange}
      defaultValue={internalDefaultValue}
      disabled={disabled}
      emptyText={emptyText}
      fetchFn={fetchFn}
      getItemLabel={(userValue) => userValue.name}
      getItemValue={(userValue) => userValue}
      getOptionDisabled={mergedGetOptionDisabled}
      maxTagCount={maxTagCount}
      multiple={multiple}
      name={name}
      onBlur={onBlur}
      onChange={handleChange}
      onClear={onClear}
      onDeselect={onDeselect}
      onFocus={onFocus}
      onSelect={handleSelect}
      placeholder={placeholder}
      renderItem={(userValue, isSelected, itemClassName, itemDisabled) => (
        <UserItemWrapper
          key={userValue.id}
          userValue={userValue}
          isSelected={isSelected}
          className={itemClassName}
          disabled={itemDisabled}
          isConverting={convertingSet.has(userValue.id)}
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
      value={internalValue}
    />
  );
};

export { type UserSelectItemValue as UserValue };

export { ItemPill } from '@client/src/components/business-ui/entity-combobox/item-pill';
