import { Module } from '@nestjs/common';

import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
