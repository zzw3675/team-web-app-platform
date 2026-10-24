import { useState, useEffect, useCallback } from 'react';
import { adminEmailApi, extractApiError } from '@client/src/api';
import type { SmtpConfigResponse } from '@shared/api.interface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Mail, Save, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

const EmailSettingsCard = () => {
  const [config, setConfig] = useState<SmtpConfigResponse | null>(null);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('465');
  const [secure, setSecure] = useState(true);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [fromName, setFromName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [hasPass, setHasPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data: SmtpConfigResponse = await adminEmailApi.getConfig();
      setConfig(data);
      setHost(data.host);
      setPort(String(data.port));
      setSecure(data.secure);
      setUser(data.user);
      setPass('');
      setFromName(data.fromName);
      setSiteUrl(data.siteUrl);
      setHasPass(data.hasPass);
    } catch (err: unknown) {
      logger.error('获取邮箱配置失败', err);
      toast.error(extractApiError(err, '获取数据失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!host.trim() || !user.trim()) {
      toast.error('请填写 SMTP 服务器和发件邮箱');
      return;
    }
    if (!hasPass && !pass.trim()) {
      toast.error('请填写发件授权码');
      return;
    }
    setSaving(true);
    try {
      const data = await adminEmailApi.updateConfig({
        host: host.trim(),
        port: Number(port) || 465,
        secure,
        user: user.trim(),
        pass: pass.trim() || undefined,
        fromName: fromName.trim() || undefined,
        siteUrl: siteUrl.trim() || undefined,
      });
      setHasPass(data.hasPass);
      setPass('');
      toast.success('邮箱配置已保存');
    } catch (err: unknown) {
      logger.error('保存邮箱配置失败', err);
      toast.error(extractApiError(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testTo.trim()) {
      toast.error('请输入收件邮箱');
      return;
    }
    setTesting(true);
    try {
      await adminEmailApi.sendTest({ to: testTo.trim() });
      toast.success('测试邮件已发送，请查收');
      setTestOpen(false);
      setTestTo('');
    } catch (err: unknown) {
      logger.error('测试邮件发送失败', err);
      toast.error(extractApiError(err, '发送失败'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>发件邮箱（SMTP）</CardTitle>
        <CardDescription>
          配置后系统可通过该邮箱向站外发送邮件，例如找回密码的重置链接。163
          邮箱需在邮箱设置中开启 SMTP 并使用授权码（不是登录密码）
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-host">SMTP 服务器</Label>
                <Input
                  id="smtp-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.163.com"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="smtp-port">端口</Label>
                <Input
                  id="smtp-port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="465"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="smtp-secure">SSL 加密</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  163 邮箱使用 465 端口时开启，25 端口时关闭
                </p>
              </div>
              <Switch
                id="smtp-secure"
                checked={secure}
                onCheckedChange={(checked: boolean) => setSecure(checked)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-user">发件邮箱</Label>
                <Input
                  id="smtp-user"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="example@163.com"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="smtp-pass">授权码</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder={hasPass ? '已保存，留空则不修改' : '请输入授权码'}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-from-name">发件人名称（可选）</Label>
                <Input
                  id="smtp-from-name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="应用管理平台"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="smtp-site-url">站点公开地址（可选）</Label>
                <Input
                  id="smtp-site-url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="用于拼接找回密码链接"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                保存配置
              </Button>
              <Button
                variant="outline"
                disabled={saving || testing}
                onClick={() => setTestOpen(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                发送测试邮件
              </Button>
            </div>
          </div>
        )}

        <Dialog open={testOpen} onOpenChange={setTestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>发送测试邮件</DialogTitle>
              <DialogDescription>
                将使用当前保存的 SMTP
                配置发送一封测试邮件，请先保存配置再测试
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="test-to">收件邮箱</Label>
              <Input
                id="test-to"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="example@163.com"
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSendTest} disabled={testing}>
                {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Mail className="w-4 h-4 mr-2" />
                发送
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default EmailSettingsCard;
