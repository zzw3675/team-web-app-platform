import { useEffect, useMemo, useState } from 'react';
import { Loader2, Network, Users } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { adminUsersApi, extractApiError } from '@client/src/api';
import type { OrganizationResponse, UserLevel } from '@shared/api.interface';
import { Button } from '@/components/ui/button';
import { OrganizationGraph } from './OrganizationGraph';
import { GroupTree } from './GroupTree';
import { GroupSettingsDialog } from './GroupSettingsDialog';

interface OrganizationPanelProps {
  refreshSignal: number;
}

type ViewMode = 'graph' | 'tree';

export function OrganizationPanel({ refreshSignal }: OrganizationPanelProps) {
  const [data, setData] = useState<OrganizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>('graph');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminUsersApi
      .organization()
      .then((result: OrganizationResponse) => {
        if (cancelled) return;
        setData(result);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        logger.error('加载组织架构失败', err);
        setError(extractApiError(err, '加载组织架构失败'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal, reloadKey]);

  const activeGroup = useMemo(() => {
    if (!data || !activeGroupId) return null;
    return data.groups.find((group) => group.id === activeGroupId) ?? null;
  }, [data, activeGroupId]);

  const levelCounts = useMemo(() => {
    const counts: Record<UserLevel, number> = {
      super_admin: 0,
      level_1: 0,
      level_2: 0,
      level_3: 0,
    };
    if (!data) return counts;
    const seen = new Set<string>();
    for (const group of data.groups) {
      for (const member of group.members) {
        if (seen.has(member.id)) continue;
        seen.add(member.id);
        counts[member.level] += 1;
      }
    }
    for (const member of data.ungrouped) {
      if (seen.has(member.id)) continue;
      seen.add(member.id);
      counts[member.level] += 1;
    }
    return counts;
  }, [data]);

  const totalMembers = useMemo(() => {
    if (!data) return 0;
    const ids = new Set<string>();
    data.groups.forEach((group) =>
      group.members.forEach((member) => ids.add(member.id)),
    );
    data.ungrouped.forEach((member) => ids.add(member.id));
    return ids.size;
  }, [data]);

  const handleSaved = (): void => {
    setReloadKey((prev: number) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        正在加载组织架构…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-6 text-sm text-destructive">
        {error}
        <Button
          variant="outline"
          size="sm"
          className="ml-3"
          onClick={() => setReloadKey((prev: number) => prev + 1)}
        >
          重试
        </Button>
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-6 py-14 text-center">
        <Network className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">还没有分组</p>
        <p className="text-sm text-muted-foreground mt-1">
          请先在「分组管理」中创建分组，再回到这里查看组织架构
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            共 {data.groups.length} 个分组 · {totalMembers} 名成员
          </span>
          <span>管理员 {levelCounts.super_admin + levelCounts.level_1}</span>
          <span>组长 {levelCounts.level_2}</span>
          <span>成员 {levelCounts.level_3}</span>
          {data.ungrouped.length > 0 && (
            <span>未分组 {data.ungrouped.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'graph' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('graph')}
          >
            关系图
          </Button>
          <Button
            variant={view === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('tree')}
          >
            分组列表
          </Button>
        </div>
      </div>

      {view === 'graph' ? (
        <OrganizationGraph data={data} onSelectGroup={setActiveGroupId} />
      ) : (
        <GroupTree data={data} onSelectGroup={setActiveGroupId} />
      )}

      <p className="text-xs text-muted-foreground">
        点击关系图中的分组节点，或分组列表中的「快捷设置」，即可设置组长、添加或移除成员
      </p>

      <GroupSettingsDialog
        group={activeGroup}
        open={activeGroup !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setActiveGroupId(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
