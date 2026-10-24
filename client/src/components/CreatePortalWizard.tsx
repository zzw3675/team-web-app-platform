import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@client/src/contexts/AuthContext';
import {
  pagesApi,
  templatesApi,
  groupsApi,
  extractApiError,
  type GroupOption,
} from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AppUserSelect } from '@client/src/components/AppUserSelect';
import { GroupMultiSelect } from '@client/src/components/GroupMultiSelect';
import {
  FileCode,
  AppWindow,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Page, Template, VisibilityType } from '@shared/api.interface';

const visibilityLabels: Record<VisibilityType, string> = {
  all: '所有人可见',
  group: '指定组可见',
  users: '指定人可见',
  owner: '仅负责人可见',
};

// 生成 ASCII slug：仅保留 [a-z0-9-]，折叠连续短横线并去除首尾短横线；
// 中文等非 ASCII 名称无法映射时回退 page-<随机短串>，避免 URL 编码字符与唯一约束冲突。
const toAsciiSlug = (input: string): string => {
  const base: string = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  if (base) return base;
  const randomPart: string = Math.random().toString(36).slice(2, 8);
  return `page-${randomPart}`;
};

interface CreatePortalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (page: Page) => void;
}

const CreatePortalWizard = ({
  open,
  onOpenChange,
  onCreated,
}: CreatePortalWizardProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // 表单数据
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('owner');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [visibleUserIds, setVisibleUserIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const result = await templatesApi.list({ page: 1, pageSize: 100 });
      const list = Array.isArray(result) ? result : result.items;
      setTemplates(list || []);
    } catch (err: unknown) {
      logger.error('获取模板列表失败', err);
      toast.error(extractApiError(err, '获取模板列表失败'));
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const list = await groupsApi.options();
      setGroups(list);
      setGroupsError('');
    } catch (err: unknown) {
      logger.error('获取分组列表失败', err);
      setGroups([]);
      setGroupsError(extractApiError(err, '加载分组列表失败，请稍后重试'));
      toast.error(extractApiError(err, '加载分组列表失败，请稍后重试'));
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedTemplate(null);
      setTitle('');
      setSlug('');
      setVisibility('owner');
      setGroupIds([]);
      setVisibleUserIds([]);
      setGroups([]);
      setGroupsError('');
      setSubmitError('');
      void loadTemplates();
    }
  }, [open, loadTemplates]);

  useEffect(() => {
    if (
      !open ||
      visibility !== 'group' ||
      groups.length > 0 ||
      groupsLoading ||
      groupsError !== ''
    ) {
      return;
    }
    void loadGroups();
  }, [open, visibility, groups.length, groupsLoading, groupsError, loadGroups]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setTitle(template.name);
    setSlug(toAsciiSlug(template.name));
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const handleClose = () => {
    if (!submitting) {
      onOpenChange(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !user) return;
    if (!title.trim()) {
      toast.error('请输入门户名称');
      return;
    }
    if (visibility === 'group' && groupIds.length === 0) {
      toast.error('请至少选择一个可见分组');
      return;
    }
    if (visibility === 'users' && visibleUserIds.length === 0) {
      toast.error('请选择可见用户');
      return;
    }
    const normalizedSlug: string = toAsciiSlug(slug);
    setSubmitError('');
    setSubmitting(true);
    try {
      const page = await pagesApi.create({
        templateId: selectedTemplate.id,
        title: title.trim(),
        slug: normalizedSlug,
        ownerId: user.id,
        visibility,
        groupId: visibility === 'group' ? groupIds[0] : undefined,
        visibleGroupIds: visibility === 'group' ? groupIds : undefined,
        visibleUserIds: visibility === 'users' ? visibleUserIds : undefined,
      });
      toast.success('门户创建成功');
      onOpenChange(false);
      onCreated?.(page);
    } catch (err: unknown) {
      logger.error('创建门户失败', err);
      const message: string = extractApiError(err, '创建门户失败');
      const isSlugConflict: boolean =
        message.includes('slug') ||
        message.includes('标识') ||
        message.includes('已存在') ||
        message.includes('重复');
      const text: string = isSlugConflict
        ? `${message}（门户标识已被占用，请换一个后重试）`
        : message;
      setSubmitError(text);
      toast.error(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 ? '选择模板' : '填写门户信息'}
            <Badge variant="outline" className="font-normal text-xs">
              {step}/2
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                暂无可用模板
              </div>
            ) : (
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(200px, 1fr))',
                }}
              >
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`text-left rounded-lg border p-4 transition-colors bg-card relative ${
                      selectedTemplate?.id === tpl.id
                        ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]'
                        : 'hover:border-[var(--primary)]'
                    }`}
                  >
                    {selectedTemplate?.id === tpl.id && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center mb-3"
                      style={{
                        backgroundColor: 'hsl(187 70% 49% / 0.1)',
                        color: '#22C3D6',
                      }}
                    >
                      {tpl.type === 'app' ? (
                        <AppWindow className="w-5 h-5" />
                      ) : (
                        <FileCode className="w-5 h-5" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{tpl.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tpl.description || '暂无说明'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">
                使用模板
              </div>
              <div className="text-sm font-medium">
                {selectedTemplate?.name}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                门户名称
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入门户名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                门户标识 (slug)
              </label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSubmitError('');
                }}
                placeholder="英文标识，用于 URL"
              />
              <p className="text-xs text-muted-foreground mt-1">
                仅支持小写字母、数字与短横线；中文名称会自动生成 page-xxxx 形式的标识
              </p>
              {submitError && (
                <p className="text-xs text-destructive mt-1" role="alert">
                  {submitError}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                负责人
              </label>
              <Input value={user?.nickname || ''} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                默认创建者为负责人，创建后可由管理员调整
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                可见性
              </label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as VisibilityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有人可见</SelectItem>
                  <SelectItem value="group">指定组可见</SelectItem>
                  <SelectItem value="users">指定人可见</SelectItem>
                  <SelectItem value="owner">仅自己可见</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {visibilityLabels[visibility]}
              </p>
            </div>
            {visibility === 'group' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  可见分组（可多选）
                </label>
                {groupsError ? (
                  <p className="text-xs text-destructive">
                    {groupsError}（如持续失败，请联系管理员为你的账号补充分组读取权限）
                  </p>
                ) : (
                  <>
                    <GroupMultiSelect
                      groups={groups}
                      value={groupIds}
                      onChange={setGroupIds}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      已选 {groupIds.length} 个分组
                    </p>
                    {!groupsLoading && groups.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        暂无可选分组
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            {visibility === 'users' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  可见用户
                </label>
                <AppUserSelect
                  multiple
                  value={visibleUserIds}
                  onChange={(next: string[]) => setVisibleUserIds(next)}
                  placeholder="搜索并选择可见用户"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  名单取自本系统已审核账号，可见性按系统用户匹配
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={step === 1 ? handleClose : handleBack}
            disabled={submitting}
          >
            {step === 2 && <ArrowLeft className="w-4 h-4 mr-2" />}
            {step === 1 ? '取消' : '上一步'}
          </Button>
          {step === 1 ? (
            <Button disabled={!selectedTemplate || templatesLoading}>
              下一步
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              确认创建
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePortalWizard;
