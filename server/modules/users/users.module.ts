import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UserDirectoryController } from './user-directory.controller';
import { UsersService } from './users.service';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [UsersController, UserDirectoryController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
