import { createContext, useContext } from 'react';
import type {
  LoginRequest,
  LoginResponse,
  User,
} from '@shared/api.interface';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  /** 有 token 但资料加载失败（非 401）时的错误文案，用于区分「未登录」与「瞬时故障」 */
  authError: string | null;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
