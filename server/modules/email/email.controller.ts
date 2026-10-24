import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { EmailService } from './email.service';
import { RequireLevel } from '@server/common/decorators/require-level.decorator';
import type {
  SendTestEmailResponse,
  SmtpConfigResponse,
  UserLevel,
} from '@shared/api.interface';

class SmtpConfigDto {
  @IsString({ message: 'SMTP 服务器不能为空' })
  @IsNotEmpty({ message: 'SMTP 服务器不能为空' })
  host!: string;

  @IsInt({ message: '端口必须是整数' })
  @Min(1, { message: '端口范围 1-65535' })
  @Max(65535, { message: '端口范围 1-65535' })
  port!: number;

  @IsBoolean({ message: '加密方式必须是布尔值' })
  secure!: boolean;

  @IsString({ message: '发件邮箱不能为空' })
  @IsNotEmpty({ message: '发件邮箱不能为空' })
  user!: string;

  @IsOptional()
  @IsString({ message: '授权码格式不正确' })
  pass?: string;

  @IsOptional()
  @IsString({ message: '发件人名称格式不正确' })
  @IsNotEmpty({ message: '发件人名称不能为空' })
  fromName?: string;

  @IsOptional()
  @IsString({ message: '站点地址格式不正确' })
  @IsNotEmpty({ message: '站点地址不能为空' })
  siteUrl?: string;
}

class SendTestEmailDto {
  @IsEmail({}, { message: '收件邮箱格式不正确' })
  to!: string;
}

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/admin/email')
@RequireLevel('super_admin', 'level_1')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('config')
  async getConfig(): Promise<SmtpConfigResponse> {
    return this.emailService.getConfig();
  }

  @Put('config')
  async saveConfig(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: SmtpConfigDto,
  ): Promise<SmtpConfigResponse> {
    return this.emailService.saveConfig(dto, req.user.userId);
  }

  @Put('test')
  async sendTest(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: SendTestEmailDto,
  ): Promise<SendTestEmailResponse> {
    return this.emailService.sendTestEmail(dto.to, req.user.userId);
  }
}
