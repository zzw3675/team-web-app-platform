import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@client/src/contexts/AuthContext';
import { adminSettingsApi, extractApiError } from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Settings, Save, Loader2 } from 'lucide-react';
import EmailSettingsCard from './EmailSettingsCard';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

const SettingsPage = () => {
  const { user } = useAuth();
  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLevel1 =
    user?.level === 'super_admin' || user?.level === 'level_1';

  const fetchSiteName = useCallback(async () => {
    setLoading(true);
    try {
      const name = await adminSettingsApi.getSiteName();
      setSiteName(name);
    } catch (err: unknown) {
      logger.error('获取站点名称失败', err);
      toast.error(extractApiError(err, '获取数据失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLevel1) {
      void fetchSiteName();
    }
  }, [fetchSiteName, isLevel1]);

  const handleSave = async () => {
    if (!siteName.trim()) {
      toast.error('请输入平台名称');
      return;
    }
    setSaving(true);
    try {
      await adminSettingsApi.updateSiteName(siteName.trim());
      toast.success('保存成功');
    } catch (err: unknown) {
      logger.error('保存失败', err);
      toast.error(extractApiError(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  if (!isLevel1 && user) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border p-12 bg-card text-center">
          <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
          <p className="text-sm text-muted-foreground">
            您没有权限访问站点设置页面，请联系一级管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        站点设置
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>平台名称</CardTitle>
          <CardDescription>
            设置显示在侧边栏、登录页等位置的平台名称
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  平台名称
                </label>
                <Input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="请输入平台名称"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <Save className="w-4 h-4 mr-2" />
                  保存更改
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EmailSettingsCard />
    </div>
  );
};

export default SettingsPage;
