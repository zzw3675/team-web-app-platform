import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Plus,
  Inbox,
  Loader2,
  Eye,
  Edit3,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { jizhangApi, extractApiError } from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { useAuth } from '@client/src/contexts/AuthContext';
import { UserSelect } from '@/components/business-ui/user-select';
import { AppUserSelect } from '@client/src/components/AppUserSelect';
import type { AppData, ScopeType } from '@shared/api.interface';
import { scopeLabels } from '@client/src/utils/jizhang-constants';
import { isEditScopeWiderThanRead } from '@client/src/pages/Jizhang/jizhangUtils';

const JizhangProjects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [readScope, setReadScope] = useState<ScopeType>('owner');
  const [readUserIds, setReadUserIds] = useState<string[]>([]);
  const [editScope, setEditScope] = useState<ScopeType>('owner');
  const [editUserIds, setEditUserIds] = useState<string[]>([]);
  const [scopeError, setScopeError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['jizhang-projects'],
    queryFn: () => jizhangApi.listProjects({ page: 1, pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      readScope: ScopeType;
      readUserIds: string[];
      editScope: ScopeType;
      editUserIds: string[];
    }) => jizhangApi.createProject(data),
    onSuccess: () => {
      toast.success('记账本创建成功');
      setDialogOpen(false);
      setNewTitle('');
      setReadUserIds([]);
      setEditUserIds([]);
      void queryClient.invalidateQueries({ queryKey: ['jizhang-projects'] });
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err, '创建失败'));
    },
  });

  const handleCreate = () => {
    setScopeError('');
    if (!newTitle.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    if (readScope === 'users' && readUserIds.length === 0) {
      toast.error('请选择可读成员');
      return;
    }
    if (editScope === 'users' && editUserIds.length === 0) {
      toast.error('请选择可编辑成员');
      return;
    }
    if (isEditScopeWiderThanRead(readScope, editScope)) {
      setScopeError('编辑范围不能大于可读范围，请先扩大可读范围或缩小编辑范围');
      return;
    }
    createMutation.mutate({
      title: newTitle.trim(),
      readScope,
      readUserIds: readScope === 'users' ? readUserIds : [],
      editScope,
      editUserIds: editScope === 'users' ? editUserIds : [],
    });
  };

  const filtered = (data?.items ?? []).filter((p: AppData) =>
    p.title.toLowerCase().includes(keyword.toLowerCase()),
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wallet className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            我的记账本
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理你的收支记录，一目了然
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4" />
              新建记账本
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建记账本</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-title">项目名称</Label>
                <Input
                  id="project-title"
                  value={newTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
                  placeholder="例如：日常开销、旅行预算"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Eye className="w-3.5 h-3.5 inline mr-1.5" />
                  可读范围
                </Label>
                <Select
                  value={readScope}
                  onValueChange={(v: string) => {
                    setReadScope(v as ScopeType);
                    // 切换离开「指定人」时清空名单，避免残留 ID 被静默提交
                    if (v !== 'users') setReadUserIds([]);
                    setScopeError('');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">仅负责人</SelectItem>
                    <SelectItem value="group">指定组</SelectItem>
                    <SelectItem value="all">所有人</SelectItem>
                    <SelectItem value="users">指定人</SelectItem>
                  </SelectContent>
                </Select>
                {readScope === 'group' && (
                  <p className="text-xs text-muted-foreground">
                    对本分组（您所在分组）的成员可见
                  </p>
                )}
                {readScope === 'users' && (
                  <UserSelect
                    multiple
                    value={readUserIds}
                    onChange={(next: string[]) => setReadUserIds(next)}
                    placeholder="选择可读成员"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  <Edit3 className="w-3.5 h-3.5 inline mr-1.5" />
                  编辑范围
                </Label>
                <Select
                  value={editScope}
                  onValueChange={(v: string) => {
                    setEditScope(v as ScopeType);
                    // 切换离开「指定人」时清空名单，避免残留 ID 被静默提交
                    if (v !== 'users') setEditUserIds([]);
                    setScopeError('');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">仅负责人</SelectItem>
                    <SelectItem value="group">指定组</SelectItem>
                    <SelectItem value="all">所有人</SelectItem>
                    <SelectItem value="users">指定人</SelectItem>
                  </SelectContent>
                </Select>
                {editScope === 'users' && (
                  <AppUserSelect
                    value={editUserIds}
                    onChange={(next: string[]) => setEditUserIds(next)}
                    placeholder="选择可编辑成员"
                  />
                )}
                {scopeError ? (
                  <p className="text-xs text-destructive" role="alert">
                    {scopeError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    编辑范围必须小于或等于可读范围，否则保存会被拒绝
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(data?.items.length ?? 0) > 0 && (
        <div className="mb-6 max-w-md">
          <Input
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
            placeholder="搜索记账本名称..."
          />
        </div>
      )}

      {!isLoading && (data?.total ?? 0) > (data?.items.length ?? 0) && (
        <p className="text-xs text-muted-foreground mb-3">
          仅显示前 {data?.items.length ?? 0} 条，共 {data?.total ?? 0} 条
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox className="size-6" />
            </EmptyMedia>
            <EmptyTitle>暂无记账本</EmptyTitle>
            <EmptyDescription>
              {keyword
                ? '没有找到匹配的记账本'
                : '点击上方按钮创建你的第一个记账本'}
            </EmptyDescription>
          </EmptyHeader>
          {!keyword && (
            <EmptyContent>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                新建记账本
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
          data-ai-section-type="card-list"
        >
          {filtered.map((project: AppData) => (
            <button
              key={project.id}
              type="button"
              onClick={() => navigate(`/jizhang/${project.id}`)}
              className="text-left rounded-lg border bg-card p-5 hover:border-[var(--primary)] transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'hsl(221 83% 53% / 0.1)',
                    color: 'var(--primary)',
                  }}
                >
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate group-hover:text-[var(--primary)] transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    负责人：{project.ownerName || user?.nickname || '未知'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-normal gap-1">
                  <Eye className="w-3 h-3" />
                  {scopeLabels[project.readScope] || project.readScope}
                </Badge>
                <Badge variant="outline" className="font-normal gap-1">
                  <Edit3 className="w-3 h-3" />
                  {scopeLabels[project.editScope] || project.editScope}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default JizhangProjects;
