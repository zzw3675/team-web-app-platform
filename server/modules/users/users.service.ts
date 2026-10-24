import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import {
  appData,
  auditLogs,
  groupMembers,
  groups,
  history,
  jizhangRecords,
  pages,
  templates,
  users,
} from '@server/database/schema';
import { AuditService } from '@server/common/audit/audit.service';
import { escapeLikePattern } from '@server/common/utils/escape-like';
import { hashPassword } from '@server/common/utils/password';
import type {
  ListResponse,
  OrganizationGroup,
  OrganizationMember,
  OrganizationResponse,
  User,
  UserDirectoryItem,
  UserLevel,
  UserOverviewResponse,
} from '@shared/api.interface';
import type { ListUsersDto } from './dto/list-users.dto';
import type { UserDirectoryQueryDto } from './dto/user-directory-query.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { ApproveUserDto } from './dto/approve-user.dto';
import type { CreateUserDto } from './dto/create-user.dto';

interface UserWithGroup {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatar: string | null;
  level: string;
  groupId: string | null;
  approved: boolean;
  resetToken: string | null;
  resetTokenExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
  groupName: string | null;
}

interface UserInfo {
  groupId: string | null;
  level: string;
}

interface ManageableTarget {
  level: string;
  groupId: string | null;
}

interface DirectoryRow {
  id: string;
  nickname: string;
  level: string;
}

export interface GroupCountItem {
  groupId: string | null;
  count: number;
}

function generateRandomPassword(length = 12): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(0, chars.length));
  }
  return result;
}

const GLOBAL_ADMIN_LEVELS: UserLevel[] = ['super_admin', 'level_1'];

// 组长只能管理普通成员（level_3），且必须与自己在同一分组
const GROUP_LEADER_MANAGEABLE_LEVEL = 'level_3';

