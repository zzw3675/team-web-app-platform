import {
  Key,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';

import type { Group, User, UserLevel } from '@shared/api.interface';
import { formatDateTime } from '@client/src/utils/jizhang-constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { NO_GROUP_VALUE, assignableLevels, levelLabels } from './userShared';

interface UsersTableProps {
  users: User[];
  groups: Group[];
  actionLoading: string | null;
  onApproveClick: (user: User) => void;
  onReject: (userId: string) => void;
  onChangeLevel: (userId: string, level: UserLevel) => void;
  onChangeGroup: (userId: string, groupId: string) => void;
  onResetPassword: (user: User) => void;
  onDeleteClick: (user: User) => void;
}

export const UsersTable = ({
  users,
  groups,
  actionLoading,
  onApproveClick,
  onReject,
  onChangeLevel,
  onChangeGroup,
  onResetPassword,
  onDeleteClick,
}: UsersTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[220px]">用户</TableHead>
          <TableHead className="w-28">级别</TableHead>
          <TableHead className="w-32">分组</TableHead>
          <TableHead className="w-24">状态</TableHead>
          <TableHead className="w-40">注册时间</TableHead>
          <TableHead className="w-40 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((item: User) => {
          const busy: boolean = actionLoading === item.id;
          const isGlobalAdmin: boolean =
            item.level === 'super_admin' || item.level === 'level_1';

          return (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {item.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.nickname}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={isGlobalAdmin ? 'default' : 'outline'}
                  className="text-xs font-normal"
                >
                  {levelLabels[item.level]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {item.groupName || (
                  <span className="text-muted-foreground">未分组</span>
                )}
              </TableCell>
              <TableCell>
                {item.approved ? (
                  <Badge
                    variant="outline"
                    className="text-xs font-normal text-emerald-600 border-emerald-600/30"
                  >
                    已审核
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs font-normal">
                    待审核
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateTime(item.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {!item.approved && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onApproveClick(item)}
                        disabled={busy}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive border-destructive/30"
                        onClick={() => onReject(item.id)}
                        disabled={busy}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        拒绝
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`${item.nickname} 的更多操作`}
                        disabled={busy}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>更多操作</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <div className="text-xs text-muted-foreground mb-1">
                          定级
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {assignableLevels.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => onChangeLevel(item.id, option.value)}
                              disabled={busy || item.level === option.value}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${
                                item.level === option.value
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              {option.value.replace('level_', 'L')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <div className="text-xs text-muted-foreground mb-1">
                          分组
                        </div>
                        <Select
                          value={item.groupId || NO_GROUP_VALUE}
                          onValueChange={(value: string) =>
                            onChangeGroup(item.id, value)
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            aria-label={`调整 ${item.nickname} 的分组`}
                          >
                            <SelectValue placeholder="未分组" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_GROUP_VALUE}>未分组</SelectItem>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onResetPassword(item)}
                        className="gap-2 cursor-pointer"
                      >
                        <Key className="w-4 h-4" />
                        重置密码
                      </DropdownMenuItem>
                      {item.level !== 'super_admin' && (
                        <DropdownMenuItem
                          onClick={() => onDeleteClick(item)}
                          className="gap-2 text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除用户
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default UsersTable;
