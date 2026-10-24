import React, { useCallback, useEffect, useState } from 'react';
import type {
  LoginRequest,
  LoginResponse,
  User,
} from '@shared/api.interface';
import { authApi, isUnauthorizedError } from '@client/src/api';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

export { useAuth } from './auth-context';

const TOKEN_KEY = 'auth_token';
const PROFILE_LOAD_ERROR = '账号资料加载失败，请检查网络或稍后重试';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // 拉取用户资料：仅 401 视为 token 失效；其余失败（后端重启 502 / 网络抖动）
  // 保留 token，只记录错误文案，交由 ProtectedRoute 展示错误态而不是踢回登录页。
  const loadProfile = useCallback(async (): Promise<void> => {
    setAuthError(null);
    try {
      const profile: User = await authApi.getProfile();
      setUser(profile);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        return;
      }
      setUser(null);
      setAuthError(PROFILE_LOAD_ERROR);
    }
  }, []);

  // 初始化：从 localStorage 读 token 并拉取用户信息
  useEffect(() => {
    const init = async (): Promise<void> => {
      const savedToken: string | null = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setLoading(false);
        return;
      }
      setToken(savedToken);
      await loadProfile();
      setLoading(false);
    };
    void init();
  }, [loadProfile]);

  const login = useCallback(
    async (data: LoginRequest): Promise<LoginResponse> => {
      const result = await authApi.login(data);
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(result.user);
      setAuthError(null);
      return result;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    await loadProfile();
    setLoading(false);
  }, [token, loadProfile]);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    authError,
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
