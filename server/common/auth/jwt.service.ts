import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';

import { settings } from '@server/database/schema';

interface JwtPayload {
  userId: string;
  exp: number;
  iat: number;
}

const JWT_SECRET_SETTING_KEY = 'jwt_secret';
const JWT_SECRET_BYTES = 32;
const TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;
// 回库重读密钥的节流窗口，避免任何非法 token 都触发一次数据库查询
const SECRET_RELOAD_THROTTLE_MS = 60 * 1000;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signHS256(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private secretCache: string | null = null;
  private secretLoading: Promise<string> | null = null;
  private lastSecretReloadAt = 0;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async sign(payload: { userId: string }): Promise<string> {
    const secret = await this.getSecret();
    const now = Date.now();
    const jwtPayload: JwtPayload = {
      userId: payload.userId,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + TOKEN_EXPIRES_IN_MS) / 1000),
    };

    const header = base64UrlEncode(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const data = base64UrlEncode(JSON.stringify(jwtPayload));
    const signature = signHS256(`${header}.${data}`, secret);

    return `${header}.${data}.${signature}`;
  }

  async verify(token: string): Promise<{ userId: string } | null> {
    const secret = await this.getSecret();
    const result = this.verifyWithSecret(token, secret);
    if (result) return result;

    // 只有「结构合法但签名不匹配」才可能是缓存密钥与库中不一致；
    // 格式非法 / 签名正确但已过期 / 载荷不可解析的 token 直接拒绝，不回库
    if (
      !this.hasValidStructure(token) ||
      this.isSignatureValid(token, secret)
    ) {
      return null;
    }

    // 回库重读做 60s 节流
    if (Date.now() - this.lastSecretReloadAt < SECRET_RELOAD_THROTTLE_MS) {
      return null;
    }
    this.lastSecretReloadAt = Date.now();

    const refreshed = await this.reloadSecret();
    if (refreshed === secret) return null;

    return this.verifyWithSecret(token, refreshed);
  }

  // token 结构合法：三段非空，且 payload 可 base64 解码为 JSON
  private hasValidStructure(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [header, payload, signature] = parts;
    if (!header || !payload || !signature) return false;

    try {
      const decoded = JSON.parse(base64UrlDecode(payload));
      return typeof decoded === 'object' && decoded !== null;
    } catch {
      return false;
    }
  }

  private isSignatureValid(token: string, secret: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [header, payload, signature] = parts;
    const expectedSignature = signHS256(`${header}.${payload}`, secret);
    return safeEqual(signature, expectedSignature);
  }

  private verifyWithSecret(
    token: string,
    secret: string,
  ): { userId: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;
      const expectedSignature = signHS256(`${header}.${payload}`, secret);

      if (!safeEqual(signature, expectedSignature)) return null;

      const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
      if (!decoded.userId) return null;
      if (decoded.exp * 1000 < Date.now()) return null;

      return { userId: decoded.userId };
    } catch {
      return null;
    }
  }

  private async reloadSecret(): Promise<string> {
    this.secretCache = null;
    return this.getSecret();
  }

  private async getSecret(): Promise<string> {
    if (this.secretCache) return this.secretCache;

    const pending = this.secretLoading ?? this.loadSecret();
    this.secretLoading = pending;

    try {
      const secret = await pending;
      this.secretCache = secret;
      return secret;
    } finally {
      if (this.secretLoading === pending) {
        this.secretLoading = null;
      }
    }
  }

  private async loadSecret(): Promise<string> {
    const envSecret = process.env.JWT_SECRET;
    if (typeof envSecret === 'string' && envSecret.trim().length > 0) {
      return envSecret.trim();
    }

    const stored = await this.readStoredSecret();
    if (stored) return stored;

    const generated = randomBytes(JWT_SECRET_BYTES).toString('hex');
    const inserted = await this.db
      .insert(settings)
      .values({ key: JWT_SECRET_SETTING_KEY, value: generated })
      .onConflictDoNothing({ target: settings.key })
      .returning({ value: settings.value });

    if (inserted.length > 0) {
      this.logger.log('settings 表缺少 jwt_secret，已生成并持久化新密钥');
      return inserted[0].value;
    }

    const concurrent = await this.readStoredSecret();
    if (concurrent) return concurrent;

    throw new Error('JWT 密钥初始化失败');
  }

  private async readStoredSecret(): Promise<string | null> {
    const rows = await this.db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, JWT_SECRET_SETTING_KEY))
      .limit(1);

    const value = rows[0]?.value;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    return null;
  }
}
