import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { AuthGuard } from './common/auth/auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { GroupsModule } from './modules/groups/groups.module';
import { UsersModule } from './modules/users/users.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { PagesModule } from './modules/pages/pages.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { EmailModule } from './modules/email/email.module';
import { HistoryModule } from './modules/history/history.module';
import { JizhangModule } from './modules/jizhang/jizhang.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    AuthModule,
    GroupsModule,
    UsersModule,
    TemplatesModule,
    PagesModule,
    AuditModule,
    SettingsModule,
    EmailModule,
    HistoryModule,
    JizhangModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
