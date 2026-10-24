import { Module } from '@nestjs/common';
import { CommonModule } from '@server/common/common.module';

import { PagesService } from './pages.service';
import { PagesController } from './pages.controller';
import { PagesPublicController } from './pages-public.controller';
import { PagesOpenApiController } from './pages.openapi.controller';

@Module({
  imports: [CommonModule],
  controllers: [PagesController, PagesPublicController, PagesOpenApiController],
  providers: [PagesService],
})
export class PagesModule {}
