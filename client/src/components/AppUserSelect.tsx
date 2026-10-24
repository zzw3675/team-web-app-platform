import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';

import { usersDirectoryApi } from '@client/src/api';
import { cn } from '@client/src/lib/utils';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import type { UserDirectoryItem } from '@shared/api.interface';

interface AppUserSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AppUserSelect({
  value,
  onChange,
  multiple = true,
  placeholder = '搜索并选择人员',
  disabled = false,
  className,
}: AppUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [options, setOptions] = useState<UserDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const knownRef = useRef<Map<string, UserDirectoryItem>>(new Map());
  const [knownVersion, setKnownVersion] = useState(0);

  const remember = (items: UserDirectoryItem[]): void => {
    let changed = false;
    for (const item of items) {
      const prev = knownRef.current.get(item.id);
      if (!prev || prev.nickname !== item.nickname) {
        knownRef.current.set(item.id, item);
        changed = true;
      }
    }
    if (changed) setKnownVersion((v: number) => v + 1);
  };

  useEffect(() => {
    const missing = value.filter(
      (id: string) => !knownRef.current.has(id),
    );
    if (missing.length === 0) return;
    let active = true;
    usersDirectoryApi
      .listByIds(missing)
      .then((items: UserDirectoryItem[]) => {
        if (active) remember(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join(','), knownVersion]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      usersDirectoryApi
        .list(keyword.trim())
        .then((items: UserDirectoryItem[]) => {
          if (!active) return;
          remember(items);
          setOptions(items);
        })
        .catch(() => {
          if (active) setOptions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, keyword]);

  const selectedItems = useMemo(
    () =>
      value
        .map((id: string) => knownRef.current.get(id))
        .filter((item): item is UserDirectoryItem => Boolean(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.join(','), knownVersion],
  );

  const toggle = (item: UserDirectoryItem): void => {
    if (multiple) {
      const next = value.includes(item.id)
        ? value.filter((id: string) => id !== item.id)
        : [...value, item.id];
      onChange(next);
      return;
    }
    onChange([item.id]);
    setOpen(false);
  };

  const remove = (id: string): void => {
    onChange(value.filter((v: string) => v !== id));
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="选择人员"
            disabled={disabled}
            className="h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal"
          >
            <span className="flex flex-1 flex-wrap items-center gap-1">
              {selectedItems.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedItems.map((item: UserDirectoryItem) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"
                  >
                    {item.nickname}
                    <button
                      type="button"
                      aria-label={`移除 ${item.nickname}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        remove(item.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="border-b p-2">
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="输入昵称搜索"
              aria-label="搜索人员昵称"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {loading && (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                加载中
              </div>
            )}
            {!loading && options.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                没有匹配的人员
              </p>
            )}
            {!loading &&
              options.map((item: UserDirectoryItem) => {
                const checked = value.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(item)}
                    className={cn(
                      'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent',
                      checked && 'bg-accent/60',
                    )}
                  >
                    <span className="truncate">{item.nickname}</span>
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default AppUserSelect;
