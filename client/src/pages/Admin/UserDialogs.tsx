import { Key, Loader2 } from 'lucide-react';

import type { Group, User, UserLevel } from '@shared/api.interface';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  NO_GROUP_VALUE,
  assignableLevels,
  type LevelOption,
} from './userShared';

interface ApproveUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: User | null;
  groups: Group[];
  level: UserLevel;
  onLevelChange: (level: UserLevel) => void;
  groupId: string;
  onGroupIdChange: (groupId: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}

export const ApproveUserDialog = ({
  open,
  onOpenChange,
  target,
  groups,
  level,
  onLevelChange,
  groupId,
  onGroupIdChange,
  submitting,
  onSubmit,
}: ApproveUserDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>审核通过</DialogTitle>
          <DialogDescription>
            为用户「{target?.nickname}」设置初始级别和分组
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">用户级别</label>
            <Select
              value={level}
              onValueChange={(value: string) => onLevelChange(value as UserLevel)}
            >
              <SelectTrigger aria-label="选择用户级别">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableLevels.map((option: LevelOption) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">所属分组</label>
            <Select
              value={groupId || NO_GROUP_VALUE}
              onValueChange={(value: string) =>
                onGroupIdChange(value === NO_GROUP_VALUE ? '' : value)
              }
            >
              <SelectTrigger aria-label="选择所属分组">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            确认通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ResetPasswordResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  password: string;
}

export const ResetPasswordResultDialog = ({
  open,
  onOpenChange,
  userName,
  password,
}: ResetPasswordResultDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>密码已重置</DialogTitle>
          <DialogDescription>
            用户「{userName}」的新密码如下，请妥善保存并通知用户
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border p-4 bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">新密码</div>
          <div
            className="text-lg font-mono font-semibold select-all"
            style={{ color: 'var(--primary)' }}
          >
            {password}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(password);
              toast.success('已复制到剪贴板');
            }}
          >
            <Key className="w-4 h-4" />
            复制密码
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: User | null;
  submitting: boolean;
  onConfirm: () => void;
}

export const DeleteUserDialog = ({
  open,
  onOpenChange,
  target,
  submitting,
  onConfirm,
}: DeleteUserDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除用户</DialogTitle>
          <DialogDescription>
            删除后无法恢复，确定要删除用户「{target?.nickname}」吗？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
