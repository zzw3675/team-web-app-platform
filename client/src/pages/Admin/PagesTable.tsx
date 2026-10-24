import type { Page } from '@shared/api.interface';
import {
  Edit,
  Eye,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCcw,
  Trash2,
  UserCog,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type PageRowAction = 'disable' | 'enable' | 'trash' | 'restore';

interface PagesTableProps {
  pages: Page[];
  isTrash: boolean;
  onEdit: (page: Page) => void;
  onOpenOwner: (page: Page) => void;
  onOpenVisibility: (page: Page) => void;
  onAction: (page: Page, action: PageRowAction, label: string) => void;
  onDeleteClick: (page: Page) => void;
}

export const PagesTable = ({
  pages,
  isTrash,
  onEdit,
  onOpenOwner,
  onOpenVisibility,
  onAction,
  onDeleteClick,
}: PagesTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[200px]">标题</TableHead>
          <TableHead className="w-28">类型</TableHead>
          <TableHead className="w-32">负责人</TableHead>
          <TableHead className="w-28">分组</TableHead>
          <TableHead className="w-28">可见性</TableHead>
          <TableHead className="w-24">状态</TableHead>
          <TableHead className="w-24 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pages.map((page: Page) => (
          <TableRow key={page.id} className={isTrash ? 'opacity-50' : ''}>
            <TableCell>
              <div className="font-medium">{page.title}</div>
              <div className="text-xs text-muted-foreground">/{page.slug}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-normal">
                {page.type === 'link' ? '外部链接' : 'HTML'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{page.ownerName || '—'}</TableCell>
            <TableCell className="text-sm">{page.groupName || '—'}</TableCell>
            <TableCell className="text-sm">
              {visibilityLabel(page.visibility)}
            </TableCell>
            <TableCell>
              {isTrash ? (
                <Badge
                  variant="outline"
                  className="font-normal text-destructive border-destructive/30"
                >
                  已删除
                </Badge>
              ) : page.enabled ? (
                <Badge
                  variant="outline"
                  className="font-normal text-emerald-600 border-emerald-600/30"
                >
                  启用
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="font-normal text-amber-600 border-amber-600/30"
                >
                  停用
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`${page.title} 的操作`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {!isTrash && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onEdit(page)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onOpenOwner(page)}
                        className="gap-2 cursor-pointer"
                      >
                        <UserCog className="w-4 h-4" />
                        改负责人
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onOpenVisibility(page)}
                        className="gap-2 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        改权限
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {page.enabled ? (
                        <DropdownMenuItem
                          onClick={() => onAction(page, 'disable', '已停用')}
                          className="gap-2 cursor-pointer"
                        >
                          <PowerOff className="w-4 h-4" />
                          停用
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onAction(page, 'enable', '已启用')}
                          className="gap-2 cursor-pointer"
                        >
                          <Power className="w-4 h-4" />
                          启用
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onAction(page, 'trash', '已移入回收站')}
                        className="gap-2 cursor-pointer text-amber-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        移入回收站
                      </DropdownMenuItem>
                    </>
                  )}
                  {isTrash && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onAction(page, 'restore', '已恢复')}
                        className="gap-2 cursor-pointer"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        恢复
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteClick(page)}
                        className="gap-2 cursor-pointer text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        彻底删除
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const visibilityLabels: Record<Page['visibility'], string> = {
  all: '所有人',
  group: '指定组',
  users: '指定人',
  owner: '仅负责人',
};

const visibilityLabel = (visibility: Page['visibility']): string =>
  visibilityLabels[visibility];

export default PagesTable;
