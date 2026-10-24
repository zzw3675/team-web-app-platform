import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

import { pagesApi } from '@client/src/api';
import type { Page } from '@shared/api.interface';
import { Button } from '@/components/ui/button';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const PortalPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    pagesApi
      .getBySlug(slug)
      .then((data: Page) => {
        if (cancelled) return;
        setPage(data);
        setError(null);
      })
      .catch((err: { response?: { status: number } }) => {
        if (cancelled) return;
        if (err.response?.status === 404 || err.response?.status === 403) {
          setError('门户不存在或无权限访问');
        } else {
          setError('加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 应用模式门户仍由路由跳转承接；外部链接不再自动 window.open
  useEffect(() => {
    if (!page || loading) return;
    if (page.appMode) {
      const templateUrl = page.url || '';
      if (templateUrl === 'jizhang' || templateUrl.includes('jizhang')) {
        navigate(`/jizhang?pageId=${page.id}&title=${encodeURIComponent(page.title)}`, {
          replace: true,
        });
      }
    }
  }, [page, loading, navigate]);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border p-12 bg-card text-center">
          <div className="text-lg font-medium mb-2">{error || '门户不存在'}</div>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline text-sm"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (page.type === 'link') {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold truncate">{page.title}</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-primary shrink-0"
          >
            ← 返回首页
          </button>
        </div>
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground mb-4">
            该门户是一个外部网站，需要在新标签页中打开
          </div>
          {page.url ? (
            <>
              <Button asChild>
                <UniversalLink
                  to={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`打开外部链接 ${page.title}`}
                >
                  <ExternalLink className="w-4 h-4" />
                  打开外部链接
                </UniversalLink>
              </Button>
              <div className="text-xs text-muted-foreground mt-3 break-all">
                {page.url}
              </div>
            </>
          ) : (
            <div className="text-sm text-destructive">
              该门户未配置外部链接地址，请联系管理员
            </div>
          )}
        </div>
      </div>
    );
  }

  if (page.type === 'html' && page.htmlContent) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{page.title}</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← 返回首页
          </button>
        </div>
        <div
          className="rounded-lg border bg-card p-6 min-h-[400px]"
          dangerouslySetInnerHTML={{ __html: page.htmlContent }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="rounded-lg border p-12 bg-card text-center">
        <div className="text-lg font-medium mb-2">暂不支持的门户类型</div>
        <button
          onClick={() => navigate('/')}
          className="text-primary hover:underline text-sm"
        >
          返回首页
        </button>
      </div>
    </div>
  );
};

export default PortalPage;
