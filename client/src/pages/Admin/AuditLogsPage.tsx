import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@client/src/contexts/AuthContext';
import { adminAuditLogsApi, extractApiError } from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import PaginationBar from '@client/src/components/PaginationBar';
import {
  History,
  Search,
  Loader2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { AuditLog } from '@shared/api.interface';

const ALL_ACTIONS_VALUE = '__all__';

const actionOptions = [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'login',
  'logout',
  'reset_password',
  'change_visibility',
  'enable',
  'disable',
  'trash',
  'restore',
];

const AuditLogsPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [operator, setOperator] = useState('');
  const [debouncedOperator, setDebouncedOperator] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const requestIdRef = useRef(0);

  const isAdmin =
    user?.level === 'super_admin' ||
    user?.level === 'level_1' ||
    user?.level === 'level_2';

  const fetchData = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    try {
      const result = await adminAuditLogsApi.list({
        page,
        pageSize,
        operator: debouncedOperator || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (requestIdRef.current !== requestId) return;
      setLogs(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      if (requestIdRef.current !== requestId) return;
      logger.error('获取审计日志失败', err);
      toast.error(extractApiError(err, '获取数据失败'));
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [page, debouncedOperator, action, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOperator(operator);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [operator]);

  useEffect(() => {
    if (isAdmin) {
      void fetchData();
    }
  }, [fetchData, isAdmin]);

  const handleSearch = () => {
    setDebouncedOperator(operator);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatAction = (act: string): string => {
    const map: Record<string, string> = {
      create: '创建',
      update: '更新',
      delete: '删除',
      approve: '审核通过',
      reject: '审核拒绝',
      login: '登录',
      logout: '登出',
      reset_password: '重置密码',
      change_visibility: '修改可见性',
      enable: '启用',
      disable: '停用',
      trash: '移入回收站',
      restore: '恢复',
    };
    return map[act] || act;
  };

  if (!isAdmin && user) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border p-12 bg-card text-center">
          <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
          <p className="text-sm text-muted-foreground">
            您没有权限访问操作日志页面，请联系管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
        <History className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        操作日志
      </h2>

      {/* 筛选栏 */}
      <div className="rounded-lg border bg-card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              操作人
            </label>
            <Input
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索操作人"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              动作
            </label>
            <Select
              value={action || ALL_ACTIONS_VALUE}
              onValueChange={(v) => {
                setAction(v === ALL_ACTIONS_VALUE ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部动作" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACTIONS_VALUE}>全部动作</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {formatAction(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              开始日期
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              结束日期
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              查询
            </Button>
          </div>
        </div>
      </div>

      {/* 日志表格 */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            暂无日志记录
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">操作时间</TableHead>
                  <TableHead className="w-32">操作人</TableHead>
                  <TableHead className="w-28">动作</TableHead>
                  <TableHead className="w-40">目标</TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.operatorName || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {formatAction(log.action)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-xs">
                      {log.target || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.detail || '—'}
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
    </div>
  );
};

export default AuditLogsPage;
