import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@client/src/contexts/AuthContext';
import {
  adminGroupsApi,
  adminPagesApi,
  extractApiError,
  isUnauthorizedError,
} from '@client/src/api';
import type { Group, Page } from '@shared/api.interface';
import { LayoutDashboard, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import PaginationBar from '@client/src/components/PaginationBar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PagesTable, type PageRowAction } from './PagesTable';
import {
  DeleteForeverDialog,
  EditPageDialog,
  OwnerDialog,
  VisibilityDialog,
} from './PageDialogs';

type StatusFilter = 'all' | 'enabled' | 'disabled' | 'trash';

const PAGE_SIZE = 20;

const PagesPage = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsTruncated, setGroupsTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);

  const [editTarget, setEditTarget] = useState<Page | null>(null);
  const [ownerTarget, setOwnerTarget] = useState<Page | null>(null);
  const [visibilityTarget, setVisibilityTarget] = useState<Page | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  const requestIdRef = useRef(0);

  const isAdmin: boolean =
    user?.level === 'super_admin' ||
    user?.level === 'level_1' ||
    user?.level === 'level_2';

  const fetchData = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    try {
      const result = await adminPagesApi.list({
        page: pageNum,
        pageSize: PAGE_SIZE,
        keyword: debouncedKeyword,
        status,
      });
      if (requestIdRef.current !== requestId) return;
      setPages(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      if (requestIdRef.current !== requestId) return;
      if (!isUnauthorizedError(err)) {
        logger.error('获取门户列表失败', err);
        toast.error(extractApiError(err, '获取门户列表失败'));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [pageNum, debouncedKeyword, status]);

  // 分组字典仅在挂载时请求一次
  const loadDictionaries = useCallback(async () => {
    try {
      const result = await adminGroupsApi.list({ page: 1, pageSize: 100 });
      setGroups(result.items);
      setGroupsTruncated(result.total > result.items.length);
    } catch (err: unknown) {
      logger.error('获取分组字典失败', err);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadDictionaries();
  }, [isAdmin, loadDictionaries]);

  // 关键词 300ms 防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPageNum(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (!isAdmin) return;
    void fetchData();
  }, [isAdmin, fetchData]);

  const handleStatusChange = (value: string) => {
    setStatus(value as StatusFilter);
    setPageNum(1);
  };

  const performAction = async (
    target: Page,
    action: PageRowAction,
    label: string,
  ) => {
    try {
      if (action === 'disable') await adminPagesApi.disable(target.id);
      if (action === 'enable') await adminPagesApi.enable(target.id);
      if (action === 'trash') await adminPagesApi.trash(target.id);
      if (action === 'restore') await adminPagesApi.restore(target.id);
      toast.success(label);
      void fetchData();
    } catch (err: unknown) {
      logger.error(`${action}失败`, err);
      toast.error(extractApiError(err, '操作失败'));
    }
  };

  const handleDeleted = () => {
    // 删除当页最后一条时回退一页，否则原地刷新
    if (pages.length === 1 && pageNum > 1) {
      setPageNum((prev) => Math.max(1, prev - 1));
    } else {
      void fetchData();
    }
  };

  const totalPages: number = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isTrash: boolean = status === 'trash';

  if (!isAdmin && user) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border p-12 bg-card text-center">
          <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
          <p className="text-sm text-muted-foreground">
            您没有权限访问门户管理页面，请联系管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <LayoutDashboard
            className="w-5 h-5"
            style={{ color: 'var(--primary)' }}
          />
          门户管理
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索门户标题/slug"
              aria-label="搜索门户标题或 slug"
              className="pl-9"
            />
          </div>
          <Tabs
            value={status}
            onValueChange={handleStatusChange}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="enabled">启用</TabsTrigger>
              <TabsTrigger value="disabled">停用</TabsTrigger>
              <TabsTrigger value="trash">回收站</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            暂无门户
          </div>
        ) : (
          <>
            <PagesTable
              pages={pages}
              isTrash={isTrash}
              onEdit={setEditTarget}
              onOpenOwner={setOwnerTarget}
              onOpenVisibility={setVisibilityTarget}
              onAction={performAction}
              onDeleteClick={setDeleteTarget}
            />
            <PaginationBar
              page={pageNum}
              totalPages={totalPages}
              onPageChange={setPageNum}
            />
          </>
        )}
      </div>

      <EditPageDialog
        open={editTarget !== null}
        page={editTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={() => void fetchData()}
      />

      <OwnerDialog
        open={ownerTarget !== null}
        page={ownerTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setOwnerTarget(null);
        }}
        onSaved={() => void fetchData()}
      />

      <VisibilityDialog
        open={visibilityTarget !== null}
        page={visibilityTarget}
        groups={groups}
        groupsTruncated={groupsTruncated}
        onOpenChange={(open: boolean) => {
          if (!open) setVisibilityTarget(null);
        }}
        onSaved={() => void fetchData()}
      />

      <DeleteForeverDialog
        open={deleteTarget !== null}
        page={deleteTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

export default PagesPage;
