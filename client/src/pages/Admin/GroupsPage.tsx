import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@client/src/contexts/AuthContext';
import { adminGroupsApi, extractApiError } from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import AppUserSelect from '@client/src/components/AppUserSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PaginationBar from '@client/src/components/PaginationBar';
import {
  FolderKanban,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Group } from '@shared/api.interface';

interface GroupWithMemberCount extends Group {
  memberCount?: number;
}

const GroupsPage = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupWithMemberCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // 新建/编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isLevel1 =
    user?.level === 'super_admin' || user?.level === 'level_1';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminGroupsApi.list({ page, pageSize });
      setGroups(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      logger.error('获取分组列表失败', err);
      toast.error(extractApiError(err, '获取分组列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isLevel1) {
      void fetchData();
    }
  }, [fetchData, isLevel1]);

  const handleOpenCreate = () => {
    setEditing(null);
    setName('');
    setLeaderId('');
    setRemark('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (group: Group) => {
    setEditing(group);
    setName(group.name);
    setLeaderId(group.leaderId || '');
    setRemark(group.remark || '');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入分组名称');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await adminGroupsApi.update(editing.id, {
          name: name.trim(),
          leaderId: leaderId || undefined,
          remark: remark.trim() || undefined,
        });
        toast.success('分组已更新');
      } else {
        await adminGroupsApi.create({
          name: name.trim(),
          leaderId: leaderId || undefined,
          remark: remark.trim() || undefined,
        });
        toast.success('分组已创建');
      }
      setDialogOpen(false);
      void fetchData();
    } catch (err: unknown) {
      logger.error('保存分组失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminGroupsApi.remove(deleteTarget.id);
      toast.success('分组已删除');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      void fetchData();
    } catch (err: unknown) {
      logger.error('删除分组失败', err);
      toast.error(extractApiError(err, '删除失败'));
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!isLevel1 && user) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border p-12 bg-card text-center">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
          <p className="text-sm text-muted-foreground">
            您没有权限访问分组管理页面，请联系一级管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FolderKanban
            className="w-5 h-5"
            style={{ color: 'var(--primary)' }}
          />
          分组管理
        </h2>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" />
          新建分组
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            暂无分组，点击右上角新建
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>组长</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-24">成员数</TableHead>
                  <TableHead className="w-32 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-sm">
                      {group.leaderName || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {group.remark || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {group.memberCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenEdit(group)}
                          aria-label="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => {
                            setDeleteTarget(group);
                            setDeleteDialogOpen(true);
                          }}
                          aria-label="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* 新建/编辑 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑分组' : '新建分组'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                分组名称
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入分组名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                组长（可选）
              </label>
              <AppUserSelect
                value={leaderId ? [leaderId] : []}
                onChange={(ids: string[]) => setLeaderId(ids[0] ?? '')}
                multiple={false}
                placeholder="按昵称搜索并选择组长"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">备注</label>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="选填"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除分组</DialogTitle>
            <DialogDescription>
              删除后无法恢复，确定要删除分组「{deleteTarget?.name}」吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsPage;
