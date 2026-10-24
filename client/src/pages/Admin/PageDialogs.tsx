import { useEffect, useState } from 'react';

import {
  adminPagesApi,
  extractApiError,
} from '@client/src/api';
import type { Group, Page, VisibilityType } from '@shared/api.interface';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import AppUserSelect from '@client/src/components/AppUserSelect';
import { GroupMultiSelect } from '@client/src/components/GroupMultiSelect';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditPageDialogProps {
  open: boolean;
  page: Page | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditPageDialog = ({
  open,
  page,
  onOpenChange,
  onSaved,
}: EditPageDialogProps) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !page) return;
    setTitle(page.title);
    setIcon(page.icon || '');
    setSortOrder(page.sortOrder || 0);
  }, [open, page]);

  const handleSubmit = async () => {
    if (!page) return;
    if (!title.trim()) {
      toast.error('请输入门户标题');
      return;
    }
    setSubmitting(true);
    try {
      await adminPagesApi.update(page.id, {
        title: title.trim(),
        // 传 null 才能真正清空图标（undefined 会被 JSON 序列化丢弃）
        icon: icon.trim() ? icon.trim() : null,
        sortOrder,
      });
      toast.success('已更新');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      logger.error('更新门户失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑门户</DialogTitle>
          <DialogDescription>
            留空图标并保存即可清除该门户的图标
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">标题</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="请输入门户标题"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              图标（图标名，可选）
            </label>
            <Input
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              placeholder="例如: Home"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">排序</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface OwnerDialogProps {
  open: boolean;
  page: Page | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const OwnerDialog = ({
  open,
  page,
  onOpenChange,
  onSaved,
}: OwnerDialogProps) => {
  const [ownerId, setOwnerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !page) return;
    setOwnerId(page.ownerId || '');
  }, [open, page]);

  const handleSubmit = async () => {
    if (!page) return;
    if (!ownerId) {
      toast.error('请选择新的负责人');
      return;
    }
    setSubmitting(true);
    try {
      await adminPagesApi.updateOwner(page.id, ownerId);
      toast.success('负责人已更新');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      logger.error('更新负责人失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改负责人</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">门户</div>
            <div className="text-sm font-medium">{page?.title}</div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">新负责人</label>
            <AppUserSelect
              value={ownerId ? [ownerId] : []}
              onChange={(ids: string[]) => setOwnerId(ids[0] ?? '')}
              multiple={false}
              placeholder="按昵称搜索并选择负责人"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !ownerId}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface VisibilityDialogProps {
  open: boolean;
  page: Page | null;
  groups: Group[];
  groupsTruncated: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const VisibilityDialog = ({
  open,
  page,
  groups,
  groupsTruncated,
  onOpenChange,
  onSaved,
}: VisibilityDialogProps) => {
  const [visibility, setVisibility] = useState<VisibilityType>('all');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [visibleUserIds, setVisibleUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !page) return;
    setVisibility(page.visibility);
    const initialGroupIds: string[] =
      page.visibleGroupIds && page.visibleGroupIds.length > 0
        ? page.visibleGroupIds
        : page.groupId
          ? [page.groupId]
          : [];
    setGroupIds(initialGroupIds);
    setVisibleUserIds(page.visibleUserIds || []);
  }, [open, page]);

  const handleSubmit = async () => {
    if (!page) return;
    if (visibility === 'group' && groupIds.length === 0) {
      toast.error('请至少选择一个可见分组');
      return;
    }
    if (visibility === 'users' && visibleUserIds.length === 0) {
      toast.error('请至少选择一位可见用户');
      return;
    }
    setSubmitting(true);
    try {
      await adminPagesApi.updateVisibility(page.id, {
        visibility,
        visibleGroupIds: visibility === 'group' ? groupIds : undefined,
        visibleUserIds: visibility === 'users' ? visibleUserIds : undefined,
      });
      toast.success('权限已更新');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      logger.error('更新权限失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>修改可见性</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">门户</div>
            <div className="text-sm font-medium">{page?.title}</div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">可见范围</label>
            <Select
              value={visibility}
              onValueChange={(value: string) =>
                setVisibility(value as VisibilityType)
              }
            >
              <SelectTrigger aria-label="选择可见范围">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有人可见</SelectItem>
                <SelectItem value="group">指定组可见</SelectItem>
                <SelectItem value="users">指定人可见</SelectItem>
                <SelectItem value="owner">仅负责人可见</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === 'group' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                可见分组（可多选）
              </label>
              <GroupMultiSelect
                groups={groups}
                value={groupIds}
                onChange={setGroupIds}
              />
              <p className="text-xs text-muted-foreground mt-1">
                已选 {groupIds.length} 个分组，草稿页默认选中门户归属分组
              </p>
              {groupsTruncated && (
                <p className="text-xs text-muted-foreground mt-1">
                  仅显示前 {groups.length} 个分组，分组较多时请联系管理员
                </p>
              )}
            </div>
          )}

          {visibility === 'users' && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                可见用户
              </label>
              <AppUserSelect
                value={visibleUserIds}
                onChange={setVisibleUserIds}
                multiple
                placeholder="按昵称搜索并选择可见用户"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DeleteForeverDialogProps {
  open: boolean;
  page: Page | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export const DeleteForeverDialog = ({
  open,
  page,
  onOpenChange,
  onDeleted,
}: DeleteForeverDialogProps) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!page) return;
    setSubmitting(true);
    try {
      await adminPagesApi.deleteForever(page.id);
      toast.success('已彻底删除');
      onOpenChange(false);
      onDeleted();
    } catch (err: unknown) {
      logger.error('删除门户失败', err);
      toast.error(extractApiError(err, '删除失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            彻底删除
          </DialogTitle>
          <DialogDescription>
            此操作不可恢复，确定要彻底删除「{page?.title}」吗？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
