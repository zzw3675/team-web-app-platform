import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { publicSettingsApi } from '@client/src/api';

export const DEFAULT_SITE_NAME = '应用管理平台';

const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 1000;

// 服务重启期间 dev server 会短暂返回 502，这类瞬时故障值得重试；4xx 直接放弃
function isTransientError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } }).response?.status;
  return typeof status !== 'number' || status >= 500;
}

/**
 * 站点名称：先用默认名渲染避免闪烁，拿到服务端配置后替换。
 * 瞬时故障（重启期的 502 / 网络中断）自动重试；仍失败则保留默认名，不阻塞页面。
 */
export function useSiteName(): string {
  const [siteName, setSiteName] = useState<string>(DEFAULT_SITE_NAME);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const name: string = await publicSettingsApi.getSiteName();
          if (active && name) setSiteName(name);
          return;
        } catch (err: unknown) {
          if (!active) return;
          if (attempt === MAX_ATTEMPTS || !isTransientError(err)) {
            logger.warn('获取站点名称失败，沿用默认名称', err);
            return;
          }
          // 退避 1s / 2s / 4s，刚好跨过一次后端重启窗口
          const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
          await new Promise((resolve: (value: void) => void) => {
            setTimeout(resolve, delay);
          });
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return siteName;
}

export default useSiteName;
