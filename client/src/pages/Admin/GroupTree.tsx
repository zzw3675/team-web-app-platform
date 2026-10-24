import { Settings2, UserRound, Users } from 'lucide-react';

import type {
  OrganizationGroup,
  OrganizationResponse,
  UserLevel,
} from '@shared/api.interface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface GroupTreeProps {
  data: OrganizationResponse;
  onSelectGroup: (groupId: string) => void;
}

const LEVEL_LABELS: Record<UserLevel, string> = {
  super_admin: '超管',
  level_1: '一级',
  level_2: '组长',
  level_3: '成员',
};

function MemberChip({
  nickname,
  level,
  isLeader,
}: {
  nickname: string;
  level: UserLevel;
  isLeader: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs">
      {nickname}
      {isLeader ? (
        <Badge variant="secondary" className="px-1 py-0 text-[10px]">
          组长
        </Badge>
      ) : (
        <span className="text-muted-foreground">{LEVEL_LABELS[level]}</span>
      )}
    </span>
  );
}

function GroupCard({
  group,
  onSelectGroup,
}: {
  group: OrganizationGroup;
  onSelectGroup: (groupId: string) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{group.name}</p>
            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              <UserRound className="w-3.5 h-3.5" />
              组长：{group.leaderName ?? '未设置'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectGroup(group.id)}
          >
            <Settings2 className="w-3.5 h-3.5" />
            快捷设置
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {group.members.length} 名成员
        </p>
        {group.members.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无成员，点击快捷设置添加</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {group.members.map((member) => (
              <MemberChip
                key={member.id}
                nickname={member.nickname}
                level={member.level}
                isLeader={member.id === group.leaderId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GroupTree({ data, onSelectGroup }: GroupTreeProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {data.groups.map((group) => (
          <GroupCard key={group.id} group={group} onSelectGroup={onSelectGroup} />
        ))}
      </div>
      {data.ungrouped.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div>
              <p className="font-medium">未分组人员</p>
              <p className="text-xs text-muted-foreground mt-1">
                这些人还未加入任何分组
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {data.ungrouped.map((member) => (
                <MemberChip
                  key={member.id}
                  nickname={member.nickname}
                  level={member.level}
                  isLeader={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
