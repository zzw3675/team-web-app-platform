import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@client/src/contexts/AuthContext';
import {
  adminGroupsApi,
  adminUsersApi,
  extractApiError,
  type UserGroupCount,
} from '@client/src/api';
import type {
  CreateUserRequest,
  Group,
  User,
  UserLevel,
} from '@shared/api.interface';
import { Loader2, Shield, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import PaginationBar from '@client/src/components/PaginationBar';
import { Button } from '@/components/ui/button';
import {
  ApproveUserDialog,
  DeleteUserDialog,
  ResetPasswordResultDialog,
} from './UserDialogs';
import { UsersFilters, UsersOverview } from './UsersFilters';
import { CreateUserDialog } from './CreateUserDialog';
import { UsersTable } from './UsersTable';
import { OrganizationPanel } from './OrganizationPanel';
import {
  ALL_VALUE,
  NO_GROUP_VALUE,
  type LevelFilter,
  type UserStatusFilter,
} from './userShared';

const PAGE_SIZE = 50;

const UsersPage = () => {
  const { user } = useAuth();
  const isLevel1: boolean =
    user?.level === 'super_admin' || user?.level === 'level_1';

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // 筛选条件（全部走服务端筛选，覆盖所有分页）
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [groupFilter, setGroupFilter] = useState<string>(ALL_VALUE);

  // 字典（仅挂载时与分组变动后加载）
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<UserGroupCount[] | null>(null);
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<User | null>(null);
  const [approveLevel, setApproveLevel] = useState<UserLevel>('level_3');
  const [approveGroupId, setApproveGroupId] = useState('');

  const [resetResultDialogOpen, setResetResultDialogOpen] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetTargetName, setResetTargetName] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'org'>('list');
  const [orgRefresh, setOrgRefresh] = useState(0);

  const requestIdRef = useRef(0);

  const fetchUsers = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    const params: {
      page: number;
      pageSize: number;
      keyword?: string;
      approved?: boolean;
      level?: string;
      groupId?: string;
    } = { page, pageSize: PAGE_SIZE };
    if (debouncedKeyword.trim()) params.keyword = debouncedKeyword.trim();
    if (statusFilter !== 'all') params.approved = statusFilter === 'approved';
    if (levelFilter !== 'all') params.level = levelFilter;
    if (groupFilter !== ALL_VALUE) params.groupId = groupFilter;

    try {
      const result = await adminUsersApi.list(params);
      if (requestIdRef.current !== requestId) return;
      setUsers(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      if (requestIdRef.current !== requestId) return;
      logger.error('获取用户列表失败', err);
      toast.error(extractApiError(err, '获取用户列表失败'));
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [page, debouncedKeyword, statusFilter, levelFilter, groupFilter]);

  const loadDictionaries = useCallback(async () => {
    const [groupsRes, countsRes, pendingRes] = await Promise.allSettled([
      adminGroupsApi.listAll(),
      adminUsersApi.listGroupCounts(),
      adminUsersApi.list({ page: 1, pageSize: 1, approved: false }),
    ]);
    if (groupsRes.status === 'fulfilled') {
      setGroups(groupsRes.value);
    } else {
      logger.error('获取分组字典失败', groupsRes.reason);
    }
    if (countsRes.status === 'fulfilled') {
      setGroupCounts(countsRes.value);
    } else {
      setGroupCounts(null);
      logger.error('获取分组人数失败', countsRes.reason);
    }
    if (pendingRes.status === 'fulfilled') {
      setPendingTotal(pendingRes.value.total);
    } else {
      setPendingTotal(null);
      logger.error('获取待审核人数失败', pendingRes.reason);
    }
  }, []);

  useEffect(() => {
    if (!isLevel1) return;
    void loadDictionaries();
  }, [isLevel1, loadDictionaries]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (!isLevel1) return;
    void fetchUsers();
  }, [isLevel1, fetchUsers]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchUsers(), loadDictionaries()]);
    setOrgRefresh((prev: number) => prev + 1);
  }, [fetchUsers, loadDictionaries]);

  const resetFilters = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setStatusFilter('all');
    setLevelFilter('all');
    setGroupFilter(ALL_VALUE);
    setPage(1);
  };

  const handleSelectStatus = (status: UserStatusFilter) => {
    setStatusFilter((prev) => (prev === status ? 'all' : status));
    setPage(1);
  };

  const handleSelectGroup = (groupId: string) => {
    setGroupFilter((prev) => (prev === groupId ? ALL_VALUE : groupId));
    setPage(1);
  };

  const handleOpenApprove = (target: User) => {
    setApproveTarget(target);
    setApproveLevel('level_3');
    setApproveGroupId('');
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(approveTarget.id);
    try {
      await adminUsersApi.approve(approveTarget.id, {
        level: approveLevel,
        groupId: approveGroupId || null,
      });
      toast.success('已通过审核');
      setApproveDialogOpen(false);
      setApproveTarget(null);
      await refreshAll();
    } catch (err: unknown) {
      logger.error('审核失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await adminUsersApi.reject(id);
      toast.success('已拒绝审核');
      await refreshAll();
    } catch (err: unknown) {
      logger.error('拒绝失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (target: User) => {
    setActionLoading(target.id);
    try {
      const result = await adminUsersApi.resetPassword(target.id);
      setResetNewPassword(result.newPassword);
      setResetTargetName(target.nickname);
      setResetResultDialogOpen(true);
      toast.success('密码已重置');
    } catch (err: unknown) {
      logger.error('重置密码失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeLevel = async (id: string, level: UserLevel) => {
    setActionLoading(id);
    try {
      await adminUsersApi.update(id, { level });
      toast.success('级别已更新');
      await refreshAll();
    } catch (err: unknown) {
      logger.error('更新级别失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeGroup = async (id: string, groupId: string) => {
    setActionLoading(id);
    try {
      await adminUsersApi.update(id, {
        groupId: groupId === NO_GROUP_VALUE ? null : groupId,
      });
      toast.success('分组已更新');
      await refreshAll();
    } catch (err: unknown) {
      logger.error('更新分组失败', err);
      toast.error(extractApiError(err, '操作失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (
    payload: CreateUserRequest,
  ): Promise<boolean> => {
    setCreating(true);
    try {
      await adminUsersApi.create(payload);
      toast.success('用户已创建');
      setCreateDialogOpen(false);
      await refreshAll();
      return true;
    } catch (err: unknown) {
      logger.error('创建用户失败', err);
      toast.error(extractApiError(err, '创建失败'));
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await adminUsersApi.remove(deleteTarget.id);
      toast.success('用户已删除');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await refreshAll();
    } catch (err: unknown) {
      logger.error('删除用户失败', err);
      toast.error(extractApiError(err, '删除失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages: number = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canReset: boolean =
    keyword !== '' ||
    statusFilter !== 'all' ||
    levelFilter !== 'all' ||
    groupFilter !== ALL_VALUE;

  if (!isLevel1 && user) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border p-12 bg-card text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
          <p className="text-sm text-muted-foreground">
            您没有权限访问用户管理页面，请联系一级管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            用户管理
          </h2>
          <Button
            className="inline-flex items-center gap-2"
            onClick={() => setCreateDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            新建用户
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            用户列表
          </Button>
          <Button
            variant={viewMode === 'org' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('org')}
          >
            组织架构
          </Button>
        </div>
        {viewMode === 'list' && (
        <UsersFilters
          keyword={keyword}
          onKeywordChange={setKeyword}
          status={statusFilter}
          onStatusChange={(value: UserStatusFilter) => {
            setStatusFilter(value);
            setPage(1);
          }}
          level={levelFilter}
          onLevelChange={(value: LevelFilter) => {
            setLevelFilter(value);
            setPage(1);
          }}
          groupId={groupFilter}
          onGroupIdChange={(value: string) => {
            setGroupFilter(value);
            setPage(1);
          }}
          groups={groups}
          canReset={canReset}
          onReset={resetFilters}
        />
        )}
      </div>

      {viewMode === 'org' ? (
        <OrganizationPanel refreshSignal={orgRefresh} />
      ) : (
      <div className="rounded-lg border bg-card">
        <UsersOverview
          pendingTotal={pendingTotal}
          groupCounts={groupCounts}
          groups={groups}
          activeStatus={statusFilter}
          activeGroupId={groupFilter}
          onSelectStatus={handleSelectStatus}
          onSelectGroup={handleSelectGroup}
        />
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            没有匹配的用户
          </div>
        ) : (
          <>
            <UsersTable
              users={users}
              groups={groups}
              actionLoading={actionLoading}
              onApproveClick={handleOpenApprove}
              onReject={handleReject}
              onChangeLevel={handleChangeLevel}
              onChangeGroup={handleChangeGroup}
              onResetPassword={handleResetPassword}
              onDeleteClick={(target: User) => {
                setDeleteTarget(target);
                setDeleteDialogOpen(true);
              }}
            />
            <div className="border-t px-4 py-3 text-xs text-muted-foreground">
              共 {total} 人
            </div>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
      )}

      <ApproveUserDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        target={approveTarget}
        groups={groups}
        level={approveLevel}
        onLevelChange={setApproveLevel}
        groupId={approveGroupId}
        onGroupIdChange={setApproveGroupId}
        submitting={actionLoading === approveTarget?.id}
        onSubmit={handleApprove}
      />

      <ResetPasswordResultDialog
        open={resetResultDialogOpen}
        onOpenChange={setResetResultDialogOpen}
        userName={resetTargetName}
        password={resetNewPassword}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        groups={groups}
        submitting={creating}
        onSubmit={handleCreateUser}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        target={deleteTarget}
        submitting={actionLoading === deleteTarget?.id}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default UsersPage;
