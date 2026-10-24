import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { TemplatesService } from './templates.service';
import { UpdateTemplateVisibilityDto } from './dto/update-template-visibility.dto';
import { RequireLevel } from '@server/common/decorators/require-level.decorator';
import { parsePagination } from '@server/common/utils/pagination';
import type { ListResponse, Template, UserLevel } from '@shared/api.interface';

interface AuthUser {
  userId: string;
  level: UserLevel;
}

@Controller('api/admin/templates')
@RequireLevel('super_admin', 'level_1')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async getList(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string,
  ): Promise<ListResponse<Template>> {
    const { page: pageNum, pageSize: pageSizeNum } = parsePagination(
      page,
      pageSize,
    );

    return this.templatesService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      keyword,
    });
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<Template> {
    return this.templatesService.getDetail(id);
  }

  @Patch(':id/visibility')
  async updateVisibility(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateTemplateVisibilityDto,
  ): Promise<Template> {
    return this.templatesService.updateVisibility(
      id,
      dto,
      req.user.userId,
      req.user.level,
    );
  }
}
