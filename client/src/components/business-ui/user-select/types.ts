import type {
  BaseEntitySelectProps,
  ItemValue,
} from '@client/src/components/business-ui/entity-combobox/shared-types';
import type { User, I18nText, UserType, Department } from '@client/src/components/business-ui/types/user';

export type { AccountType } from '@lark-apaas/client-toolkit/tools/services';
import type { AccountType } from '@lark-apaas/client-toolkit/tools/services';

export type { User, I18nText, UserType, Department };

export type ValueType = 'string' | 'object';

export type SearchAvatar = {
  avatar: {
    image: {
      large: string;
    };
  };
};

export type UserSelectItemValue = ItemValue<User>;

export type InferValue<
  V extends ValueType,
  M extends boolean,
> = V extends 'string'
  ? M extends true
    ? string[]
    : string | null
  : M extends true
    ? User[]
    : User | null;

type UserSelectBaseProps<
  V extends ValueType = 'string',
  M extends boolean = false,
> = Omit<
  BaseEntitySelectProps<UserSelectItemValue>,
  'value' | 'defaultValue' | 'onChange'
> & {
  valueType?: V;
  multiple?: M;
  accountType?: AccountType;
  value?: InferValue<V, M>;
  defaultValue?: InferValue<V, M>;
  onChange?: (value: InferValue<V, M>) => void;
};

export type UserSelectProps =
  | UserSelectBaseProps<'string', false>
  | UserSelectBaseProps<'string', true>
  | UserSelectBaseProps<'object', false>
  | UserSelectBaseProps<'object', true>;

export type UserSelectValue =
  | User
  | User[]
  | string
  | string[]
  | null;
