'use client';

import { useCallback, useEffect, useRef } from 'react';

export type UseInfiniteScrollOptions = {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
};

export type UseInfiniteScrollResult = {
  triggerRef: React.RefObject<HTMLDivElement | null>;
};

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  enabled = true,
  threshold = 0.1,
  rootMargin = '50px',
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !isLoading && enabled) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, enabled, onLoadMore],
  );

  useEffect(() => {
    const element = triggerRef.current;
    if (!element || !enabled) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, threshold, rootMargin, enabled]);

  return { triggerRef };
}
