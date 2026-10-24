import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@client/src/contexts/AuthContext';
import ChangePasswordDialog from '@client/src/components/ChangePasswordDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  /** 桌面端展示昵称，移动端顶栏只留头像 */
  showName?: boolean;
  className?: string;
  /** 菜单项跳转/登出前回调，移动端用于关闭抽屉 */
  onNavigate?: () => void;
}

const UserMenu = ({ showName = true, className, onNavigate }: UserMenuProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const isLevel1: boolean =
    !!user && (user.level === 'super_admin' || user.level === 'level_1');

  const go = (path: string): void => {
    onNavigate?.();
    navigate(path);
  };

  const handleLogout = async (): Promise<void> => {
    onNavigate?.();
    await logout();
    navigate('/login');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent',
              className,
            )}
            aria-label="用户菜单"
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs">
                {user?.nickname?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {showName && (
              <span className="hidden md:inline text-sm">
                {user?.nickname || '用户'}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2 border-b">
            <div className="text-sm font-medium truncate">
              {user?.nickname}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
          </div>
          {isLevel1 && (
            <>
              <DropdownMenuItem
                onClick={() => go('/admin/settings')}
                className="gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                站点设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => setPasswordOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            修改密码
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleLogout()}
            className="gap-2 text-destructive cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
};

export default UserMenu;
