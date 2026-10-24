import {
  ForbiddenException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { settings } from '@server/database/schema';
import { AuditService } from '@server/common/audit/audit.service';
import type { Setting } from '@shared/api.interface';

const SITE_NAME_KEY = 'site-name';
const LEGACY_SITE_NAME_KEY = 'site_name';
const DEFAULT_SITE_NAME = '应用管理平台';

// 仅暴露非敏感配置，jwt_secret / smtp_config 等绝不下发
const PUBLIC_SETTING_KEYS: string[] = [SITE_NAME_KEY, LEGACY_SITE_NAME_KEY];

// 通用 PATCH 接口只允许写展示类配置，敏感配置走专属接口
const WRITABLE_SETTING_KEYS: string[] = [SITE_NAME_KEY, LEGACY_SITE_NAME_KEY];

interface SettingRow {
  id: string;
  key: string;
  value: string;
}

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    // 确保 site-name 存在默认值，兼容旧键 site_name
    try {
      const existing = await this.db
        .select({ id: settings.id, key: settings.key })
        .from(settings)
        .where(inArray(settings.key, [SITE_NAME_KEY, LEGACY_SITE_NAME_KEY]));

      const canonical = existing.find(
        (row: { id: string; key: string }) => row.key === SITE_NAME_KEY,
      );
      const legacy = existing.find(
        (row: { id: string; key: string }) => row.key === LEGACY_SITE_NAME_KEY,
      );

      if (!canonical && legacy) {
        await this.db
          .update(settings)
          .set({ key: SITE_NAME_KEY })
          .where(eq(settings.id, legacy.id));
      } else if (!canonical && !legacy) {
        await this.db.insert(settings).values({
          key: SITE_NAME_KEY,
          value: DEFAULT_SITE_NAME,
        });
      }
    } catch {
      // 启动时初始化失败不影响服务启动
    }
  }

  async getAllSettings(): Promise<Setting[]> {
    const rows = await this.db
      .select({ id: settings.id, key: settings.key, value: settings.value })
      .from(settings)
      .where(inArray(settings.key, PUBLIC_SETTING_KEYS));

    return rows.map((row: SettingRow) => ({
      id: row.id,
      key: row.key,
      value: row.value,
    }));
  }

  async getSiteName(): Promise<string> {
    const rows = await this.db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(inArray(settings.key, [SITE_NAME_KEY, LEGACY_SITE_NAME_KEY]));

    const canonical = rows.find(
      (row: { key: string; value: string }) => row.key === SITE_NAME_KEY,
    );
    if (canonical) return canonical.value;

    const legacy = rows.find(
      (row: { key: string; value: string }) => row.key === LEGACY_SITE_NAME_KEY,
    );
    if (legacy) return legacy.value;

    return DEFAULT_SITE_NAME;
  }

  async updateSetting(
    key: string,
    value: string,
    operatorId: string,
  ): Promise<Setting | null> {
    const normalizedKey = this.normalizeKey(key);

    // 仅允许修改展示类配置，敏感 key（如 jwt_secret / smtp_config）走专属接口
    if (!WRITABLE_SETTING_KEYS.includes(normalizedKey)) {
      throw new ForbiddenException('该设置项不允许通过该接口修改');
    }

    const existing = await this.db
      .select({ id: settings.id })
      .from(settings)
      .where(eq(settings.key, normalizedKey))
      .limit(1);

    if (existing.length === 0) {
      return null;
    }

    const updated = await this.db
      .update(settings)
      .set({ value })
      .where(eq(settings.id, existing[0].id))
      .returning({ id: settings.id, key: settings.key, value: settings.value });

    if (updated.length === 0) {
      return null;
    }

    void this.auditService.log(
      operatorId,
      'update_setting',
      `setting:${normalizedKey}`,
      `更新设置: ${normalizedKey} = ${value}`,
    );

    const row = updated[0];
    return {
      id: row.id,
      key: row.key,
      value: row.value,
    };
  }

  private normalizeKey(key: string): string {
    return key === LEGACY_SITE_NAME_KEY ? SITE_NAME_KEY : key;
  }
}
