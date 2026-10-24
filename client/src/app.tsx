import React, { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from '@client/src/contexts/AuthContext';
import { ThemeProvider } from '@client/src/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import Layout from './components/Layout';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import Home from './pages/Home/Home';
import AdminLayout from './pages/Admin/AdminLayout';
import UsersPage from './pages/Admin/UsersPage';
import GroupsPage from './pages/Admin/GroupsPage';
import TemplatesPage from './pages/Admin/TemplatesPage';
import PagesPage from './pages/Admin/PagesPage';
import AuditLogsPage from './pages/Admin/AuditLogsPage';
import SettingsPage from './pages/Admin/SettingsPage';
import NotFound from './pages/NotFound/NotFound';
import JizhangProjects from './pages/Jizhang/JizhangProjects';
import JizhangDetail from './pages/Jizhang/JizhangDetail';
import HistoryPage from './pages/History/HistoryPage';
import PortalPage from './pages/Portal/PortalPage';
import type { UserLevel } from '@shared/api.interface';

const isAdmin = (level: UserLevel): boolean =>
  level === 'super_admin' || level === 'level_1' || level === 'level_2';

// 受保护的路由：未登录跳登录页；已登录但资料加载失败（非 401）展示错误态 + 重试
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, token, authError, refreshProfile, logout } =
    useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !token) {
      navigate('/login', { replace: true });
    }
  }, [loading, token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 有 token 但拿不到用户资料：保留登录态，给重试入口，不跳登录页
  if (token && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div
          role="alert"
          className="w-full max-w-sm rounded-lg border bg-card p-6 text-center"
        >
          <AlertCircle className="w-6 h-6 mx-auto text-destructive" />
          <h2 className="mt-3 text-base font-medium">无法确认登录状态</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {authError ?? '账号资料加载失败，请重试'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button onClick={() => void refreshProfile()}>重试</Button>
            <Button
              variant="outline"
              onClick={() => {
                void logout().then(() => navigate('/login', { replace: true }));
              }}
            >
              重新登录
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

// 仅认证页路由（登录/注册/找回密码）：已登录跳首页
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A2540' }}>
        <div className="text-white/60">加载中...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

// 管理入口角色守卫：未登录跳登录页（由外层 ProtectedRoute 处理），已登录非管理员重定向首页并提示
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [notified, setNotified] = useState(false);

  const allowed: boolean = !!user && isAdmin(user.level);

  useEffect(() => {
    if (loading || !isAuthenticated || allowed) return;
    if (!notified) {
      toast.error('你没有管理中心访问权限，已返回首页');
      setNotified(true);
    }
    navigate('/', { replace: true });
  }, [allowed, isAuthenticated, loading, navigate, notified]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RoutesComponent = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthRoute>
                <Login />
              </AuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRoute>
                <Register />
              </AuthRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AuthRoute>
                <ForgotPassword />
              </AuthRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="pages" replace />} />
              <Route path="pages" element={<PagesPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="jizhang" element={<JizhangProjects />} />
            <Route path="jizhang/:projectId" element={<JizhangDetail />} />
            <Route path="history/:projectId" element={<HistoryPage />} />
            <Route path="portal/:slug" element={<PortalPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default RoutesComponent;
