import { Controller, Get, Param, Query } from '@nestjs/common';

import { PagesService } from './pages.service';
import { parsePagination } from '@server/common/utils/pagination';
import { Public } from '@server/common/decorators/public.decorator';
import type { ListResponse, Page } from '@shared/api.interface';

// 访问边界说明：本控制器的访问边界由平台网关 API Key 控制，代码内不再做用户级鉴权。
// 列表与详情只暴露 enabled = true 且 isDeleted = false 的门户，列表不返回 htmlContent。
@Controller('openapi/pages')
@Public()
export class PagesOpenApiController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  async listPages(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ListResponse<Page>> {
    const pagination = parsePagination(page, pageSize);
    return this.pagesService.systemListPages(pagination.page, pagination.pageSize);
  }

  @Get(':id')
  async getPage(@Param('id') id: string): Promise<Page> {
    return this.pagesService.systemGetPageDetail(id);
  }
}
