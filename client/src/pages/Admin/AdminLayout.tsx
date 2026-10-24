import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Layers,
  Users,
  History,
  Settings,
  FolderKanban,
} from 'lucide-react';
import { useAuth } from '@client/src/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { UserLevel } from '@shared/api.interface';

interface SubNavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  minLevel?: UserLevel;
}

const subNavItems: SubNavItem[] = [
  { to: '/admin/pages', label: '门户管理', icon: LayoutDashboard },
  { to: '/admin/templates', label: '模板管理', icon: Layers, minLevel: 'level_1' },
  { to: '/admin/groups', label: '分组管理', icon: FolderKanban, minLevel: 'level_1' },
  { to: '/admin/users', label: '用户管理', icon: Users, minLevel: 'level_1' },
  { to: '/admin/audit-logs', label: '操作日志', icon: History },
  { to: '/admin/settings', label: '站点设置', icon: Settings, minLevel: 'level_1' },
];

const levelRank: Record<UserLevel, number> = {
  super_admin: 3,
  level_1: 2,
  level_2: 1,
  level_3: 0,
};

const canAccess = (userLevel: UserLevel | undefined, minLevel?: UserLevel): boolean => {
  if (!minLevel) return true;
  if (!userLevel) return false;
  return levelRank[userLevel] >= levelRank[minLevel];
};

const AdminLayout = () => {
  const location = useLocation();
  const { user } = useAuth();

  const visibleItems = subNavItems.filter((item) =>
    canAccess(user?.level, item.minLevel),
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Secondary sidebar */}
      <aside className="hidden md:flex md:w-48 flex-col border-r bg-muted/30">
        <div className="h-12 flex items-center px-4 border-b">
          <span className="text-sm font-semibold text-foreground/80">
            管理中心
          </span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {visibleItems.map((item) => (
             <NavLink
               key={item.to}
               to={item.to}
               className={({ isActive }) =>
                 cn(
                   'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                   isActive || location.pathname.startsWith(item.to + '/')
                     ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                     : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                 )
               }
             >
               <item.icon className="w-4 h-4" />
               {item.label}
             </NavLink>
           ))}
        </nav>
      </aside>

      {/* Mobile sub-nav tabs */}
      <div className="md:hidden w-full">
        <div className="border-b overflow-x-auto">
          <div className="flex gap-1 px-2 py-2 min-w-max">
             {visibleItems.map((item) => {
              const active =
                location.pathname === item.to ||
                location.pathname.startsWith(item.to + '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50',
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
};

// 占位页面组件
const PlaceholderPage = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div className="p-6 md:p-8">
    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
      <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
      {title}
    </h2>
    <div className="rounded-lg border p-12 bg-card text-center text-muted-foreground">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>功能开发中...</p>
    </div>
  </div>
);

export { PlaceholderPage };
export default AdminLayout;
