import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@client/src/contexts/AuthContext';
import ThemeSwitcher from '@client/src/components/ThemeSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { extractApiError } from '@client/src/api';
import { useSiteName } from '@client/src/hooks/useSiteName';
import type { LoginRequest } from '@shared/api.interface';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const siteName = useSiteName();
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = '#0A2540';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('reason') === 'account-missing') {
      toast.error('账号不存在或已被删除，请重新登录');
    }
  }, [searchParams]);

  const resolveRedirectTarget = (): string => {
    const target = searchParams.get('redirect');
    if (!target || !target.startsWith('/') || target.startsWith('//')) {
      return '/';
    }
    return target;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      await login(form);
      toast.success('登录成功');
      navigate(resolveRedirectTarget(), { replace: true });
    } catch (err) {
      toast.error(extractApiError(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#0A2540' }}
    >
      <div
        className="w-full max-w-sm rounded-lg border p-8 animate-in fade-in zoom-in-95 duration-300"
        style={{
          backgroundColor: '#ffffff',
          borderColor: 'rgba(34, 195, 214, 0.3)',
        }}
      >
        <div className="mb-8 text-center">
          <h1
            className="text-2xl font-semibold mb-2"
            style={{ color: '#0A2540' }}
          >
            欢迎回来
          </h1>
          <p className="text-sm text-muted-foreground">
            登录你的{siteName}账号
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">密码</Label>
              <Link
                to="/forgot-password"
                className="text-xs hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                忘记密码？
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="请输入密码"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          还没有账号？{' '}
          <Link to="/register" className="hover:underline font-medium" style={{ color: 'var(--primary)' }}>
            立即注册
          </Link>
        </div>
      </div>

      <ThemeSwitcher />
    </div>
  );
};

export default Login;
