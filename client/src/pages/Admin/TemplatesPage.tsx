import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@client/src/contexts/AuthContext';
import {
  adminGroupsApi,
  adminTemplatesApi,
  extractApiError,
  usersDirectoryApi,
} from '@client/src/api';
import type {
  Group,
  Template,
  UserDirectoryItem,
  VisibilityType,
} from '@shared/api.interface';
import { AppWindow, Eye, FileCode, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import AppUserSelect from '@client/src/components/AppUserSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 100;

const visibilityLabels: Record<VisibilityType, string> = {
  all: '所有人',
  group: '指定组',
  users: '指定人',
  owner: '仅负责人',
};

const TemplatesPage = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsTruncated, setGroupsTruncated] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editVisibility, setEditVisibility] = useState<VisibilityType>('all');
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [editUserIds, setEditUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isLevel1: boolean =
    user?.level === 'super_admin' || user?.level === 'level_1';

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminTemplatesApi.list({
        page: 1,
        pageSize: PAGE_SIZE,
      });
      setTemplates(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      logger.error('获取模板列表失败', err);
      toast.error(extractApiError(err, '获取模板列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 分组字典仅在挂载时请求一次
  const loadDictionaries = useCallback(async () => {
    try {
      const result = await adminGroupsApi.list({ page: 1, pageSize: PAGE_SIZE });
      setGroups(result.items);
      setGroupsTruncated(result.total > result.items.length);
    } catch (err: unknown) {
      logger.error('获取分组字典失败', err);
    }
  }, []);

  useEffect(() => {
    if (!isLevel1) return;
    void fetchTemplates();
    void loadDictionaries();
  }, [isLevel1, fetchTemplates, loadDictionaries]);

  // 可见用户姓名按 ID 批量补全，避免用 100 条字典截断
  const visibleUserKey: string = useMemo(
    () =>
      Array.from(
        new Set(
          templates.flatMap((item: Template) => item.visibleUserIds || []),
        ),
      )
        .sort()
        .join(','),
    [templates],
  );

  useEffect(() => {
    if (!visibleUserKey) return;
    let active = true;
    usersDirectoryApi
      .listByIds(visibleUserKey.split(','))
      .then((items: UserDirectoryItem[]) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const item of items) {
          map[item.id] = item.nickname;
        }
        setUserNames(map);
      })
      .catch((err: unknown) => {
        logger.error('获取可见用户姓名失败', err);
      });
    return () => {
      active = false;
    };
  }, [visibleUserKey]);

  const handleOpenVisibility = (tpl: Template) => {
    setEditingTemplate(tpl);
    setEditVisibility(tpl.visibility);
    setEditGroupIds(tpl.visibleGroupIds || []);
    setEditUserIds(tpl.visibleUserIds || []);
    setVisibilityDialogOpen(true);
  };

  const handleSaveVisibility = async () => {
    if (!editingTemplate) return;
    if (editVisibility === 'group' && editGroupIds.length === 0) {
      toast.error('请选择可见分组');
      return;
    }
    if (editVisibility === 'users' && editUserIds.length === 0) {
      toast.error('请至少选择一位可见用户');
      return;
    }
    setSubmitting(true);
    try {
      await adminTemplatesApi.updateVisibility(editingTemplate.id, {
        visibility: editVisibility,
        visibleGroupIds: editVisibility === 'group' ? editGroupIds : undefined,
        visibleUserIds: editVisibility === 'users' ? editUserIds : undefined,
      });
      toast.success('可见性已更新');
      setVisibilityDialogOpen(false);
      void fetchTemplates();
    } catch (err: unknown) {
      logger.error('更新可见性失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const getVisibilityDisplay = (tpl: Template): string => {
    if (tpl.visibility === 'all') return '所有人';
    if (tpl.visibility === 'owner') return '仅负责人';
    if (tpl.visibility === 'group') {
      const groupNames = (tpl.visibleGroupIds || [])
        .slice(0, 3)
        .map((gid: string) => groups.find((g: Group) => g.id === gid)?.name || gid);
      const extra = (tpl.visibleGroupIds?.length || 0) - 3;
      return extra > 0
        ? `指定组(${groupNames.join('、')}等${extra + 3}组)`
        : `指定组(${groupNames.join('、') || '无'})`;
    }
    if (tpl.visibility === 'users') {
      const names = (tpl.visibleUserIds || [])
        .slice(0, 5)
        .map((uid: string) => userNames[uid] || uid);
      const extra = (tpl.visibleUserIds?.length || 0) - 5;
      return extra > 0
        ? `指定人(${names.join('、')}等${extra + 5}人)`
        : `指定人(${names.join('、') || '无'})`;
    }
    return visibilityLabels[tpl.visibility];
  };

  const toggleGroupId = (gid: string) => {
    setEditGroupIds((prev: string[]) =>
      prev.includes(gid) ? prev.filter((g: string) => g !== gid) : [...prev, gid],
    );
  };

  if (!isLevel1 && user) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border p-12 bg-card text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
          <p className="text-sm text-muted-foreground">
            您没有权限访问模板管理页面，请联系一级管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          模板管理
        </h2>
        <div className="text-sm text-muted-foreground">
          仅一级管理员可管理模板
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            暂无模板
          </div>
        ) : (
          <>
            {total > templates.length && (
              <p className="text-xs text-muted-foreground px-4 py-3 border-b">
                仅显示前 {templates.length} 条，共 {total} 条
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="min-w-[160px]">名称</TableHead>
                  <TableHead className="w-24">类型</TableHead>
                  <TableHead className="min-w-[200px]">说明</TableHead>
                  <TableHead className="w-40">可见范围</TableHead>
                  <TableHead className="w-32">负责人</TableHead>
                  <TableHead className="w-28 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl: Template) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div
                        className="w-9 h-9 rounded-md flex items-center justify-center"
                        style={{
                          backgroundColor: 'hsl(187 70% 49% / 0.1)',
                          color: '#22C3D6',
                        }}
                      >
                        {tpl.type === 'app' ? (
                          <AppWindow className="w-4 h-4" />
                        ) : (
                          <FileCode className="w-4 h-4" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{tpl.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {tpl.type === 'app' ? '应用模板' : 'HTML 模板'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {tpl.description || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getVisibilityDisplay(tpl)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tpl.ownerName || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => handleOpenVisibility(tpl)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        调整范围
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* 可见性编辑 Dialog */}
      <Dialog
        open={visibilityDialogOpen}
        onOpenChange={setVisibilityDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>调整使用范围</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">模板</div>
              <div className="text-sm font-medium">{editingTemplate?.name}</div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                可见范围
              </label>
              <Select
                value={editVisibility}
                onValueChange={(value: string) =>
                  setEditVisibility(value as VisibilityType)
                }
              >
                <SelectTrigger aria-label="选择可见范围">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有人</SelectItem>
                  <SelectItem value="group">指定组</SelectItem>
                  <SelectItem value="users">指定人</SelectItem>
                  <SelectItem value="owner">仅负责人</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editVisibility === 'group' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  选择分组
                </label>
                <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                  {groups.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      暂无分组
                    </div>
                  ) : (
                    groups.map((group: Group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={editGroupIds.includes(group.id)}
                          onCheckedChange={() => toggleGroupId(group.id)}
                          aria-label={`选择分组 ${group.name}`}
                        />
                        <span className="text-sm">{group.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {groupsTruncated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    仅显示前 {groups.length} 个分组，分组较多时请联系管理员
                  </p>
                )}
              </div>
            )}

            {editVisibility === 'users' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  选择用户
                </label>
                <AppUserSelect
                  value={editUserIds}
                  onChange={setEditUserIds}
                  multiple
                  placeholder="按昵称搜索并选择可见用户"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVisibilityDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSaveVisibility} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPage;
