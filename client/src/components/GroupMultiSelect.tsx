import { Checkbox } from '@/components/ui/checkbox';
import type { GroupOption } from '@shared/api.interface';

interface GroupMultiSelectProps {
  groups: GroupOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  emptyHint?: string;
}

export function GroupMultiSelect({
  groups,
  value,
  onChange,
  emptyHint = '暂无可选分组',
}: GroupMultiSelectProps) {
  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
      {groups.map((group: GroupOption) => {
        const checked: boolean = value.includes(group.id);
        return (
          <label
            key={group.id}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={checked}
              aria-label={`选择分组 ${group.name}`}
              onCheckedChange={(next: boolean | 'indeterminate') => {
                if (next === true) {
                  onChange([...value, group.id]);
                } else {
                  onChange(value.filter((id: string) => id !== group.id));
                }
              }}
            />
            <span className="truncate">{group.name}</span>
          </label>
        );
      })}
    </div>
  );
}
