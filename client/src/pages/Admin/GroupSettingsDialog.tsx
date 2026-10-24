import { useEffect, useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { adminGroupsApi, extractApiError } from '@client/src/api';
import type { OrganizationGroup } from '@shared/api.interface';
import AppUserSelect from '@client/src/components/AppUserSelect';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GroupSettingsDialogProps {
  group: OrganizationGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const NO_LEADER = '__none__';

export function GroupSettingsDialog({
  group,
  open,
  onOpenChange,
  onSaved,
}: GroupSettingsDialogProps) {
  const [leaderId, setLeaderId] = useState<string>(NO_LEADER);
  const [addIds, setAddIds] = useState<string[]>([]);
  const [savingLeader, setSavingLeader] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !group) return;
    setLeaderId(group.leaderId ?? NO_LEADER);
    setAddIds([]);
  }, [open, group]);

  const handleSaveLeader = async (): Promise<void> => {
    if (!group) return;
    if (leaderId === NO_LEADER) {
      toast.error('请选择一位组长');
      return;
    }
    setSavingLeader(true);
    try {
      await adminGroupsApi.update(group.id, { leaderId });
      toast.success('组长已更新');
      onSaved();
    } catch (error) {
      logger.error('设置组长失败', error);
      toast.error(extractApiError(error, '设置组长失败'));
    } finally {
      setSavingLeader(false);
    }
  };

  const handleAddMembers = async (): Promise<void> => {
    if (!group) return;
    if (addIds.length === 0) {
      toast.error('请选择要添加的成员');
      return;
    }
    setSavingMembers(true);
    try {
      const result = await adminGroupsApi.addMembers(group.id, addIds);
      toast.success(
        result.added > 0 ? `已添加 ${result.added} 名成员` : '所选成员已在分组中',
      );
      setAddIds([]);
      onSaved();
    } catch (error) {
      logger.error('添加成员失败', error);
      toast.error(extractApiError(error, '添加成员失败'));
    } finally {
      setSavingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: string): Promise<void> => {
    if (!group) return;
    setRemovingId(userId);
    try {
      await adminGroupsApi.removeMember(group.id, userId);
      toast.success('已移出分组');
      onSaved();
    } catch (error) {
      logger.error('移除成员失败', error);
      toast.error(extractApiError(error, '移除成员失败'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group?.name ?? '分组设置'}</DialogTitle>
          <DialogDescription>
            设置组长并维护成员，成员可同时属于多个分组
          </DialogDescription>
        </DialogHeader>

        {group && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="group-leader">组长</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={leaderId} onValueChange={setLeaderId}>
                  <SelectTrigger id="group-leader" className="w-64">
                    <SelectValue placeholder="选择组长" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LEADER}>未设置</SelectItem>
                    {group.members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.nickname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleSaveLeader}
                  disabled={savingLeader}
                >
                  {savingLeader && <Loader2 className="w-4 h-4 animate-spin" />}
                  保存组长
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                组长只能从当前分组成员中选择；设为组长后其级别自动升为「组长」
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="group-add-members">添加成员</Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-72">
                  <AppUserSelect
                    value={addIds}
                    onChange={setAddIds}
                    multiple
                    placeholder="搜索并选择人员"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleAddMembers}
                  disabled={savingMembers}
                >
                  {savingMembers ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  加入分组
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>当前成员（{group.members.length}）</Label>
              <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                {group.members.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    该分组还没有成员
                  </p>
                ) : (
                  group.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-sm truncate">
                        {member.nickname}
                        {member.id === group.leaderId && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            组长
                          </span>
                        )}
                        {!member.approved && (
                          <span className="ml-2 text-xs text-destructive">
                            待审核
                          </span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`将 ${member.nickname} 移出分组`}
                        disabled={removingId === member.id}
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        {removingId === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
