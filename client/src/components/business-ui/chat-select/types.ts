import type {
  BaseEntitySelectProps,
  ItemValue,
} from '@client/src/components/business-ui/entity-combobox/shared-types';
import type { I18nText } from '@client/src/components/business-ui/entity-combobox/types';

export type { I18nText };

export type ChatInfo = {
  chatID: string;
  name: I18nText;
  avatar: string;
  isExternal?: boolean;
  userCount?: number;
};

export type Chat = ItemValue<ChatInfo>;

export type ValueType = 'string' | 'object';

export type InferValue<
  V extends ValueType,
  M extends boolean,
> = V extends 'string'
  ? M extends true
    ? string[]
    : string | null
  : M extends true
    ? Chat[]
    : Chat | null;

type ChatSelectBaseProps<
  V extends ValueType = 'string',
  M extends boolean = false,
> = Omit<
  BaseEntitySelectProps<Chat>,
  'value' | 'defaultValue' | 'onChange'
> & {
  valueType?: V;
  multiple?: M;
  value?: InferValue<V, M>;
  defaultValue?: InferValue<V, M>;
  onChange?: (value: InferValue<V, M>) => void;
};

export type ChatSelectProps =
  | ChatSelectBaseProps<'string', false>
  | ChatSelectBaseProps<'string', true>
  | ChatSelectBaseProps<'object', false>
  | ChatSelectBaseProps<'object', true>;

export type ChatSelectValue = Chat | Chat[] | string | string[] | null;
