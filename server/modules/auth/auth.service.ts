import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { JwtService } from '@server/common/auth/jwt.service';
import { AuditService } from '@server/common/audit/audit.service';
import { EmailService } from '@server/modules/email/email.service';
import { hashPassword, verifyPassword } from '@server/common/utils/password';
import { users } from '@server/database/schema';
import type { User, UserLevel } from '@shared/api.interface';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ResetPasswordRequestDto, ResetPasswordConfirmDto } from './dto/reset-password.dto';

interface LoginFailureRecord {
  count: number;
  updatedAt: number;
  lockedUntil: number;
}

// 登录限流：同一「邮箱 + IP」连续失败 5 次后锁定 60s
const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_DURATION_MS = 60 * 1000;
const LOGIN_FAILURE_TTL_MS = 10 * 60 * 1000;
const LOGIN_FAILURE_MESSAGE = '邮箱或密码错误';
const LOGIN_THROTTLED_MESSAGE = '登录尝试次数过多，请稍后再试';
// 重置密码请求的最小耗时，保证「邮箱存在/不存在」两条路径耗时一致
const RESET_REQUEST_MIN_DURATION_MS = 300;
// customTimestamptz.fromDriver 对 null 会给出 1970-01-01，视为无效时间
const INVALID_TIMESTAMP_FLOOR_MS = Date.UTC(1971, 0, 1);

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

// AuthService 为请求作用域（需要读取请求 IP），限流计数必须在实例间共享，
// 因此放在模块级；普通多实例部署下为进程内计数。
const loginFailures = new Map<string, LoginFailureRecord>();
let lastFailureCleanupAt = 0;

