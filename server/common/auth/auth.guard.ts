import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { JwtService } from './jwt.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_LEVEL_KEY } from '../decorators/require-level.decorator';
import { users } from '@server/database/schema';
import type { UserLevel } from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

const GUARDED_PATH_PREFIXES: string[] = ['/api/', '/openapi/'];

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requireLevels = this.reflector.getAllAndOverride<UserLevel[]>(
      REQUIRE_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    // 非 /api、/openapi 路径（前端静态/SPA）不做强制鉴权，仅尝试解析 token；
    // 使用 originalUrl 判断，兼容平台 basePath 前缀（/app/<appId>/api/...）
    const isApiRoute = this.isApiRoute(req.originalUrl);

    const token = this.extractToken(req);
    let user: AuthUser | null = null;
    let accountMissing = false;

    if (token) {
      const payload = await this.jwtService.verify(token);
      if (payload) {
        const dbUser = await this.db
          .select({ id: users.id, level: users.level })
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (dbUser.length > 0) {
          user = {
            userId: dbUser[0].id,
            level: (dbUser[0].level as UserLevel) ?? 'level_3',
          };
          req.user = user;
        } else {
          accountMissing = true;
        }
      }
    }

    if (isPublic || !isApiRoute) {
      return true;
    }

    if (!user) {
      const reason = !token
        ? '未携带令牌'
        : accountMissing
          ? '账号不存在'
          : '令牌校验失败';
      this.logger.warn(
        `拒绝未认证请求 ${req.method} ${req.originalUrl}：${reason}` +
          `（authorization=${this.describeHeader(req.headers.authorization)}` +
          `, x-app-token=${this.describeHeader(req.headers['x-app-token'])}）`,
      );
      throw new UnauthorizedException(
        accountMissing
          ? '账号不存在或已被删除，请重新登录'
          : '未登录或登录已过期',
      );
    }

    if (requireLevels && requireLevels.length > 0) {
      if (!requireLevels.includes(user.level)) {
        throw new ForbiddenException('权限不足');
      }
    }

    return true;
  }

  private isApiRoute(originalUrl: string): boolean {
    const path = originalUrl.split('?')[0] ?? '';
    return GUARDED_PATH_PREFIXES.some((prefix: string) => path.includes(prefix));
  }

  private describeHeader(value: string | string[] | undefined): string {
    const raw = Array.isArray(value) ? value[0] : value;
    return typeof raw === 'string' && raw.length > 0 ? `len=${raw.length}` : '无';
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
        return parts[1];
      }
    }

    // 部分网关会改写/丢弃 Authorization，业务 token 同时走自定义头兜底
    const appToken = req.headers['x-app-token'];
    if (typeof appToken === 'string' && appToken.length > 0) {
      return appToken;
    }

    return null;
  }
}
