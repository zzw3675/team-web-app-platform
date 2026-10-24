// client/src/types/user.ts

import type { I18nText } from '@/components/business-ui/entity-combobox/types';
import type { Department } from '@/components/business-ui/department-select/types';

export type { I18nText, Department };

export type UserType = '_employee' | '_externalUser' | '_anonymousUser';

export interface User {
  user_id?: string;
  larkUserId?: string;
  name?: I18nText | string;
  avatar?: string;
  email?: string;
  user_type?: UserType;
  department?: Department;
  tenantName?: string;
  status?: number;
}

export type UserInput =
  | User
  | {
      user_id?: string;
      userId?: string;
      larkUserId?: string;
      name?: I18nText | string;
      avatar?: string;
      email?: string;
      user_type?: UserType;
      userType?: UserType;
      department?: Department | any;
      status?: number;
    };
