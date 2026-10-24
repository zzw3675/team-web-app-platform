import { useState } from 'react';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import {
  useTheme,
  type ThemeKey,
  type ThemeMode,
} from '@client/src/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const MODE_OPTIONS: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: 'system', label: '跟随系统', icon: Monitor },
  { key: 'light', label: '亮色', icon: Sun },
  { key: 'dark', label: '暗色', icon: Moon },
];

const ThemeSwitcher = () => {
  const { theme, setTheme, themes, mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div
          className="absolute bottom-14 right-0 bg-popover border rounded-lg p-3 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200"
          role="dialog"
          aria-label="主题选择"
        >
          <div className="text-xs text-muted-foreground mb-2 px-1">
            界面模式
          </div>
          <div className="flex gap-1 mb-3">
            {MODE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={mode === key}
                className={cn(
                  'flex-1 h-8 rounded-md text-xs flex items-center justify-center gap-1 border transition-colors',
                  mode === key
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'text-muted-foreground border-border hover:bg-accent',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mb-2 px-1">
            选择主题色
          </div>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTheme(t.key as ThemeKey);
                  setOpen(false);
                }}
                className={cn(
                  'w-8 h-8 rounded-full transition-transform hover:scale-110',
                  theme === t.key
                    ? 'ring-2 ring-offset-2 ring-ring'
                    : 'ring-1 ring-border',
                )}
                style={{ backgroundColor: t.primary }}
                title={t.name}
                aria-label={`切换到${t.name}主题`}
              />
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover-elevate active-elevate-2"
        aria-label="切换主题"
      >
        <Palette className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ThemeSwitcher;
