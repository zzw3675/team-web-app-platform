import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationBar = ({ page, totalPages, onPageChange }: PaginationBarProps) => {
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="p-4 border-t">
      <nav
        className="flex items-center justify-center gap-3"
        aria-label="分页导航"
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={!canPrev}
          aria-label="上一页"
        >
          <ChevronLeft className="w-4 h-4" />
          上一页
        </Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          第 {page} / {totalPages} 页
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={!canNext}
          aria-label="下一页"
        >
          下一页
          <ChevronRight className="w-4 h-4" />
        </Button>
      </nav>
    </div>
  );
};

export default PaginationBar;
