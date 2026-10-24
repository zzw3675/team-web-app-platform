import { Module } from '@nestjs/common';

import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplatesPublicController } from './templates-public.controller';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [TemplatesController, TemplatesPublicController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
