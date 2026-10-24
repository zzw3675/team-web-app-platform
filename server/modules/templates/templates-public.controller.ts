import { Controller, Get, Param } from '@nestjs/common';

import { TemplatesService } from './templates.service';
import { CurrentUser } from '@server/common/decorators/current-user.decorator';

@Controller('api/templates')
export class TemplatesPublicController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async listTemplates(@CurrentUser() userId: string) {
    return this.templatesService.listTemplates(userId);
  }

  @Get(':id')
  async getTemplate(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    return this.templatesService.getTemplate(id, userId);
  }
}
