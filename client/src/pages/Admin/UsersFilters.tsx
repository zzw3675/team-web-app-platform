import { Search, X } from 'lucide-react';

import type { Group } from '@shared/api.interface';
import type { UserGroupCount } from '@client/src/api';
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
  ALL_VALUE,
  levelFilterOptions,
  statusLabels,
  statusOptions,
  type LevelFilter,
  type UserStatusFilter,
} from './userShared';

interface UsersFiltersProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  status: UserStatusFilter;
  onStatusChange: (value: UserStatusFilter) => void;
  level: LevelFilter;
  onLevelChange: (value: LevelFilter) => void;
  groupId: string;
  onGroupIdChange: (value: string) => void;
  groups: Group[];
  canReset: boolean;
  onReset: () => void;
}

export const UsersFilters = ({
  keyword,
  onKeywordChange,
  status,
  onStatusChange,
  level,
  onLevelChange,
  groupId,
  onGroupIdChange,
  groups,
  canReset,
  onReset,
}: UsersFiltersProps) => {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1 md:max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="按邮箱/昵称搜索"
          aria-label="按邮箱或昵称搜索用户"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value: string) =>
            onStatusChange(value as UserStatusFilter)
          }
        >
          <SelectTrigger className="w-32" aria-label="按审核状态筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option: UserStatusFilter) => (
              <SelectItem key={option} value={option}>
                {statusLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={level}
          onValueChange={(value: string) => onLevelChange(value as LevelFilter)}
        >
          <SelectTrigger className="w-36" aria-label="按级别筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部级别</SelectItem>
            {levelFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={groupId}
          onValueChange={onGroupIdChange}
        >
          <SelectTrigger className="w-36" aria-label="按分组筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部分组</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="w-3.5 h-3.5" />
            清除筛选
          </Button>
        )}
      </div>
    </div>
  );
};

interface UsersOverviewProps {
  pendingTotal: number | null;
  groupCounts: UserGroupCount[] | null;
  groups: Group[];
  activeStatus: UserStatusFilter;
  activeGroupId: string;
  onSelectStatus: (status: UserStatusFilter) => void;
  onSelectGroup: (groupId: string) => void;
}

/**
 * 全局概览：待审核人数与各分组真实人数。
 * 分组人数与表格筛选口径一致（按分组筛选时不区分审核状态），点击即可筛选。
 */
export const UsersOverview = ({
  pendingTotal,
  groupCounts,
  groups,
  activeStatus,
  activeGroupId,
  onSelectStatus,
  onSelectGroup,
}: UsersOverviewProps) => {
  const ungroupedCount: number | null =
    groupCounts?.find((item: UserGroupCount) => item.groupId === null)?.count ??
    null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
      <span className="text-xs text-muted-foreground">全局概览</span>
      <Button
        type="button"
        size="sm"
        variant={activeStatus === 'pending' ? 'default' : 'outline'}
        className="h-7 text-xs"
        aria-pressed={activeStatus === 'pending'}
        title="全部待审核用户数，点击筛选待审核用户"
        disabled={pendingTotal === null}
        onClick={() => onSelectStatus('pending')}
      >
        待审核 {pendingTotal ?? '—'} 人
      </Button>

      {groupCounts === null ? (
        <span className="text-xs text-muted-foreground">
          分组人数统计暂不可用
        </span>
      ) : (
        groups.map((group) => {
          const count: number =
            groupCounts.find((item: UserGroupCount) => item.groupId === group.id)
              ?.count ?? 0;
          const active: boolean = activeGroupId === group.id;
          return (
            <Button
              key={group.id}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="h-7 text-xs"
              aria-pressed={active}
              title={`${group.name} 全部用户数（含待审核），点击按此分组筛选`}
              onClick={() => onSelectGroup(group.id)}
            >
              {group.name} {count} 人
            </Button>
          );
        })
      )}

      {ungroupedCount !== null && (
        <span className="text-xs text-muted-foreground">
          未分组 {ungroupedCount} 人
        </span>
      )}
    </div>
  );
};

export default UsersFilters;
