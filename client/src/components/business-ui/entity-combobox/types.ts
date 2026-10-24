import type { ReactNode } from 'react';

import type {
  ClassNamesConfig,
  ComboboxSize,
  ItemValue,
  PopoverSlotProps,
  TriggerRenderProps,
  TriggerType,
} from '@client/src/components/business-ui/entity-combobox/shared-types';

export type {
  ItemValue,
  TriggerType,
  TriggerRenderProps,
  ClassNamesConfig,
  PopoverSlotProps,
  ComboboxSize,
};

export type EntityComboboxProps<
  T = unknown,
  TRaw = unknown,
  TValue extends ItemValue<TRaw> = ItemValue<TRaw>,
> = {
  size?: ComboboxSize;
  fetchFn: (search: string) => Promise<{ items: T[] }>;
  multiple?: boolean;
  value?: TValue | TValue[] | null;
  defaultValue?: TValue | TValue[] | null;
  onChange?: (value: TValue | TValue[] | null) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  pageSize?: number;
  debounce?: number;
  disabled?: boolean;
  onSelect?: (value: TValue) => void;
  onDeselect?: (value: TValue) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  children: ReactNode;
  getItemValue: (item: T) => TValue;
};

export type EntityComboboxContextValue<
  T = unknown,
  TRaw = unknown,
  TValue extends ItemValue<TRaw> = ItemValue<TRaw>,
> = {
  open: boolean;
  setOpen: (open: boolean) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedValue: TValue | TValue[] | null;
  debouncedSearch: string;
  handleSelect: (value: TValue) => void;
  handleDeselect: (value: TValue) => void;
  handleClear: () => void;
  data: T[];
  isFetching: boolean;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  multiple: boolean;
  disabled: boolean;
  size: ComboboxSize;
  isSuccess?: boolean;
  fetchStatus?: string;
  isPlaceholderData?: boolean;
  getItemValue: (item: T) => TValue;
};

export type BaseComboboxProps<
  T = unknown,
  TRaw = unknown,
  TValue extends ItemValue<TRaw> = ItemValue<TRaw>,
> = {
  size?: ComboboxSize;
  fetchFn: (search: string) => Promise<{ items: T[] }>;
  triggerType?: TriggerType;
  renderTrigger?: (props: TriggerRenderProps<TRaw>) => ReactNode;
  multiple?: boolean;
  value?: TValue | TValue[] | null;
  defaultValue?: TValue | TValue[] | null;
  onChange?: (value: TValue | TValue[] | null) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  debounce?: number;
  disabled?: boolean;
  showSearch?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  name?: string;
  renderItem: (
    item: T,
    isSelected: boolean,
    className?: string,
    disabled?: boolean,
  ) => ReactNode;
  renderTag?: (
    value: TValue,
    onClose: (value: TValue, e: React.MouseEvent) => void,
    disabled?: boolean,
  ) => ReactNode;
  getOptionDisabled?: (value: TValue) => boolean;
  getItemLabel?: (item: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  className?: string;
  classNames?: ClassNamesConfig;
  tagClosable?: boolean;
  maxTagCount?: number | 'responsive';
  maxTagTextLength?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  onSelect?: (value: TValue) => void;
  onDeselect?: (value: TValue) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  getItemValue?: (item: T) => TValue;
  slotProps?: PopoverSlotProps;
  children?: ReactNode;
};

export type PopoverWrapperProps<
  T = unknown,
  TRaw = unknown,
  TValue extends ItemValue<TRaw> = ItemValue<TRaw>,
> = {
  size?: ComboboxSize;
  triggerType?: TriggerType;
  renderTrigger?: (props: TriggerRenderProps<TRaw>) => ReactNode;
  placeholder?: string;
  maxTagCount?: number | 'responsive';
  maxTagTextLength?: number;
  tagClosable?: boolean;
  className?: string;
  classNames?: ClassNamesConfig;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  showSearch?: boolean;
  searchPlaceholder?: string;
  renderItem: (
    item: T,
    isSelected: boolean,
    className?: string,
    disabled?: boolean,
  ) => ReactNode;
  renderTag?: (
    value: TValue,
    onClose: (value: TValue, e: React.MouseEvent) => void,
    disabled?: boolean,
  ) => ReactNode;
  getItemValue: (item: T) => TValue;
  getOptionDisabled?: (value: TValue) => boolean;
  emptyText?: string;
  loadingText?: string;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  slotProps?: PopoverSlotProps;
  children?: ReactNode;
};

export type I18nText = {
  zh_cn: string;
  en_us?: string;
  ja_jp?: string;
};
