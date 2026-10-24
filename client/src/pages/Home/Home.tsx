import { useAuth } from '@client/src/contexts/AuthContext';
import { extractApiError, isUnauthorizedError } from '@client/src/api';
import { pagesApi } from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import CreatePortalWizard from '@client/src/components/CreatePortalWizard';
import {
  Plus,
  Inbox,
  Search,
  ExternalLink,
  FileCode,
  Loader2,
  Clock,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { Page, VisibilityType } from '@shared/api.interface';
import { logger } from '@lark-apaas/client-toolkit/logger';

const visibilityLabels: Record<VisibilityType, string> = {
  all: '所有人可见',
  group: '指定组可见',
  users: '指定人可见',
  owner: '仅负责人可见',
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number>(0);
  const [keyword, setKeyword] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pagesApi.list({
        page: 1,
        pageSize: 100,
      });
      setPages(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      if (isUnauthorizedError(err)) return;
      logger.error('获取门户列表失败', err);
      toast.error(extractApiError(err, '获取门户列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPages();
  }, [fetchPages]);

  const handlePageClick = (page: Page) => {
    if (page.type === 'link') {
      window.open(page.url, '_blank');
    } else {
      navigate(`/portal/${page.slug}`);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(keyword.toLowerCase()) ||
      p.slug.toLowerCase().includes(keyword.toLowerCase()),
  );

  // 未审核用户提示
  if (user && !user.approved) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="rounded-lg border p-12 bg-card text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">账号待审核</h2>
          <p className="text-muted-foreground mb-2">
            您的账号正在等待管理员审核。
          </p>
          <p className="text-sm text-muted-foreground">
            审核通过后，您将可以使用门户、模板及其他业务功能。如有疑问，请联系管理员。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* 顶部标题栏 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold">
            欢迎回来，{user?.nickname || '用户'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            从这里开始使用你的网页应用
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="w-4 h-4" />
          从模板新建
        </Button>
      </div>

      {/* 搜索栏 */}
      {pages.length > 0 && (
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索门户名称..."
              className="pl-9"
            />
          </div>
        </div>
      )}

      {!loading && total > pages.length && (
        <p className="text-xs text-muted-foreground mb-3">
          仅显示前 {pages.length} 条，共 {total} 条
        </p>
      )}

      {/* 门户卡片网格 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPages.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox className="size-6" />
            </EmptyMedia>
            <EmptyTitle>暂无门户</EmptyTitle>
            <EmptyDescription>
              {keyword ? '没有找到匹配的门户' : '点击上方按钮从模板新建一个门户'}
            </EmptyDescription>
          </EmptyHeader>
          {!keyword && (
            <EmptyContent>
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="w-4 h-4" />
                从模板新建
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
          data-ai-section-type="card-list"
        >
          {filteredPages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => handlePageClick(page)}
              className="text-left rounded-lg border bg-card p-5 hover:border-[var(--primary)] transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'hsl(187 70% 49% / 0.1)',
                    color: '#22C3D6',
                  }}
                >
                  {page.type === 'link' ? (
                    <ExternalLink className="w-5 h-5" />
                  ) : (
                    <FileCode className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate group-hover:text-[var(--primary)] transition-colors">
                    {page.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    /{page.slug}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Badge variant="outline" className="font-normal">
                  {page.type === 'link' ? '外部链接' : 'HTML 门户'}
                </Badge>
                <span>{visibilityLabels[page.visibility]}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreatePortalWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => void fetchPages()}
      />
    </div>
  );
};

export default Home;
