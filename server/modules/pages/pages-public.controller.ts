import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { PagesService } from './pages.service';
import { CurrentUser } from '@server/common/decorators/current-user.decorator';
import { CreatePageFromTemplateDto } from './dto/create-page-from-template.dto';
import type { ListResponse, Page } from '@shared/api.interface';

@Controller('api/pages')
export class PagesPublicController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  async listPages(
    @CurrentUser() userId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<ListResponse<Page>> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    return this.pagesService.listPages(userId, pageNum, pageSizeNum);
  }

  @Get('by-slug/:slug')
  async getPageBySlug(
    @CurrentUser() userId: string,
    @Param('slug') slug: string,
  ): Promise<Page> {
    return this.pagesService.getPageBySlug(slug, userId);
  }

  @Get(':id')
  async getPageById(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<Page> {
    return this.pagesService.getPageById(id, userId);
  }

  @Post()
  async createFromTemplate(
    @CurrentUser() userId: string,
    @Body() dto: CreatePageFromTemplateDto,
  ): Promise<Page> {
    return this.pagesService.createFromTemplate(dto, userId);
  }
}
