import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  History,
  RefreshCw,
  Trash2,
  Edit2,
  RotateCcw,
  Clock,
  User,
  Loader2,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  historyApi,
  jizhangApi,
  extractApiError,
} from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PlatformCapsule from '@client/src/components/PlatformCapsule';
import { formatDateTime } from '@client/src/utils/jizhang-constants';
import type { HistoryRecord } from '@shared/api.interface';

const actionLabels: Record<string, string> = {
  update: '修改',
  delete: '删除',
  restore: '恢复',
};

const actionIcons: Record<string, typeof Edit2> = {
  update: Edit2,
  delete: Trash2,
  restore: RotateCcw,
};

const HistoryPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<HistoryRecord | null>(null);

  const { data: project } = useQuery({
    queryKey: ['jizhang-project', projectId],
    queryFn: () => jizhangApi.getProject(projectId!),
    enabled: !!projectId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['project-history', projectId, page],
    queryFn: () =>
      historyApi.getProjectHistory(projectId!, { page, pageSize }),
    enabled: !!projectId,
  });

  const restoreMutation = useMutation({
    mutationFn: (historyId: string) =>
      historyApi.restore(projectId!, historyId),
    onSuccess: () => {
      toast.success('版本已恢复');
      setRestoreTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ['project-history'],
      });
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err, '恢复失败'));
    },
  });

  const handleRestore = () => {
    if (restoreTarget) {
      restoreMutation.mutate(restoreTarget.id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatJson = (obj: Record<string, unknown>): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/jizhang/${projectId}`)}
          aria-label="返回记账本"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            历史版本
          </h1>
          <p className="text-sm text-muted-foreground">
            {project?.title || '加载中...'}
          </p>
        </div>
      </div>

      {/* 历史列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.items?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Archive className="size-6" />
            </EmptyMedia>
            <EmptyTitle>暂无历史版本</EmptyTitle>
            <EmptyDescription>
              记录被修改、删除或恢复时，会自动保存历史版本
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((record: HistoryRecord) => {
              const ActionIcon = actionIcons[record.action] || Edit2;
              const isExpanded = expandedId === record.id;
              return (
                <Card key={record.id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(record.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: 'hsl(221 83% 53% / 0.1)',
                          color: 'var(--primary)',
                        }}
                      >
                        <ActionIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <Badge variant="outline" className="font-normal">
                            {actionLabels[record.action] || record.action}
                          </Badge>
                          <span className="truncate">
                            {record.targetTitle || record.targetRecordId}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(record.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {record.operatorName || '未知操作人'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {record.action !== 'restore' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestoreTarget(record);
                          }}
                          disabled={restoreMutation.isPending}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          恢复
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4">
                      <div className="text-xs text-muted-foreground mb-2">
                        快照数据
                      </div>
                      <pre className="bg-background border rounded-md p-3 text-xs overflow-x-auto max-h-96 overflow-y-auto">
                        <code>{formatJson(record.snapshot)}</code>
                      </pre>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* 分页 */}
          {data && data.total > pageSize && (
            <div className="flex items-center justify-between mt-6 text-sm">
              <span className="text-muted-foreground">
                共 {data.total} 条历史
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </Button>
                <span className="px-2">第 {page} 页</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= data.total}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 恢复确认弹窗 */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open: boolean) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复此版本？</AlertDialogTitle>
            <AlertDialogDescription>
              恢复后，当前记录将被替换为该版本的内容。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {restoreTarget && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">操作：</span>
                {actionLabels[restoreTarget.action] || restoreTarget.action}
              </div>
              <div>
                <span className="text-muted-foreground">目标：</span>
                {restoreTarget.targetTitle || restoreTarget.targetRecordId}
              </div>
              <div>
                <span className="text-muted-foreground">时间：</span>
                {formatDateTime(restoreTarget.createdAt)}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {restoreMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              )}
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlatformCapsule projectName={project?.title || ''} />
    </div>
  );
};

export default HistoryPage;
