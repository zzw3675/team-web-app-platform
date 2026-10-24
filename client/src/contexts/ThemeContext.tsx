import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemeKey = 'blue' | 'cyan' | 'emerald' | 'violet' | 'orange' | 'pink';
export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemePalette {
  primary: string;
  ring: string;
  primaryBorder: string;
  chart1: string;
  sidebarPrimary: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarAccentDark: string;
  sidebarAccentForegroundDark: string;
  sidebarRing: string;
}

const THEMES: Record<ThemeKey, { name: string; palette: ThemePalette }> = {
  blue: {
    name: '海蓝',
    palette: {
      primary: 'hsl(221 83% 53%)',
      ring: 'hsl(221 83% 53%)',
      primaryBorder: 'hsl(221 83% 45%)',
      chart1: 'hsl(222 82% 56%)',
      sidebarPrimary: 'hsl(221 83% 53%)',
      sidebarAccent: 'hsl(222 100% 94%)',
      sidebarAccentForeground: 'hsl(221 83% 53%)',
      sidebarAccentDark: 'hsl(221 55% 24%)',
      sidebarAccentForegroundDark: 'hsl(221 100% 88%)',
      sidebarRing: 'hsl(221 83% 53%)',
    },
  },
  cyan: {
    name: '青碧',
    palette: {
      primary: 'hsl(187 70% 49%)',
      ring: 'hsl(187 70% 49%)',
      primaryBorder: 'hsl(187 70% 41%)',
      chart1: 'hsl(187 72% 52%)',
      sidebarPrimary: 'hsl(187 70% 49%)',
      sidebarAccent: 'hsl(187 85% 92%)',
      sidebarAccentForeground: 'hsl(187 70% 40%)',
      sidebarAccentDark: 'hsl(187 50% 22%)',
      sidebarAccentForegroundDark: 'hsl(187 90% 85%)',
      sidebarRing: 'hsl(187 70% 49%)',
    },
  },
  emerald: {
    name: '翠绿',
    palette: {
      primary: 'hsl(152 60% 39%)',
      ring: 'hsl(152 60% 39%)',
      primaryBorder: 'hsl(152 60% 31%)',
      chart1: 'hsl(152 58% 44%)',
      sidebarPrimary: 'hsl(152 60% 39%)',
      sidebarAccent: 'hsl(150 76% 92%)',
      sidebarAccentForeground: 'hsl(152 60% 32%)',
      sidebarAccentDark: 'hsl(152 45% 22%)',
      sidebarAccentForegroundDark: 'hsl(150 75% 85%)',
      sidebarRing: 'hsl(152 60% 39%)',
    },
  },
  violet: {
    name: '紫罗兰',
    palette: {
      primary: 'hsl(262 70% 67%)',
      ring: 'hsl(262 70% 67%)',
      primaryBorder: 'hsl(262 70% 59%)',
      chart1: 'hsl(262 72% 70%)',
      sidebarPrimary: 'hsl(262 70% 67%)',
      sidebarAccent: 'hsl(260 100% 95%)',
      sidebarAccentForeground: 'hsl(262 70% 58%)',
      sidebarAccentDark: 'hsl(262 40% 27%)',
      sidebarAccentForegroundDark: 'hsl(262 90% 88%)',
      sidebarRing: 'hsl(262 70% 67%)',
    },
  },
  orange: {
    name: '蜜橙',
    palette: {
      primary: 'hsl(24 95% 53%)',
      ring: 'hsl(24 95% 53%)',
      primaryBorder: 'hsl(24 95% 45%)',
      chart1: 'hsl(24 95% 57%)',
      sidebarPrimary: 'hsl(24 95% 53%)',
      sidebarAccent: 'hsl(28 100% 93%)',
      sidebarAccentForeground: 'hsl(24 95% 46%)',
      sidebarAccentDark: 'hsl(24 55% 23%)',
      sidebarAccentForegroundDark: 'hsl(28 100% 86%)',
      sidebarRing: 'hsl(24 95% 53%)',
    },
  },
  pink: {
    name: '玫红',
    palette: {
      primary: 'hsl(330 81% 60%)',
      ring: 'hsl(330 81% 60%)',
      primaryBorder: 'hsl(330 81% 52%)',
      chart1: 'hsl(330 82% 64%)',
      sidebarPrimary: 'hsl(330 81% 60%)',
      sidebarAccent: 'hsl(330 100% 94%)',
      sidebarAccentForeground: 'hsl(330 81% 52%)',
      sidebarAccentDark: 'hsl(330 45% 26%)',
      sidebarAccentForegroundDark: 'hsl(330 95% 89%)',
      sidebarRing: 'hsl(330 81% 60%)',
    },
  },
};

const STORAGE_KEY = 'app_theme';
const MODE_STORAGE_KEY = 'app_theme_mode';

interface ThemeContextValue {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  themes: { key: ThemeKey; name: string; primary: string }[];
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveDark(mode: ThemeMode): boolean {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return mode === 'dark' || (mode === 'system' && prefersDark);
}

function applyTheme(theme: ThemeKey, dark: boolean): void {
  const palette = THEMES[theme].palette;
  const root = document.documentElement;
  root.style.setProperty('--primary', palette.primary);
  root.style.setProperty('--ring', palette.ring);
  root.style.setProperty('--primary-border', palette.primaryBorder);
  root.style.setProperty('--chart-1', palette.chart1);
  root.style.setProperty('--sidebar-primary', palette.sidebarPrimary);
  root.style.setProperty(
    '--sidebar-accent',
    dark ? palette.sidebarAccentDark : palette.sidebarAccent,
  );
  root.style.setProperty(
    '--sidebar-accent-foreground',
    dark
      ? palette.sidebarAccentForegroundDark
      : palette.sidebarAccentForeground,
  );
  root.style.setProperty('--sidebar-ring', palette.sidebarRing);
}

export function applyMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', resolveDark(mode));
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    const initial: ThemeMode =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    applyMode(initial);
    return initial;
  });
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    if (stored && stored in THEMES) return stored;
    return 'blue';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: ThemeKey): void => {
    if (t in THEMES) setThemeState(t);
  };

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    const sync = (): void => {
      const dark: boolean = resolveDark(mode);
      document.documentElement.classList.toggle('dark', dark);
      applyTheme(theme, dark);
    };
    sync();
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => sync();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme, mode]);

  const setMode = (m: ThemeMode): void => {
    setModeState(m);
  };

  const themes = useMemo(
    () =>
      (Object.keys(THEMES) as ThemeKey[]).map((k) => ({
        key: k,
        name: THEMES[k].name,
        primary: THEMES[k].palette.primary,
      })),
    [],
  );

  const value: ThemeContextValue = { theme, setTheme, themes, mode, setMode };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
