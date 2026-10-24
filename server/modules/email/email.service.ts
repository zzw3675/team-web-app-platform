import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { settings } from '@server/database/schema';
import { AuditService } from '@server/common/audit/audit.service';
import type {
  SmtpConfigResponse,
  UpdateSmtpConfigRequest,
} from '@shared/api.interface';

const SMTP_KEY = 'smtp_config';

interface SmtpConfigStored {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  siteUrl: string;
}

interface SettingRow {
  key: string;
  value: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditService: AuditService,
  ) {}

  async getConfig(): Promise<SmtpConfigResponse> {
    const config = await this.getSmtpConfig();
    return {
      host: config?.host ?? '',
      port: config?.port ?? 465,
      secure: config?.secure ?? true,
      user: config?.user ?? '',
      fromName: config?.fromName ?? '',
      siteUrl: config?.siteUrl ?? '',
      hasPass: !!config?.pass,
    };
  }

  async saveConfig(
    dto: UpdateSmtpConfigRequest,
    operatorId: string,
  ): Promise<SmtpConfigResponse> {
    const existing = await this.getSmtpConfig();
    const pass = dto.pass && dto.pass.trim() !== ''
      ? dto.pass.trim()
      : existing?.pass ?? '';

    if (!pass) {
      throw new BadRequestException('发件授权码不能为空');
    }

    const config: SmtpConfigStored = {
      host: dto.host.trim(),
      port: dto.port,
      secure: dto.secure,
      user: dto.user.trim(),
      pass,
      fromName: dto.fromName?.trim() ?? '',
      siteUrl: dto.siteUrl?.trim() ?? '',
    };

    await this.db
      .insert(settings)
      .values({ key: SMTP_KEY, value: JSON.stringify(config) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(config) },
      });

    void this.auditService.log(
      operatorId,
      'update_smtp_config',
      'setting:smtp_config',
      `更新发件邮箱配置: ${config.user}`,
    );

    return this.getConfig();
  }

  async sendTestEmail(
    to: string,
    operatorId: string,
  ): Promise<{ messageId: string }> {
    const result = await this.sendMail(
      to,
      '【应用管理平台】SMTP 测试邮件',
      '<p>这是一封测试邮件，收到即说明发件邮箱配置正确。</p>',
    );
    void this.auditService.log(
      operatorId,
      'send_test_email',
      'setting:smtp_config',
      `发送测试邮件到 ${to}`,
    );
    return result;
  }

  async sendResetEmailIfConfigured(
    to: string,
    resetToken: string,
  ): Promise<void> {
    const config = await this.getSmtpConfig();
    if (!config?.pass || !config.siteUrl) return;

    const link = `${config.siteUrl.replace(/\/+$/, '')}/forgot-password?token=${resetToken}`;
    try {
      await this.sendMail(
        to,
        '【应用管理平台】密码重置链接',
        `<p>您正在重置密码，请在一小时内点击下面的链接完成操作：</p>` +
          `<p><a href="${link}">${link}</a></p>` +
          `<p>如果这不是您本人的操作，请忽略本邮件。</p>`,
      );
    } catch (err: unknown) {
      this.logger.error('发送密码重置邮件失败', err as Error);
    }
  }

  private async getSmtpConfig(): Promise<SmtpConfigStored | null> {
    const rows = await this.db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(eq(settings.key, SMTP_KEY))
      .limit(1);

    if (rows.length === 0) return null;
    try {
      return JSON.parse(rows[0].value) as SmtpConfigStored;
    } catch {
      return null;
    }
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ messageId: string }> {
    const config = await this.getSmtpConfig();
    if (!config?.host || !config.user || !config.pass) {
      throw new BadRequestException('尚未配置发件邮箱，请先在站点设置中填写');
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    try {
      const info = await transporter.sendMail({
        from: config.fromName
          ? `"${config.fromName}" <${config.user}>`
          : config.user,
        to,
        subject,
        html,
      });
      return { messageId: info.messageId };
    } catch (err: unknown) {
      this.logger.error('邮件发送失败', err as Error);
      throw new InternalServerErrorException(
        '邮件发送失败，请检查 SMTP 配置或授权码是否正确',
      );
    }
  }
}
