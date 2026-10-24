import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Download,
  History,
  Layers,
  Home as HomeIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { jizhangApi } from '@client/src/api';
import { toast } from 'sonner';
import { extractApiError } from '@client/src/api';

interface PlatformCapsuleProps {
  projectName: string;
  onExportHtml?: () => void;
}

const PlatformCapsule = ({ projectName, onExportHtml }: PlatformCapsuleProps) => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [expanded, setExpanded] = useState(false);

  const handleExportCsv = async () => {
    if (!projectId) return;
    try {
      await jizhangApi.exportCsv(projectId);
      toast.success('CSV 导出成功');
    } catch (err: unknown) {
      toast.error(extractApiError(err, '导出失败'));
    }
  };

  const handleExportHtml = () => {
    if (onExportHtml) {
      onExportHtml();
    } else {
      handleExportCsv();
    }
  };

  const handleHistory = () => {
    if (projectId) navigate(`/history/${projectId}`);
  };

  const handleSwitchProject = () => {
    navigate('/jizhang');
  };

  const handleHome = () => {
    navigate('/');
  };

  const items = [
    { key: 'export', label: '导出存档', icon: Download, onClick: handleExportHtml },
    { key: 'history', label: '历史记录', icon: History, onClick: handleHistory },
    { key: 'switch', label: '切换项目', icon: Layers, onClick: handleSwitchProject },
    { key: 'home', label: '返回门户', icon: HomeIcon, onClick: handleHome },
  ];

  return (
    <div
      className={cn(
        'fixed left-4 bottom-20 z-40 flex flex-col items-center transition-all duration-300',
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      data-ai-section-type="button"
    >
      {/* 展开后的操作列表 */}
      <div
        className={cn(
          'flex flex-col items-center gap-1 mb-2 overflow-hidden transition-all duration-300',
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="group flex flex-col items-center justify-center gap-1 w-14 py-2 rounded-lg border bg-background/80 backdrop-blur-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title={item.label}
            aria-label={item.label}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-[10px] leading-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 胶囊主体 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border bg-background/80 backdrop-blur-sm transition-all duration-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          expanded ? 'w-36' : 'w-14',
        )}
        aria-label={expanded ? '收起项目胶囊' : '展开项目胶囊'}
      >
        <div className="flex items-center gap-1 w-full justify-center">
          <Layers
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--primary)' }}
          />
          {expanded && (
            <span className="text-xs font-medium truncate flex-1 text-left">
              {projectName || '项目'}
            </span>
          )}
          <ChevronRight
            className={cn(
              'w-3 h-3 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
        </div>
        {!expanded && (
          <span className="text-[10px] text-muted-foreground">项目</span>
        )}
      </button>
    </div>
  );
};

export default PlatformCapsule;
