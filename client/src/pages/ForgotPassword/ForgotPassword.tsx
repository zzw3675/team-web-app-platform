import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { authApi, extractApiError } from '@client/src/api';
import ThemeSwitcher from '@client/src/components/ThemeSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = '#0A2540';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleSendEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      toast.error('请输入邮箱');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(extractApiError(err, '发送失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !newPassword) {
      toast.error('请输入新密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPasswordConfirm({ token, newPassword });
      setDone(true);
      toast.success('密码重置成功');
    } catch (err) {
      toast.error(extractApiError(err, '重置失败'));
    } finally {
      setLoading(false);
    }
  };

  const isResetForm = !!token && !done;

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
            {done ? '重置成功' : isResetForm ? '重置密码' : '找回密码'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {done
              ? '您的密码已成功重置'
              : isResetForm
              ? '请输入新密码'
              : '输入您的邮箱，我们将发送重置链接'}
          </p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="mb-4 text-success">
              <Mail className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              密码已重置，请使用新密码登录
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              去登录
            </Button>
          </div>
        ) : sent ? (
          <div className="text-center">
            <div className="mb-4 text-primary">
              <Mail className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              如果该邮箱已注册，重置链接将在几分钟内发送到您的邮箱
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login">返回登录</Link>
            </Button>
          </div>
        ) : isResetForm ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? '提交中...' : '重置密码'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? '发送中...' : '发送重置链接'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="hover:underline font-medium" style={{ color: 'var(--primary)' }}>
            ← 返回登录
          </Link>
        </div>
      </div>

      <ThemeSwitcher />
    </div>
  );
};

export default ForgotPassword;
