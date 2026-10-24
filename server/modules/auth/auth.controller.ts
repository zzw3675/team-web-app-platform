import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordRequestDto, ResetPasswordConfirmDto } from './dto/reset-password.dto';
import { Public } from '@server/common/decorators/public.decorator';
import { CurrentUser } from '@server/common/decorators/current-user.decorator';
import type { User, LoginResponse } from '@shared/api.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ user: User }> {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Get('profile')
  async getProfile(@CurrentUser() userId?: string): Promise<{ user: User }> {
    const user = await this.authService.getProfile(userId!);
    return { user };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() userId: string | undefined,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(userId!, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(): Promise<void> {
    return;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPasswordRequest(@Body() dto: ResetPasswordRequestDto): Promise<void> {
    await this.authService.resetPasswordRequest(dto);
  }

  @Public()
  @Post('reset-password/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPasswordConfirm(@Body() dto: ResetPasswordConfirmDto): Promise<void> {
    await this.authService.resetPasswordConfirm(dto);
  }
}
