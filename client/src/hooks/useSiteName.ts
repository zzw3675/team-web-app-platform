import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { publicSettingsApi } from '@client/src/api';

export const DEFAULT_SITE_NAME = '应用管理平台';

const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 1000;

function isTransientError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } }).response?.status;
  return typeof status !== 'number' || status >= 500;
}

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