interface UserDbRow {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatar: string | null;
  level: string;
  groupId: string | null;
  approved: boolean;
  resetToken: string | null;
  resetTokenExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const email = dto.email.toLowerCase();

    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('该邮箱已被注册');
    }

    const passwordHash = await hashPassword(dto.password);
    const result = await this.db
      .insert(users)
      .values({
        email,
        passwordHash,
        nickname: dto.nickname,
        level: 'level_3',
        approved: false,
      })
      .returning();

    const userRow = result[0] as UserDbRow;

    void this.auditService.log(userRow.id, 'register', 'auth', `注册账号: ${email}`);

    return this.toUserDto(userRow);
  }

  async login(dto: LoginDto): Promise<{ user: User; token: string }> {
    const email = dto.email.toLowerCase();
    const throttleKey = this.buildLoginThrottleKey(email);
    this.assertNotThrottled(throttleKey);

    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      this.recordLoginFailure(throttleKey);
      throw new UnauthorizedException(LOGIN_FAILURE_MESSAGE);
    }

    const userRow = result[0] as UserDbRow;
    const verifyResult = await verifyPassword(dto.password, userRow.passwordHash);

    if (!verifyResult.valid) {
      this.recordLoginFailure(throttleKey);
      throw new UnauthorizedException(LOGIN_FAILURE_MESSAGE);
    }

    this.clearLoginFailures(throttleKey);

    if (verifyResult.needsRehash) {
      const upgradedHash = await hashPassword(dto.password);
      await this.db
        .update(users)
        .set({ passwordHash: upgradedHash })
        .where(eq(users.id, userRow.id));
    }

    const token = await this.jwtService.sign({ userId: userRow.id });

    void this.auditService.log(userRow.id, 'login', 'auth', '用户登录');

    return {
      user: this.toUserDto(userRow),
      token,
    };
  }

  async getProfile(userId: string): Promise<User> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserDto(result[0] as UserDbRow);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }

    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const userRow = result[0] as UserDbRow;
    const verifyResult = await verifyPassword(
      dto.oldPassword,
      userRow.passwordHash,
    );

    if (!verifyResult.valid) {
      throw new UnauthorizedException('旧密码错误');
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, userId));

    void this.auditService.log(userId, 'change_password', 'auth', '修改密码');
  }

  async resetPasswordRequest(dto: ResetPasswordRequestDto): Promise<void> {
    const startedAt = Date.now();
    const email = dto.email.toLowerCase();
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // 不论邮箱是否存在，都返回成功且耗时一致，防止邮箱枚举
    if (result.length > 0) {
      const userId = result[0].id;
      const resetToken = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时

      await this.db
        .update(users)
        .set({
          resetToken,
          resetTokenExpires: expiresAt,
        })
        .where(eq(users.id, userId));

      void this.auditService.log(
        userId,
        'reset_password_request',
        'auth',
        '请求重置密码',
      );

      // 发信不阻塞请求，失败只记录日志，不向调用方暴露
      void this.emailService
        .sendResetEmailIfConfigured(email, resetToken)
        .catch((error: unknown) => {
          this.logger.warn(
            `重置密码邮件发送失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed < RESET_REQUEST_MIN_DURATION_MS) {
      await sleep(RESET_REQUEST_MIN_DURATION_MS - elapsed);
    }
  }

  async resetPasswordConfirm(dto: ResetPasswordConfirmDto): Promise<void> {
    if (!dto.token) {
      throw new BadRequestException('重置令牌不能为空');
    }
    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException('新密码长度至少 6 位');
    }

    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.resetToken, dto.token))
      .limit(1);

    if (result.length === 0) {
      throw new BadRequestException('重置令牌无效');
    }

    const userRow = result[0] as UserDbRow;

    const expiresAtMs = userRow.resetTokenExpires
      ? userRow.resetTokenExpires.getTime()
      : Number.NaN;
    const hasValidExpiry =
      Number.isFinite(expiresAtMs) &&
      expiresAtMs > INVALID_TIMESTAMP_FLOOR_MS &&
      expiresAtMs > Date.now();

    if (!hasValidExpiry) {
      throw new BadRequestException('重置令牌已过期');
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.db
      .update(users)
      .set({
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpires: null,
      })
      .where(eq(users.id, userRow.id));

    void this.auditService.log(userRow.id, 'reset_password_confirm', 'auth', '重置密码成功');
  }

  // 限流维度：邮箱 + 客户端 IP（优先 x-forwarded-for 首段，回退 req.ip）
  private buildLoginThrottleKey(email: string): string {
    const forwarded = this.request?.headers?.['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    const ip = this.request?.ip || forwardedIp || 'unknown';
    return `${email}|${ip}`;
  }

  // 锁定窗口内直接拒绝，避免继续消耗密码校验开销
  private assertNotThrottled(key: string): void {
    this.cleanupLoginFailures();

    const record = loginFailures.get(key);
    if (!record) return;

    if (record.lockedUntil > Date.now()) {
      throw new HttpException(
        LOGIN_THROTTLED_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordLoginFailure(key: string): void {
    const now = Date.now();
    const previous = loginFailures.get(key);
    const nextCount = (previous?.count ?? 0) + 1;

    if (nextCount >= LOGIN_FAILURE_LIMIT) {
      loginFailures.set(key, {
        count: 0,
        updatedAt: now,
        lockedUntil: now + LOGIN_LOCK_DURATION_MS,
      });
      return;
    }

    loginFailures.set(key, {
      count: nextCount,
      updatedAt: now,
      lockedUntil: 0,
    });
  }

  private clearLoginFailures(key: string): void {
    loginFailures.delete(key);
  }

  private cleanupLoginFailures(): void {
    const now = Date.now();
    if (now - lastFailureCleanupAt < LOGIN_FAILURE_TTL_MS) return;
    lastFailureCleanupAt = now;

    for (const [key, record] of loginFailures) {
      const lockExpired = record.lockedUntil <= now;
      if (lockExpired && now - record.updatedAt > LOGIN_FAILURE_TTL_MS) {
        loginFailures.delete(key);
      }
    }
  }

  private toUserDto(row: UserDbRow): User {
    return {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
      avatar: row.avatar ?? undefined,
      level: row.level as UserLevel,
      groupId: row.groupId ?? undefined,
      approved: row.approved,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
