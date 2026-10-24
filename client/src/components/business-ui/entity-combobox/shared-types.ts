import type { FocusEvent, ReactNode } from 'react';

import { PopoverContent } from '@client/src/components/ui/popover';

export type { ComboboxSize } from '@client/src/components/business-ui/entity-combobox/size-variants';

export type ItemValue<TRaw = unknown> = {
  id: string;
  name: string;
  avatar?: string;
  raw?: TRaw;
};

export type TriggerType = 'button' | 'search' | 'custom';

export type TriggerRenderProps<TRaw = unknown> = {
  selectedValue: ItemValue<TRaw> | ItemValue<TRaw>[] | null;
  multiple: boolean;
  open: boolean;
  disabled: boolean;
};

export type ClassNamesConfig = {
  root?: string;
  trigger?: string;
  popover?: string;
  search?: string;
  list?: string;
  listItem?: string;
  tag?: string;
  empty?: string;
  error?: string;
  loading?: string;
  clear?: string;
  suffix?: string;
};

export type PopoverSlotProps = {
  popover?: React.ComponentProps<typeof PopoverContent>;
};

export type BaseEntitySelectProps<TValue = ItemValue<unknown>> = {
  size?: 'medium' | 'small' | 'xs';
  triggerType?: TriggerType;
  renderTrigger?: (props: TriggerRenderProps<unknown>) => ReactNode;
  multiple?: boolean;
  value?: TValue | TValue[] | null;
  defaultValue?: TValue | TValue[] | null;
  onChange?: (value: TValue | TValue[] | null) => void;
  defaultOpen?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  classNames?: ClassNamesConfig;
  placeholder?: string;
  emptyText?: string;
  tagClosable?: boolean;
  maxTagCount?: number | 'responsive';
  getOptionDisabled?: (value: TValue) => boolean;
  onSelect?: (value: TValue) => void;
  onDeselect?: (value: TValue) => void;
  onClear?: () => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  slotProps?: PopoverSlotProps;
};

export type ComboboxConfigProps = {
  pageSize?: number;
  debounce?: number;
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  showSearch?: boolean;
  required?: boolean;
  name?: string;
};

export type ComboboxStyleProps = {
  className?: string;
  popoverClassName?: string;
  classNames?: ClassNamesConfig;
};

export type ComboboxPlaceholderProps = {
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
};

export type ComboboxTagProps = {
  tagClosable?: boolean;
  maxTagCount?: number | 'responsive';
  maxTagTextLength?: number;
};

export type ComboboxPopoverProps = {
  placement?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
};

export type ComboboxCallbackProps<TRaw = unknown> = {
  onSelect?: (value: ItemValue<TRaw>) => void;
  onDeselect?: (value: ItemValue<TRaw>) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
};
