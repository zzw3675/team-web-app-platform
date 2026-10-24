import { Module } from '@nestjs/common';

import { JizhangController } from './jizhang.controller';
import { JizhangOpenApiController } from './jizhang.openapi.controller';
import { JizhangService } from './jizhang.service';
import { CommonModule } from '@server/common/common.module';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [HistoryModule, CommonModule],
  controllers: [JizhangController, JizhangOpenApiController],
  providers: [JizhangService],
  exports: [JizhangService],
})
export class JizhangModule {}
