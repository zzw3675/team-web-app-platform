import { Module } from '@nestjs/common';

import { GroupsController } from './groups.controller';
import { GroupsOptionsController } from './groups-options.controller';
import { GroupsService } from './groups.service';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [GroupsController, GroupsOptionsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
