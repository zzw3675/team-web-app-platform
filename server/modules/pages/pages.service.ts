import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { pages, users, groups, groupMembers, templates } from '@server/database/schema';
import { AuditService } from '@server/common/audit/audit.service';
import { PermissionService } from '@server/common/permission/permission.service';
import { escapeLikePattern } from '@server/common/utils/escape-like';
import type {
  ListResponse,
  Page,
  PageType,
  UserLevel,
  VisibilityType,
} from '@shared/api.interface';
import type { UpdatePageAdminDto } from './dto/update-page-admin.dto';
import type { UpdatePageVisibilityDto } from './dto/update-page-visibility.dto';
import type { CreatePageFromTemplateDto } from './dto/create-page-from-template.dto';

interface PageWithDetails {
  id: string;
  title: string;
  slug: string;
  icon: string | null;
  type: string;
  url: string | null;
  htmlContent?: string | null;
  visibility: string;
  visibleUserIds: string[];
  visibleGroupIds: string[];
  sortOrder: number;
  enabled: boolean;
  groupId: string | null;
  groupName: string | null;
  ownerId: string | null;
  ownerNickname: string | null;
  isDeleted: boolean;
  appMode: boolean;
  templateId: string | null;
  templateName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserInfoRow {
  id: string;
  level: string;
  groupId: string | null;
  approved: boolean;
}

@Injectable()
export class PagesService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
  ) {}

  private isGlobalAdmin(level: string): boolean {
    return level === 'super_admin' || level === 'level_1';
  }

  async getUserInfo(userId: string): Promise<UserInfoRow | null> {
    const rows = await this.db
      .select({
        id: users.id,
        level: users.level,
        groupId: users.groupId,
        approved: users.approved,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] as UserInfoRow;
  }

  // ========== Admin API methods ==========

  async getAdminList(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    isDeleted?: boolean;
    status?: string;
    operatorId: string;
    operatorLevel: string;
    operatorGroupId: string | null;
  }): Promise<ListResponse<Page>> {
    const {
      page,
      pageSize,
      keyword,
      isDeleted,
      status,
      operatorLevel,
      operatorGroupId,
    } = params;
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [];

    // 权限过滤
    if (!this.isGlobalAdmin(operatorLevel)) {
      if (operatorLevel === 'level_2' && operatorGroupId) {
        conditions.push(eq(pages.groupId, operatorGroupId));
      } else {
        conditions.push(sql`false`);
      }
    }

    const showDeleted =
      status === undefined ? (isDeleted ?? false) : status === 'trash';
    conditions.push(eq(pages.isDeleted, showDeleted));

    if (!showDeleted && status === 'enabled') {
      conditions.push(eq(pages.enabled, true));
    } else if (!showDeleted && status === 'disabled') {
      conditions.push(eq(pages.enabled, false));
    }

    if (keyword) {
      const escapedKeyword = escapeLikePattern(keyword);
      conditions.push(
        or(
          ilike(pages.title, `%${escapedKeyword}%`),
          ilike(pages.slug, `%${escapedKeyword}%`),
        ),
      );
    }

    const whereClause = and(...conditions);

    const [totalResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(pages).where(whereClause),
      this.db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          icon: pages.icon,
          type: pages.type,
          url: pages.url,
          visibility: pages.visibility,
          visibleUserIds: pages.visibleUserIds,
          visibleGroupIds: pages.visibleGroupIds,
          sortOrder: pages.sortOrder,
          enabled: pages.enabled,
          groupId: pages.groupId,
          groupName: groups.name,
          ownerId: pages.ownerId,
          ownerNickname: users.nickname,
          isDeleted: pages.isDeleted,
          appMode: pages.appMode,
          templateId: pages.templateId,
          templateName: templates.name,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
        })
        .from(pages)
        .leftJoin(users, eq(pages.ownerId, users.id))
        .leftJoin(groups, eq(pages.groupId, groups.id))
        .leftJoin(templates, eq(pages.templateId, templates.id))
        .where(whereClause)
        .orderBy(desc(pages.sortOrder), desc(pages.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: PageWithDetails) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async getAdminDetail(
    id: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<Page> {
    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    if (!this.canAdminManagePage(operatorLevel, operatorGroupId, page)) {
      throw new ForbiddenException('权限不足');
    }

    return this.toDto(page);
  }

  async adminUpdatePage(
    id: string,
    dto: UpdatePageAdminDto,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<Page> {
    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    if (!this.canAdminManagePage(operatorLevel, operatorGroupId, page)) {
      throw new ForbiddenException('权限不足');
    }

    // slug 唯一性校验
    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.db
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.slug, dto.slug))
        .limit(1);
      if (existing.length > 0) {
        throw new ConflictException('门户标识已存在');
      }
    }

    // level_2 不能设置 appMode 为 true 的类型（即不能创建/改 app 类型）
    if (!this.isGlobalAdmin(operatorLevel) && dto.appMode !== undefined) {
      if (dto.appMode) {
        throw new ForbiddenException('组长无权设置应用模式');
      }
    }

    // 非全局管理员：分组只能是本组，可见性按级别收窄
    if (!this.isGlobalAdmin(operatorLevel)) {
      if (dto.groupId !== undefined && dto.groupId !== operatorGroupId) {
        throw new ForbiddenException('只能设置本组为门户分组');
      }
      if (dto.visibility !== undefined) {
        this.assertVisibilityAllowed(
          operatorLevel,
          operatorGroupId,
          dto.visibility,
        );
      }
    }

    const patch: Partial<typeof pages.$inferInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.icon !== undefined) patch.icon = dto.icon;
    if (dto.enabled !== undefined) patch.enabled = dto.enabled;
    if (dto.visibility !== undefined) patch.visibility = dto.visibility;
    if (dto.visibleUserIds !== undefined) patch.visibleUserIds = dto.visibleUserIds;
    if (dto.visibleGroupIds !== undefined) patch.visibleGroupIds = dto.visibleGroupIds;
    if (dto.groupId !== undefined) patch.groupId = dto.groupId;
    if (dto.ownerId !== undefined) patch.ownerId = dto.ownerId;
    if (dto.appMode !== undefined) patch.appMode = dto.appMode;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    if (Object.keys(patch).length === 0) {
      return this.getAdminDetail(id, operatorLevel, operatorGroupId);
    }

    patch.updatedAt = new Date();

    const updated = await this.db
      .update(pages)
      .set(patch)
      .where(eq(pages.id, id))
      .returning({ id: pages.id });
    if (updated.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    void this.auditService.log(
      operatorId,
      'admin_update_page',
      `page:${id}`,
      `管理员更新门户: ${JSON.stringify(patch)}`,
    );

    return this.getAdminDetail(id, operatorLevel, operatorGroupId);
  }

  async softDelete(
    id: string,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<void> {
    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    if (!this.canAdminManagePage(operatorLevel, operatorGroupId, page)) {
      throw new ForbiddenException('权限不足');
    }

    const updated = await this.db
      .update(pages)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning({ id: pages.id });
    if (updated.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    void this.auditService.log(
      operatorId,
      'delete_page',
      `page:${id}`,
      `移入回收站: ${page.title}`,
    );
  }

  async restore(
    id: string,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<Page> {
    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    if (!this.canAdminManagePage(operatorLevel, operatorGroupId, page)) {
      throw new ForbiddenException('权限不足');
    }

    const updated = await this.db
      .update(pages)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning({ id: pages.id });
    if (updated.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    void this.auditService.log(
      operatorId,
      'restore_page',
      `page:${id}`,
      `从回收站恢复: ${page.title}`,
    );

    return this.getAdminDetail(id, operatorLevel, operatorGroupId);
  }

  async updateOwner(
    id: string,
    ownerId: string | null,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<Page> {
    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    if (!this.canAdminManagePage(operatorLevel, operatorGroupId, page)) {
      throw new ForbiddenException('权限不足');
    }

    if (ownerId) {
      const ownerRows = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, ownerId))
        .limit(1);
      if (ownerRows.length === 0) {
        throw new BadRequestException('负责人用户不存在');
      }
    }

    const updated = await this.db
      .update(pages)
      .set({ ownerId, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning({ id: pages.id });
    if (updated.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    void this.auditService.log(
      operatorId,
      'update_page_owner',
      `page:${id}`,
      `设置门户负责人: ${ownerId ?? '空'}`,
    );

    return this.getAdminDetail(id, operatorLevel, operatorGroupId);
  }

  async updateVisibility(
    id: string,
    dto: UpdatePageVisibilityDto,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<Page> {
    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    if (!this.canAdminManagePage(operatorLevel, operatorGroupId, page)) {
      throw new ForbiddenException('权限不足');
    }

    // 非全局管理员：分组只能是本组，可见性按级别收窄
    if (!this.isGlobalAdmin(operatorLevel)) {
      if (dto.groupId !== undefined && dto.groupId !== operatorGroupId) {
        throw new ForbiddenException('只能设置本组为门户分组');
      }
      this.assertVisibilityAllowed(
        operatorLevel,
        operatorGroupId,
        dto.visibility,
      );
    }

    if (dto.groupId) {
      const groupRows = await this.db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.id, dto.groupId))
        .limit(1);
      if (groupRows.length === 0) {
        throw new BadRequestException('分组不存在');
      }
    }

    const patch: Partial<typeof pages.$inferInsert> = {
      visibility: dto.visibility,
      updatedAt: new Date(),
    };
    if (dto.visibleUserIds !== undefined) {
      patch.visibleUserIds = dto.visibleUserIds;
    }
    if (dto.visibleGroupIds !== undefined) {
      patch.visibleGroupIds = dto.visibleGroupIds;
    }
    if (dto.groupId !== undefined) {
      patch.groupId = dto.groupId;
    }

    const updated = await this.db
      .update(pages)
      .set(patch)
      .where(eq(pages.id, id))
      .returning({ id: pages.id });
    if (updated.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    void this.auditService.log(
      operatorId,
      'update_page_visibility',
      `page:${id}`,
      `调整门户可见性: visibility=${dto.visibility}`,
    );

    return this.getAdminDetail(id, operatorLevel, operatorGroupId);
  }

  async setEnabled(
    id: string,
    enabled: boolean,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<void> {
    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    if (!this.canAdminManagePage(operatorLevel, operatorGroupId, page)) {
      throw new ForbiddenException('权限不足');
    }

    const updated = await this.db
      .update(pages)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning({ id: pages.id });
    if (updated.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    void this.auditService.log(
      operatorId,
      enabled ? 'enable_page' : 'disable_page',
      `page:${id}`,
      `${enabled ? '启用' : '停用'}门户: ${page.title}`,
    );
  }

  async deletePermanently(
    id: string,
    operatorId: string,
    operatorLevel: string,
  ): Promise<void> {
    if (!this.isGlobalAdmin(operatorLevel)) {
      throw new ForbiddenException('仅一级管理员可彻底删除门户');
    }

    const page = await this.getPageRowById(id);
    if (!page) {
      throw new NotFoundException('门户不存在');
    }

    const result = await this.db
      .delete(pages)
      .where(eq(pages.id, id))
      .returning({ id: pages.id });

    if (result.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    void this.auditService.log(
      operatorId,
      'delete_page_permanently',
      `page:${id}`,
      `彻底删除门户: ${page.title}`,
    );
  }

  // ========== Public API methods ==========

  async listPages(
    userId: string,
    pageNum: number,
    pageSizeNum: number,
  ): Promise<ListResponse<Page>> {
    const offset = (pageNum - 1) * pageSizeNum;

    const currentUser = await this.getUserInfo(userId);
    if (!currentUser) {
      return { items: [], total: 0, page: pageNum, pageSize: pageSizeNum };
    }

    const conditions: SQL[] = [
      eq(pages.isDeleted, false),
      eq(pages.enabled, true),
    ];

    if (!this.isGlobalAdmin(currentUser.level)) {
      if (currentUser.approved) {
        const visibilityConditions: SQL[] = [
          sql`${pages.ownerId} = ${userId}::uuid`,
          sql`${pages.visibility} = 'all'`,
          sql`(${pages.visibility} = 'users' AND ${userId}::uuid = ANY(${pages.visibleUserIds}))`,
        ];
        if (currentUser.groupId) {
          visibilityConditions.push(
            sql`(${pages.visibility} = 'group' AND ${pages.groupId} = ${currentUser.groupId}::uuid)`,
          );
        }
        const memberGroupIds = await this.getUserGroupIds(currentUser.id);
        if (memberGroupIds.length > 0) {
          const groupArray = sql`ARRAY[${sql.join(
            memberGroupIds.map((groupId: string) => sql`${groupId}::uuid`),
            sql`, `,
          )}]`;
          visibilityConditions.push(
            sql`(${pages.visibility} = 'group' AND (
              (cardinality(${pages.visibleGroupIds}) > 0 AND ${pages.visibleGroupIds} && ${groupArray})
              OR (cardinality(${pages.visibleGroupIds}) = 0 AND ${pages.groupId} = ANY(${groupArray}))
            ))`,
          );
        }
        conditions.push(sql`(${sql.join(visibilityConditions, sql` OR `)})`);
      } else {
        conditions.push(sql`${pages.ownerId} = ${userId}::uuid`);
      }
    }

    const whereClause = and(...conditions);

    const [totalResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(pages).where(whereClause),
      this.db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          icon: pages.icon,
          type: pages.type,
          url: pages.url,
          visibility: pages.visibility,
          visibleUserIds: pages.visibleUserIds,
          visibleGroupIds: pages.visibleGroupIds,
          sortOrder: pages.sortOrder,
          enabled: pages.enabled,
          groupId: pages.groupId,
          groupName: groups.name,
          ownerId: pages.ownerId,
          ownerNickname: users.nickname,
          isDeleted: pages.isDeleted,
          appMode: pages.appMode,
          templateId: pages.templateId,
          templateName: templates.name,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
        })
        .from(pages)
        .leftJoin(users, eq(pages.ownerId, users.id))
        .leftJoin(groups, eq(pages.groupId, groups.id))
        .leftJoin(templates, eq(pages.templateId, templates.id))
        .where(whereClause)
        .orderBy(desc(pages.sortOrder), desc(pages.createdAt))
        .limit(pageSizeNum)
        .offset(offset),
    ]);

    return {
      items: rows.map((row: PageWithDetails) => this.toDto(row)),
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      pageSize: pageSizeNum,
    };
  }

  async getPageBySlug(slug: string, userId: string): Promise<Page> {
    const rows = await this.db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        icon: pages.icon,
        type: pages.type,
        url: pages.url,
        htmlContent: pages.htmlContent,
        visibility: pages.visibility,
        visibleUserIds: pages.visibleUserIds,
        visibleGroupIds: pages.visibleGroupIds,
        sortOrder: pages.sortOrder,
        enabled: pages.enabled,
        groupId: pages.groupId,
        groupName: groups.name,
        ownerId: pages.ownerId,
        ownerNickname: users.nickname,
        isDeleted: pages.isDeleted,
        appMode: pages.appMode,
        templateId: pages.templateId,
        templateName: templates.name,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .leftJoin(users, eq(pages.ownerId, users.id))
      .leftJoin(groups, eq(pages.groupId, groups.id))
      .leftJoin(templates, eq(pages.templateId, templates.id))
      .where(eq(pages.slug, slug))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('门户不存在');
    }

    const page = rows[0] as PageWithDetails;

    if (page.isDeleted || !page.enabled) {
      throw new NotFoundException('门户不存在');
    }

    const currentUser = await this.getUserInfo(userId);
    if (!currentUser) {
      throw new NotFoundException('门户不存在');
    }

    const userInfo = {
      id: currentUser.id,
      level: currentUser.level as UserLevel,
      groupId: currentUser.groupId,
      approved: currentUser.approved,
    };

    const memberGroupIds = await this.getUserGroupIds(currentUser.id);

    const canView = this.permissionService.canViewPage(
      userInfo,
      {
        id: page.id,
        visibility: page.visibility as VisibilityType,
        visibleUserIds: page.visibleUserIds,
        visibleGroupIds: page.visibleGroupIds,
        groupId: page.groupId,
        ownerId: page.ownerId,
      },
      memberGroupIds,
    );

    if (!canView) {
      throw new NotFoundException('门户不存在');
    }

    return this.toDto(page);
  }

  async getPageById(id: string, userId: string): Promise<Page> {
    const page = await this.getPageRowById(id);
    if (!page || page.isDeleted || !page.enabled) {
      throw new NotFoundException('门户不存在');
    }

    const currentUser = await this.getUserInfo(userId);
    if (!currentUser) {
      throw new NotFoundException('门户不存在');
    }

    const userInfo = {
      id: currentUser.id,
      level: currentUser.level as UserLevel,
      groupId: currentUser.groupId,
      approved: currentUser.approved,
    };

    const memberGroupIds = await this.getUserGroupIds(currentUser.id);

    const canView = this.permissionService.canViewPage(
      userInfo,
      {
        id: page.id,
        visibility: page.visibility as VisibilityType,
        visibleUserIds: page.visibleUserIds,
        visibleGroupIds: page.visibleGroupIds,
        groupId: page.groupId,
        ownerId: page.ownerId,
      },
      memberGroupIds,
    );

    if (!canView) {
      throw new NotFoundException('门户不存在');
    }

    return this.toDto(page);
  }

  async createFromTemplate(
    dto: CreatePageFromTemplateDto,
    userId: string,
  ): Promise<Page> {
    const currentUser = await this.getUserInfo(userId);
    if (!currentUser) {
      throw new ForbiddenException('用户不存在');
    }

    // 未审核用户不能创建
    if (!currentUser.approved) {
      throw new ForbiddenException('账号未审核，无法创建门户');
    }

    // 获取模板
    const templateRows = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, dto.templateId))
      .limit(1);

    if (templateRows.length === 0) {
      throw new NotFoundException('模板不存在');
    }

    const template = templateRows[0];

    // 权限校验：用户是否能用此模板
    const canUseTemplate = this.permissionService.canViewTemplate(
      {
        id: currentUser.id,
        level: currentUser.level as UserLevel,
        groupId: currentUser.groupId,
        approved: currentUser.approved,
      },
      {
        id: template.id,
        visibility: template.visibility as VisibilityType,
        visibleUserIds: template.visibleUserIds,
        visibleGroupIds: template.visibleGroupIds,
        ownerId: template.ownerId,
      },
    );

    if (!canUseTemplate) {
      throw new ForbiddenException('无权使用此模板');
    }

    // 检查 slug 是否重复
    const existing = await this.db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, dto.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('门户标识已存在');
    }

    // 按角色限制创建参数
    const isGlobalAdmin = this.isGlobalAdmin(currentUser.level);

    // ownerId 限制
    const ownerId = dto.ownerId ?? userId;
    if (!isGlobalAdmin && ownerId !== userId) {
      throw new ForbiddenException('只能创建自己为负责人的门户');
    }

    // groupId 限制：非全局管理员统一绑定本组，不能指定其它分组
    const groupId = this.resolveGroupId(
      currentUser.level,
      currentUser.groupId,
      dto.groupId,
    );

    // visibility 限制：按级别收窄可选项
    this.assertVisibilityAllowed(
      currentUser.level,
      currentUser.groupId,
      dto.visibility,
    );

    // app 类型模板 level_3 不可用
    let appMode = template.type === 'app';
    if (currentUser.level === 'level_3' && appMode) {
      throw new ForbiddenException('普通用户不能创建应用类型的门户');
    }

    const result = await this.db
      .insert(pages)
      .values({
        title: dto.title,
        slug: dto.slug,
        icon: dto.icon ?? null,
        type: template.type as 'html' | 'link',
        htmlContent: template.htmlContent ?? null,
        url: template.url ?? null,
        visibility: dto.visibility,
        visibleUserIds: dto.visibleUserIds ?? [],
        visibleGroupIds: dto.visibleGroupIds ?? [],
        sortOrder: 0,
        enabled: true,
        groupId: groupId ?? null,
        ownerId,
        isDeleted: false,
        appMode,
        templateId: dto.templateId,
      })
      .returning({ id: pages.id });

    const pageId = result[0].id;

    void this.auditService.log(
      userId,
      'create_page_from_template',
      `page:${pageId}`,
      `从模板创建门户: ${dto.title} (模板: ${template.name})`,
    );

    const detailPage = await this.getPageRowById(pageId);
    if (!detailPage) {
      throw new NotFoundException('门户不存在');
    }
    return this.toDto(detailPage);
  }

  // ========== 辅助方法 ==========

  private async getUserGroupIds(userId: string): Promise<string[]> {
    const [memberRows, userRows] = await Promise.all([
      this.db
        .select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.userId, userId)),
      this.db
        .select({ groupId: users.groupId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    ]);
    const ids = new Set<string>();
    memberRows.forEach((row) => ids.add(row.groupId));
    if (userRows[0]?.groupId) ids.add(userRows[0].groupId);
    return [...ids];
  }

  private async getPageRowById(id: string): Promise<PageWithDetails | null> {
    const rows = await this.db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        icon: pages.icon,
        type: pages.type,
        url: pages.url,
        htmlContent: pages.htmlContent,
        visibility: pages.visibility,
        visibleUserIds: pages.visibleUserIds,
        visibleGroupIds: pages.visibleGroupIds,
        sortOrder: pages.sortOrder,
        enabled: pages.enabled,
        groupId: pages.groupId,
        groupName: groups.name,
        ownerId: pages.ownerId,
        ownerNickname: users.nickname,
        isDeleted: pages.isDeleted,
        appMode: pages.appMode,
        templateId: pages.templateId,
        templateName: templates.name,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .leftJoin(users, eq(pages.ownerId, users.id))
      .leftJoin(groups, eq(pages.groupId, groups.id))
      .leftJoin(templates, eq(pages.templateId, templates.id))
      .where(eq(pages.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0] as PageWithDetails;
  }

  // 非全局管理员只能把门户绑定到自己所属分组；全局管理员可自由指定
  private resolveGroupId(
    operatorLevel: string,
    operatorGroupId: string | null,
    requestedGroupId: string | null | undefined,
  ): string | null {
    if (this.isGlobalAdmin(operatorLevel)) {
      return requestedGroupId ?? operatorGroupId ?? null;
    }
    if (requestedGroupId && requestedGroupId !== operatorGroupId) {
      throw new ForbiddenException('只能使用本组作为门户分组');
    }
    return operatorGroupId ?? null;
  }

  // 非全局管理员的可见性按级别收窄；无分组时不得使用 group 可见性
  private assertVisibilityAllowed(
    operatorLevel: string,
    operatorGroupId: string | null,
    visibility: VisibilityType,
  ): void {
    if (this.isGlobalAdmin(operatorLevel)) return;

    if (visibility === 'group') {
      if (!operatorGroupId) {
        throw new ForbiddenException('未加入分组，不能使用分组可见性');
      }
      return;
    }

    if (operatorLevel === 'level_2') {
      throw new ForbiddenException('组长创建的门户可见性只能为 group');
    }

    if (visibility === 'all') {
      throw new ForbiddenException('普通成员不能把门户设为全部可见');
    }
  }

  private canAdminManagePage(
    operatorLevel: string,
    operatorGroupId: string | null,
    page: PageWithDetails,
  ): boolean {
    if (this.isGlobalAdmin(operatorLevel)) return true;
    if (
      operatorLevel === 'level_2' &&
      page.groupId &&
      page.groupId === operatorGroupId
    ) {
      return true;
    }
    return false;
  }

  // 对外开放（openapi）列表：仅返回启用且未删除的门户，且不返回 htmlContent
  async systemListPages(page: number, pageSize: number): Promise<ListResponse<Page>> {
    const offset = (page - 1) * pageSize;
    const visibleCondition = and(
      eq(pages.isDeleted, false),
      eq(pages.enabled, true),
    );
    const selectFields = {
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      icon: pages.icon,
      type: pages.type,
      url: pages.url,
      visibility: pages.visibility,
      visibleUserIds: pages.visibleUserIds,
      sortOrder: pages.sortOrder,
      enabled: pages.enabled,
      groupId: pages.groupId,
      groupName: groups.name,
      ownerId: pages.ownerId,
      ownerNickname: users.nickname,
      isDeleted: pages.isDeleted,
      appMode: pages.appMode,
      templateId: pages.templateId,
      templateName: templates.name,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
    };

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(pages)
        .where(visibleCondition),
      this.db
        .select(selectFields)
        .from(pages)
        .leftJoin(users, eq(pages.ownerId, users.id))
        .leftJoin(groups, eq(pages.groupId, groups.id))
        .leftJoin(templates, eq(pages.templateId, templates.id))
        .where(visibleCondition)
        .orderBy(desc(pages.sortOrder), desc(pages.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    return {
      items: rows.map((row) => this.toDto(row as PageWithDetails)),
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  // 对外开放（openapi）详情：仅启用且未删除的门户可见，保留 htmlContent
  async systemGetPageDetail(id: string): Promise<Page> {
    const row = await this.getPageRowById(id);
    if (!row || row.isDeleted || !row.enabled) {
      throw new NotFoundException('门户不存在');
    }
    return this.toDto(row);
  }

  private toDto(row: PageWithDetails): Page {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      icon: row.icon ?? undefined,
      type: row.type as PageType,
      url: row.url ?? undefined,
      htmlContent: row.htmlContent ?? undefined,
      visibility: row.visibility as VisibilityType,
      visibleUserIds: row.visibleUserIds ?? [],
      visibleGroupIds: row.visibleGroupIds ?? [],
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      groupId: row.groupId ?? undefined,
      groupName: row.groupName ?? undefined,
      ownerId: row.ownerId ?? undefined,
      ownerName: row.ownerNickname ?? undefined,
      isDeleted: row.isDeleted,
      appMode: row.appMode,
      templateId: row.templateId ?? undefined,
      templateName: row.templateName ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
