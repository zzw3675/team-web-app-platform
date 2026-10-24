import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@server/common/auth/jwt.service';
import { CommonModule } from '@server/common/common.module';
import { EmailModule } from '@server/modules/email/email.module';

@Module({
  imports: [EmailModule, CommonModule],
  controllers: [AuthController],
  providers: [AuthService, JwtService],
  exports: [AuthService, JwtService],
})
export class AuthModule {}
