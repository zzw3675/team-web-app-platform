import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '@client/src/contexts/AuthContext';
import ThemeSwitcher from '@client/src/components/ThemeSwitcher';
import UserMenu from '@client/src/components/UserMenu';
import { useSiteName } from '@client/src/hooks/useSiteName';
import { cn } from '@/lib/utils';
import type { UserLevel } from '@shared/api.interface';

const navItems = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/admin', label: '管理中心', icon: LayoutDashboard, admin: true },
];

const isAdmin = (level: UserLevel): boolean =>
  level === 'super_admin' || level === 'level_1' || level === 'level_2';

const navItemClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
  );

const Layout = () => {
  const { user } = useAuth();
  const siteName = useSiteName();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showAdmin = !!user && isAdmin(user.level);
  const visibleItems = navItems.filter((item) => !item.admin || showAdmin);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="h-14 flex items-center px-4 border-b">
          <span
            className="text-lg font-semibold truncate"
            style={{ color: 'var(--primary)' }}
            title={siteName}
          >
            {siteName}
          </span>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navItemClass}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t text-xs text-muted-foreground text-center truncate">
          © 2026 {siteName}
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-sidebar border-r flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-14 flex items-center justify-between px-4 border-b">
              <span
                className="text-lg font-semibold truncate"
                style={{ color: 'var(--primary)' }}
                title={siteName}
              >
                菜单
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 hover:bg-sidebar-accent/60 rounded-md"
                aria-label="关闭菜单"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={navItemClass}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t text-xs text-muted-foreground text-center truncate">
              © 2026 {siteName}
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar: 与内容同一文档流，避免固定层遮挡用户菜单 */}
        <div className="md:hidden h-14 shrink-0 flex items-center gap-2 px-3 border-b bg-sidebar">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 hover:bg-sidebar-accent/60 rounded-md"
            aria-label="打开菜单"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span
            className="flex-1 min-w-0 font-semibold truncate"
            style={{ color: 'var(--primary)' }}
            title={siteName}
          >
            {siteName}
          </span>
          <UserMenu showName={false} />
        </div>

        {/* Desktop header */}
        <header className="hidden md:flex h-14 border-b bg-card items-center justify-end px-6 sticky top-0 z-30">
          <UserMenu />
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <ThemeSwitcher />
    </div>
  );
};

export default Layout;