const DIRECTORY_DEFAULT_LIMIT = 20;
const DIRECTORY_MAX_LIMIT = 50;
const DIRECTORY_MAX_IDS = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditService: AuditService,
  ) {}

  private isGlobalAdmin(level: string): boolean {
    return GLOBAL_ADMIN_LEVELS.includes(level as UserLevel);
  }

  // 非全局管理员（组长）只能操作本组的普通成员
  private assertCanManageTarget(
    operatorLevel: string,
    operatorGroupId: string | null,
    target: ManageableTarget,
  ): void {
    if (this.isGlobalAdmin(operatorLevel)) return;

    const isSameGroupLeader =
      operatorLevel === 'level_2' &&
      operatorGroupId !== null &&
      target.groupId !== null &&
      target.groupId === operatorGroupId;

    if (!isSameGroupLeader || target.level !== GROUP_LEADER_MANAGEABLE_LEVEL) {
      throw new ForbiddenException('权限不足');
    }
  }

  async getUserInfo(userId: string): Promise<UserInfo | null> {
    const rows = await this.db
      .select({ groupId: users.groupId, level: users.level })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) return null;
    return {
      groupId: rows[0].groupId ?? null,
      level: rows[0].level,
    };
  }

  async getList(
    dto: ListUsersDto,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<ListResponse<User>> {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // 权限过滤：level_2 只能看本组用户
    if (!this.isGlobalAdmin(operatorLevel)) {
      if (operatorLevel === 'level_2' && operatorGroupId) {
        conditions.push(eq(users.groupId, operatorGroupId));
      } else {
        // 普通用户看不到管理列表
        conditions.push(sql`false`);
      }
    }

    if (dto.keyword) {
      const keywordPattern = `%${escapeLikePattern(dto.keyword)}%`;
      conditions.push(
        or(
          ilike(users.email, keywordPattern),
          ilike(users.nickname, keywordPattern),
        ),
      );
    }

    if (dto.level) {
      conditions.push(eq(users.level, dto.level));
    }

    if (dto.approved !== undefined) {
      if (dto.approved === 'true' || dto.approved === 'approved') {
        conditions.push(eq(users.approved, true));
      } else if (dto.approved === 'false' || dto.approved === 'pending') {
        conditions.push(eq(users.approved, false));
      }
    }

    if (dto.groupId) {
      conditions.push(eq(users.groupId, dto.groupId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(users)
        .where(whereClause),
      this.db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          nickname: users.nickname,
          avatar: users.avatar,
          level: users.level,
          groupId: users.groupId,
          approved: users.approved,
          resetToken: users.resetToken,
          resetTokenExpires: users.resetTokenExpires,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          groupName: groups.name,
        })
        .from(users)
        .leftJoin(groups, eq(users.groupId, groups.id))
        .where(whereClause)
        .orderBy(
          // 待审核置顶
          desc(users.approved),
          desc(users.createdAt),
        )
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: UserWithGroup) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async getDetail(
    id: string,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<User> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        nickname: users.nickname,
        avatar: users.avatar,
        level: users.level,
        groupId: users.groupId,
        approved: users.approved,
        resetToken: users.resetToken,
        resetTokenExpires: users.resetTokenExpires,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        groupName: groups.name,
      })
      .from(users)
      .leftJoin(groups, eq(users.groupId, groups.id))
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const user = rows[0] as UserWithGroup;

    // 权限校验
    if (!this.isGlobalAdmin(operatorLevel)) {
      if (
        operatorLevel === 'level_2' &&
        user.groupId &&
        user.groupId === operatorGroupId
      ) {
        // 组长可以看本组用户
      } else {
        throw new ForbiddenException('权限不足');
      }
    }

    return this.toDto(user);
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<User> {
    // 不能修改自己
    if (operatorId === id) {
      throw new ForbiddenException('不能修改自己的用户信息');
    }

    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const targetUser = rows[0] as UserWithGroup;

    // 权限校验：组长只能改本组的普通成员
    this.assertCanManageTarget(operatorLevel, operatorGroupId, targetUser);

    this.assertCanAssignLevel(operatorLevel, dto.level);

    const patch: Partial<typeof users.$inferInsert> = {};
    if (dto.level !== undefined) patch.level = dto.level;
    // 未传（undefined）表示不改动，显式传 null 表示清空分组
    if (dto.groupId !== undefined) patch.groupId = dto.groupId;
    if (dto.nickname !== undefined) patch.nickname = dto.nickname;
    if (dto.avatar !== undefined) patch.avatar = dto.avatar;
    if (dto.approved !== undefined) patch.approved = dto.approved;

    if (Object.keys(patch).length === 0) {
      return this.getDetail(id, operatorId, operatorLevel, operatorGroupId);
    }

    await this.db.update(users).set(patch).where(eq(users.id, id));

    void this.auditService.log(
      operatorId,
      'update_user',
      `user:${id}`,
      `更新用户: ${JSON.stringify(patch)}`,
    );

    return this.getDetail(id, operatorId, operatorLevel, operatorGroupId);
  }

  async approveUser(
    id: string,
    dto: ApproveUserDto,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<User> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const targetUser = rows[0] as UserWithGroup;

    // 权限校验：组长只能审核本组的普通成员
    this.assertCanManageTarget(operatorLevel, operatorGroupId, targetUser);

    this.assertCanAssignLevel(operatorLevel, dto.level);

    if (targetUser.approved) {
      throw new BadRequestException('用户已审核通过');
    }

    const patch: Record<string, unknown> = {
      approved: true,
    };
    if (dto.level) patch.level = dto.level;
    if (dto.groupId !== undefined) patch.groupId = dto.groupId;

    await this.db.update(users).set(patch).where(eq(users.id, id));

    void this.auditService.log(
      operatorId,
      'approve_user',
      `user:${id}`,
      `审核通过用户: ${targetUser.email}`,
    );

    return this.getDetail(id, operatorId, operatorLevel, operatorGroupId);
  }

  async rejectUser(
    id: string,
    operatorId: string,
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<User> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const targetUser = rows[0] as UserWithGroup;

    // 权限校验：组长只能拒绝本组的普通成员
    this.assertCanManageTarget(operatorLevel, operatorGroupId, targetUser);

    await this.db
      .update(users)
      .set({ approved: false })
      .where(eq(users.id, id));

    void this.auditService.log(
      operatorId,
      'reject_user',
      `user:${id}`,
      `拒绝/禁用用户: ${targetUser.email}`,
    );

    return this.getDetail(id, operatorId, operatorLevel, operatorGroupId);
  }

  async createUser(
    dto: CreateUserDto,
    operatorId: string,
    operatorLevel: string,
  ): Promise<User> {
    if (!this.isGlobalAdmin(operatorLevel)) {
      throw new ForbiddenException('权限不足');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('该邮箱已被注册');
    }

    const passwordHash = await hashPassword(dto.password);
    const inserted = await this.db
      .insert(users)
      .values({
        email,
        passwordHash,
        nickname: dto.nickname.trim(),
        level: dto.level ?? 'level_3',
        groupId: dto.groupId ?? null,
        approved: true,
      })
      .returning({ id: users.id });

    if (inserted.length === 0) {
      throw new BadRequestException('创建用户失败');
    }

    void this.auditService.log(
      operatorId,
      'create_user',
      `user:${inserted[0].id}`,
      `管理员创建用户: ${email}`,
    );

    return this.getDetail(
      inserted[0].id,
      operatorId,
      operatorLevel,
      null,
    );
  }

  async resetPassword(
    id: string,
    operatorId: string,
    operatorLevel: string,
  ): Promise<{ newPassword: string }> {
    if (!this.isGlobalAdmin(operatorLevel)) {
      throw new ForbiddenException('权限不足');
    }

    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const newPassword = generateRandomPassword();
    const newHash = await hashPassword(newPassword);

    await this.db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, id));

    void this.auditService.log(
      operatorId,
      'reset_password_admin',
      `user:${id}`,
      `管理员重置密码: ${rows[0].email}`,
    );

    return { newPassword };
  }

  async deleteUser(
    id: string,
    operatorId: string,
    operatorLevel: string,
  ): Promise<void> {
    if (!this.isGlobalAdmin(operatorLevel)) {
      throw new ForbiddenException('权限不足');
    }

    // 不能删除自己
    if (operatorId === id) {
      throw new BadRequestException('不能删除自己');
    }

    const rows = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const deletedCount = await this.db.transaction(async (tx) => {
      // 先解除所有无级联的外键引用（保留审计/历史行本身，仅置空操作人）
      await tx
        .update(auditLogs)
        .set({ operatorId: null })
        .where(eq(auditLogs.operatorId, id));
      await tx
        .update(history)
        .set({ operatorId: null })
        .where(eq(history.operatorId, id));
      await tx
        .update(pages)
        .set({ ownerId: null })
        .where(eq(pages.ownerId, id));
      await tx
        .update(appData)
        .set({ ownerId: null })
        .where(eq(appData.ownerId, id));
      await tx
        .update(jizhangRecords)
        .set({ recorderId: null })
        .where(eq(jizhangRecords.recorderId, id));
      await tx
        .update(jizhangRecords)
        .set({ ownerId: null })
        .where(eq(jizhangRecords.ownerId, id));
      await tx
        .update(groups)
        .set({ leaderId: null })
        .where(eq(groups.leaderId, id));

      // 从各类名单中移除该用户 id，避免残留引用
      await tx
        .update(pages)
        .set({
          visibleUserIds: sql`array_remove(${pages.visibleUserIds}, ${id}::uuid)`,
        })
        .where(sql`${id}::uuid = ANY(${pages.visibleUserIds})`);
      await tx
        .update(templates)
        .set({
          visibleUserIds: sql`array_remove(${templates.visibleUserIds}, ${id}::uuid)`,
        })
        .where(sql`${id}::uuid = ANY(${templates.visibleUserIds})`);
      await tx
        .update(appData)
        .set({
          readUserIds: sql`array_remove(${appData.readUserIds}, ${id}::uuid)`,
          editUserIds: sql`array_remove(${appData.editUserIds}, ${id}::uuid)`,
        })
        .where(
          or(
            sql`${id}::uuid = ANY(${appData.readUserIds})`,
            sql`${id}::uuid = ANY(${appData.editUserIds})`,
          ),
        );

      const deleted = await tx
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });

      if (deleted.length === 0) {
        throw new NotFoundException('用户不存在');
      }

      return deleted.length;
    });

    if (deletedCount === 0) {
      throw new NotFoundException('用户不存在');
    }

    void this.auditService.log(
      operatorId,
      'delete_user',
      `user:${id}`,
      `删除用户: ${rows[0].email}`,
    );
  }

  async getOverview(
    operatorLevel: string,
    operatorGroupId: string | null,
  ): Promise<UserOverviewResponse> {
    const conditions = [];

    if (!this.isGlobalAdmin(operatorLevel)) {
      if (operatorLevel === 'level_2' && operatorGroupId) {
        conditions.push(eq(users.groupId, operatorGroupId));
      } else {
        conditions.push(sql`false`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, pendingResult, approvedResult, level1Result, level2Result, level3Result] =
      await Promise.all([
        this.db.select({ count: count() }).from(users).where(whereClause),
        this.db
          .select({ count: count() })
          .from(users)
          .where(
            whereClause
              ? and(whereClause, eq(users.approved, false))
              : eq(users.approved, false),
          ),
        this.db
          .select({ count: count() })
          .from(users)
          .where(
            whereClause
              ? and(whereClause, eq(users.approved, true))
              : eq(users.approved, true),
          ),
        this.db
          .select({ count: count() })
          .from(users)
          .where(
            whereClause
              ? and(whereClause, eq(users.level, 'level_1'))
              : eq(users.level, 'level_1'),
          ),
        this.db
          .select({ count: count() })
          .from(users)
          .where(
            whereClause
              ? and(whereClause, eq(users.level, 'level_2'))
              : eq(users.level, 'level_2'),
          ),
        this.db
          .select({ count: count() })
          .from(users)
          .where(
            whereClause
              ? and(whereClause, eq(users.level, 'level_3'))
              : eq(users.level, 'level_3'),
          ),
      ]);

    return {
      total: Number(totalResult[0]?.count ?? 0),
      pending: Number(pendingResult[0]?.count ?? 0),
      approved: Number(approvedResult[0]?.count ?? 0),
      level1: Number(level1Result[0]?.count ?? 0),
      level2: Number(level2Result[0]?.count ?? 0),
      level3: Number(level3Result[0]?.count ?? 0),
    };
  }

  private assertCanAssignLevel(
    operatorLevel: string,
    targetLevel?: string,
  ): void {
    if (!targetLevel) return;

    if (targetLevel === 'super_admin') {
      throw new ForbiddenException('超级管理员为系统内置角色，不可授予');
    }

    if (operatorLevel === 'level_2' && targetLevel === 'level_1') {
      throw new ForbiddenException('组长无权设置为一级管理员');
    }
  }

  async getOrganization(): Promise<OrganizationResponse> {
    const [groupRows, userRows, memberRows] = await Promise.all([
      this.db
        .select({
          id: groups.id,
          name: groups.name,
          remark: groups.remark,
          leaderId: groups.leaderId,
        })
        .from(groups)
        .orderBy(asc(groups.name)),
      this.db
        .select({
          id: users.id,
          nickname: users.nickname,
          level: users.level,
          approved: users.approved,
        })
        .from(users),
      this.db
        .select({
          groupId: groupMembers.groupId,
          userId: groupMembers.userId,
        })
        .from(groupMembers),
    ]);

    const levelWeight: Record<string, number> = {
      super_admin: 0,
      level_1: 1,
      level_2: 2,
      level_3: 3,
    };

    const userMap = new Map<string, OrganizationMember>();
    for (const row of userRows) {
      userMap.set(row.id, {
        id: row.id,
        nickname: row.nickname,
        level: row.level as UserLevel,
        approved: row.approved,
      });
    }

    const membersByGroup = new Map<string, OrganizationMember[]>();
    const groupedUserIds = new Set<string>();
    for (const row of memberRows) {
      const member = userMap.get(row.userId);
      if (!member) continue;
      groupedUserIds.add(row.userId);
      const list = membersByGroup.get(row.groupId) ?? [];
      list.push(member);
      membersByGroup.set(row.groupId, list);
    }

    const groupList: OrganizationGroup[] = groupRows.map((row) => {
      const members = (membersByGroup.get(row.id) ?? []).sort(
        (a: OrganizationMember, b: OrganizationMember) => {
          if (a.id === row.leaderId) return -1;
          if (b.id === row.leaderId) return 1;
          const diff = levelWeight[a.level] - levelWeight[b.level];
          if (diff !== 0) return diff;
          return a.nickname.localeCompare(b.nickname, 'zh-Hans-CN');
        },
      );
      return {
        id: row.id,
        name: row.name,
        remark: row.remark ?? undefined,
        leaderId: row.leaderId ?? undefined,
        leaderName: row.leaderId
          ? userMap.get(row.leaderId)?.nickname
          : undefined,
        members,
      };
    });

    const ungrouped: OrganizationMember[] = userRows
      .map((row) => userMap.get(row.id))
      .filter((item): item is OrganizationMember => item !== undefined)
      .filter((item: OrganizationMember) => !groupedUserIds.has(item.id))
      .sort((a: OrganizationMember, b: OrganizationMember) =>
        a.nickname.localeCompare(b.nickname, 'zh-Hans-CN'),
      );

    return { groups: groupList, ungrouped };
  }

  async getGroupCounts(): Promise<{ items: GroupCountItem[] }> {
    const rows = await this.db
      .select({ groupId: users.groupId, count: count() })
      .from(users)
      .groupBy(users.groupId);

    return {
      items: rows.map((row: { groupId: string | null; count: number }) => ({
        groupId: row.groupId ?? null,
        count: Number(row.count),
      })),
    };
  }

  // 辅助：获取用户的 groupId
  async getUserGroupId(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ groupId: users.groupId, level: users.level })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0].groupId ?? null;
  }

  // 人员目录：任何已登录用户可查询已审核用户的精简信息
  async getDirectory(
    query: UserDirectoryQueryDto,
  ): Promise<UserDirectoryItem[]> {
    const limit = this.resolveDirectoryLimit(query.limit);
    const hasIdsParam =
      typeof query.ids === 'string' && query.ids.trim().length > 0;
    const ids = this.parseDirectoryIds(query.ids);

    if (hasIdsParam && ids.length === 0) {
      return [];
    }

    const conditions: SQL[] = [eq(users.approved, true)];

    if (ids.length > 0) {
      conditions.push(inArray(users.id, ids));
    } else if (query.keyword && query.keyword.trim().length > 0) {
      const keywordPattern = `%${escapeLikePattern(query.keyword.trim())}%`;
      const keywordCondition = or(
        ilike(users.nickname, keywordPattern),
        ilike(users.email, keywordPattern),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }

    const rows = await this.db
      .select({ id: users.id, nickname: users.nickname, level: users.level })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit);

    return rows.map((row: DirectoryRow) => ({
      id: row.id,
      nickname: row.nickname,
      level: row.level as UserLevel,
    }));
  }

  private resolveDirectoryLimit(raw: string | undefined): number {
    const parsed = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DIRECTORY_DEFAULT_LIMIT;
    }
    return Math.min(parsed, DIRECTORY_MAX_LIMIT);
  }

  private parseDirectoryIds(raw: string | undefined): string[] {
    if (!raw) return [];

    const uniqueIds = new Set<string>();
    for (const part of raw.split(',')) {
      const value = part.trim();
      if (!UUID_PATTERN.test(value)) continue;
      uniqueIds.add(value);
      if (uniqueIds.size >= DIRECTORY_MAX_IDS) break;
    }

    return [...uniqueIds];
  }

  private toDto(row: UserWithGroup): User {
    return {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
      avatar: row.avatar ?? undefined,
      level: row.level as UserLevel,
      groupId: row.groupId ?? undefined,
      groupName: row.groupName ?? undefined,
      approved: row.approved,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
