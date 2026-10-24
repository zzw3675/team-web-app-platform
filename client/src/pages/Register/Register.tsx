import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi, extractApiError } from '@client/src/api';
import ThemeSwitcher from '@client/src/components/ThemeSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { RegisterRequest } from '@shared/api.interface';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterRequest & { confirmPassword: string }>({
    email: '',
    password: '',
    nickname: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = '#0A2540';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.email || !form.nickname || !form.password) {
      toast.error('请填写完整信息');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (form.password.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        nickname: form.nickname,
      });
      toast.success('注册成功，等待管理员审核');
      navigate('/login');
    } catch (err) {
      toast.error(extractApiError(err, '注册失败'));
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
            创建账号
          </h1>
          <p className="text-sm text-muted-foreground">
            注册后需要管理员审核才能使用
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
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              type="text"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              placeholder="请输入昵称"
              autoComplete="nickname"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="至少 6 位"
                autoComplete="new-password"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              placeholder="再次输入密码"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '注册中...' : '注册'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          已有账号？{' '}
          <Link
            to="/login"
            className="hover:underline font-medium"
            style={{ color: 'var(--primary)' }}
          >
            去登录
          </Link>
        </div>
      </div>

      <ThemeSwitcher />
    </div>
  );
};

export default Register;
