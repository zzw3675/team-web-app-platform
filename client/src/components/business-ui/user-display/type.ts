import type { AccountType } from '@lark-apaas/client-toolkit/tools/services';
import type { UserInput } from '@client/src/components/business-ui/types/user';

export interface UserWithAvatarProps {
  data: UserInput;
  size?: 'small' | 'medium' | 'large';
  mode?: 'tag' | 'plain';
  className?: string;
  showLabel?: boolean;
  accountType?: AccountType;
}
