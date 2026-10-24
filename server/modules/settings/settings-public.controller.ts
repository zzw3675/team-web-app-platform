import { Controller, Get } from '@nestjs/common';

import { SettingsService } from './settings.service';
import { Public } from '@server/common/decorators/public.decorator';

@Controller('api/settings')
export class SettingsPublicController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('site-name')
  async getSiteName() {
    const siteName = await this.settingsService.getSiteName();
    return { siteName };
  }
}
