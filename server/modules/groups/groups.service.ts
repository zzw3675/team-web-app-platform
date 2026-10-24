import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
} from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import { groupMembers, groups, pages, users } from '@server/database/schema';
import { AuditService } from '@server/common/audit/audit.service';
import { escapeLikePattern } from '@server/common/utils/escape-like';
import type { Group, GroupOption, ListResponse } from '@shared/api.interface';
import type { CreateGroupDto } from './dto/create-group.dto';
import type { UpdateGroupDto } from './dto/update-group.dto';

export interface GroupListItem extends Group {
  memberCount: number;
}

interface GroupWithLeader {
  id: string;
  name: string;
  remark: string | null;
  leaderId: string | null;
  leaderNickname: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class GroupsService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditService: AuditService,
  ) {}

  async getList(params: {
    page: number;
    pageSize: number;
    keyword?: string;
  }): Promise<ListResponse<GroupListItem>> {
    const { page, pageSize, keyword } = params;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (keyword) {
      const escapedKeyword = escapeLikePattern(keyword);
      conditions.push(
        or(
          ilike(groups.name, `%${escapedKeyword}%`),
          ilike(groups.remark, `%${escapedKeyword}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(groups)
        .where(whereClause),
      this.db
        .select({
          id: groups.id,
          name: groups.name,
          remark: groups.remark,
          leaderId: groups.leaderId,
          leaderNickname: users.nickname,
          createdAt: groups.createdAt,
          updatedAt: groups.updatedAt,
        })
        .from(groups)
        .leftJoin(users, eq(groups.leaderId, users.id))
        .where(whereClause)
        .orderBy(desc(groups.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    const groupIds = rows.map((row: GroupWithLeader) => row.id);
    const memberCountMap = new Map<string, number>();
    if (groupIds.length > 0) {
      const memberCounts = await this.db
        .select({ groupId: users.groupId, total: count() })
        .from(users)
        .where(inArray(users.groupId, groupIds))
        .groupBy(users.groupId);
      for (const item of memberCounts) {
        if (item.groupId) {
          memberCountMap.set(item.groupId, Number(item.total));
        }
      }
    }

    return {
      items: rows.map((row: GroupWithLeader) => ({
        ...this.toDto(row),
        memberCount: memberCountMap.get(row.id) ?? 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getDetail(id: string): Promise<Group> {
    const rows = await this.db
      .select({
        id: groups.id,
        name: groups.name,
        remark: groups.remark,
        leaderId: groups.leaderId,
        leaderNickname: users.nickname,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
      })
      .from(groups)
      .leftJoin(users, eq(groups.leaderId, users.id))
      .where(eq(groups.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('分组不存在');
    }

    return this.toDto(rows[0] as GroupWithLeader);
  }

  async create(dto: CreateGroupDto, operatorId: string): Promise<Group> {
    // 检查名称是否重复
    const existing = await this.db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.name, dto.name))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('分组名称已存在');
    }

    // 如果设置了组长，验证用户存在
    if (dto.leaderId) {
      const leaderExists = await this.db
        .select({ id: users.id, level: users.level })
        .from(users)
        .where(eq(users.id, dto.leaderId))
        .limit(1);
      if (leaderExists.length === 0) {
        throw new BadRequestException('组长用户不存在');
      }
    }

    const result = await this.db.transaction(async (tx) => {
      const insertResult = await tx
        .insert(groups)
        .values({
          name: dto.name,
          remark: dto.remark,
          leaderId: dto.leaderId ?? null,
        })
        .returning({ id: groups.id });

      const groupId = insertResult[0].id;

      // 如果设置了组长且用户是 level_3，升级为 level_2
      if (dto.leaderId) {
        const leaderRows = await tx
          .select({ level: users.level })
          .from(users)
          .where(eq(users.id, dto.leaderId))
          .limit(1);
        if (leaderRows.length > 0 && leaderRows[0].level === 'level_3') {
          await tx
            .update(users)
            .set({ level: 'level_2' })
            .where(eq(users.id, dto.leaderId));
        }
      }

      return groupId;
    });

    void this.auditService.log(
      operatorId,
      'create_group',
      `group:${result}`,
      `创建分组: ${dto.name}`,
    );

    return this.getDetail(result);
  }

  async update(
    id: string,
    dto: UpdateGroupDto,
    operatorId: string,
  ): Promise<Group> {
    const existing = await this.db
      .select({ id: groups.id, name: groups.name, leaderId: groups.leaderId })
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('分组不存在');
    }

    // 如果改了名字，检查是否重复
    if (dto.name && dto.name !== existing[0].name) {
      const duplicate = await this.db
        .select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.name, dto.name)))
        .limit(1);

      if (duplicate.length > 0) {
        throw new ConflictException('分组名称已存在');
      }
    }

    // 校验新组长
    if (dto.leaderId && dto.leaderId !== existing[0].leaderId) {
      const leaderExists = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, dto.leaderId))
        .limit(1);
      if (leaderExists.length === 0) {
        throw new BadRequestException('组长用户不存在');
      }
    }

    const oldLeaderId = existing[0].leaderId;
    const newLeaderId = dto.leaderId !== undefined ? dto.leaderId : oldLeaderId;

    // leader 变化时需要事务处理 level 调整
    if (dto.leaderId !== undefined && oldLeaderId !== newLeaderId) {
      await this.db.transaction(async (tx) => {
        const patch: Record<string, unknown> = {};
        if (dto.name !== undefined) patch.name = dto.name;
        if (dto.remark !== undefined) patch.remark = dto.remark;
        patch.leaderId = newLeaderId;

        await tx.update(groups).set(patch).where(eq(groups.id, id));

        // 新组长：如果是 level_3，升级为 level_2
        if (newLeaderId) {
          const newLeaderRows = await tx
            .select({ level: users.level })
            .from(users)
            .where(eq(users.id, newLeaderId))
            .limit(1);
          if (newLeaderRows.length > 0 && newLeaderRows[0].level === 'level_3') {
            await tx
              .update(users)
              .set({ level: 'level_2' })
              .where(eq(users.id, newLeaderId));
          }
        }

        // 旧组长：检查是否还担任其他组的组长，如果没有且原来是 level_2，降级为 level_3
        if (oldLeaderId) {
          const otherGroups = await tx
            .select({ id: groups.id })
            .from(groups)
            .where(eq(groups.leaderId, oldLeaderId))
            .limit(1);
          if (otherGroups.length === 0) {
            const oldLeaderRows = await tx
              .select({ level: users.level })
              .from(users)
              .where(eq(users.id, oldLeaderId))
              .limit(1);
            if (
              oldLeaderRows.length > 0 &&
              oldLeaderRows[0].level === 'level_2'
            ) {
              await tx
                .update(users)
                .set({ level: 'level_3' })
                .where(eq(users.id, oldLeaderId));
            }
          }
        }
      });
    } else {
      // leader 没变化，只更新名字和备注
      const patch: Record<string, unknown> = {};
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.remark !== undefined) patch.remark = dto.remark;

      if (Object.keys(patch).length === 0) {
        return this.getDetail(id);
      }

      await this.db.update(groups).set(patch).where(eq(groups.id, id));
    }

    void this.auditService.log(
      operatorId,
      'update_group',
      `group:${id}`,
      `更新分组: ${JSON.stringify(dto)}`,
    );

    return this.getDetail(id);
  }

  async addMembers(
    groupId: string,
    userIds: string[],
    operatorId: string,
  ): Promise<{ added: number }> {
    const groupRows = await this.db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (groupRows.length === 0) {
      throw new NotFoundException('分组不存在');
    }

    const uniqueIds: string[] = [...new Set(userIds)];
    const userRows = await this.db
      .select({
        id: users.id,
        approved: users.approved,
        groupId: users.groupId,
      })
      .from(users)
      .where(inArray(users.id, uniqueIds));

    if (userRows.length !== uniqueIds.length) {
      throw new BadRequestException('存在无效的用户');
    }
    if (userRows.some((row) => !row.approved)) {
      throw new BadRequestException('待审核用户不能加入分组');
    }

    const inserted = await this.db
      .insert(groupMembers)
      .values(uniqueIds.map((userId: string) => ({ groupId, userId })))
      .onConflictDoNothing()
      .returning({ id: groupMembers.id });

    const needPrimaryGroup = userRows
      .filter((row) => !row.groupId)
      .map((row) => row.id);
    if (needPrimaryGroup.length > 0) {
      await this.db
        .update(users)
        .set({ groupId })
        .where(inArray(users.id, needPrimaryGroup));
    }

    void this.auditService.log(
      operatorId,
      'add_group_members',
      `group:${groupId}`,
      `向分组「${groupRows[0].name}」添加 ${inserted.length} 名成员`,
    );

    return { added: inserted.length };
  }

  async removeMember(
    groupId: string,
    userId: string,
    operatorId: string,
  ): Promise<void> {
    const groupRows = await this.db
      .select({ id: groups.id, name: groups.name, leaderId: groups.leaderId })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (groupRows.length === 0) {
      throw new NotFoundException('分组不存在');
    }

    const removed = await this.db
      .delete(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
      )
      .returning({ id: groupMembers.id });

    if (removed.length === 0) {
      throw new NotFoundException('该用户不在此分组');
    }

    const userRows = await this.db
      .select({ id: users.id, groupId: users.groupId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRows.length > 0 && userRows[0].groupId === groupId) {
      const remaining = await this.db
        .select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.userId, userId))
        .limit(1);
      await this.db
        .update(users)
        .set({ groupId: remaining[0]?.groupId ?? null })
        .where(eq(users.id, userId));
    }

    if (groupRows[0].leaderId === userId) {
      await this.db
        .update(groups)
        .set({ leaderId: null })
        .where(eq(groups.id, groupId));

      const otherLeaderGroups = await this.db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.leaderId, userId))
        .limit(1);
      if (otherLeaderGroups.length === 0) {
        await this.db
          .update(users)
          .set({ level: 'level_3' })
          .where(and(eq(users.id, userId), eq(users.level, 'level_2')));
      }
    }

    void this.auditService.log(
      operatorId,
      'remove_group_member',
      `group:${groupId}`,
      `从分组「${groupRows[0].name}」移除成员`,
    );
  }

  async delete(id: string, operatorId: string): Promise<void> {
    const existing = await this.db
      .select({ id: groups.id, name: groups.name, leaderId: groups.leaderId })
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('分组不存在');
    }

    // 检查组内是否有用户
    const userCount = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.groupId, id));

    if (Number(userCount[0]?.count ?? 0) > 0) {
      throw new BadRequestException('分组内仍有用户，无法删除');
    }

    // 检查分组下是否还有未删除的门户
    const pageCount = await this.db
      .select({ count: count() })
      .from(pages)
      .where(and(eq(pages.groupId, id), eq(pages.isDeleted, false)));

    if (Number(pageCount[0]?.count ?? 0) > 0) {
      throw new BadRequestException('该分组下仍有门户，无法删除');
    }

    const leaderId = existing[0].leaderId;

    await this.db.transaction(async (tx) => {
      await tx.delete(groups).where(eq(groups.id, id));

      // 旧组长：检查是否还担任其他组的组长，如果没有且是 level_2，降级为 level_3
      if (leaderId) {
        const otherGroups = await tx
          .select({ id: groups.id })
          .from(groups)
          .where(eq(groups.leaderId, leaderId))
          .limit(1);
        if (otherGroups.length === 0) {
          const leaderRows = await tx
            .select({ level: users.level })
            .from(users)
            .where(eq(users.id, leaderId))
            .limit(1);
          if (
            leaderRows.length > 0 &&
            leaderRows[0].level === 'level_2'
          ) {
            await tx
              .update(users)
              .set({ level: 'level_3' })
              .where(eq(users.id, leaderId));
          }
        }
      }
    });

    void this.auditService.log(
      operatorId,
      'delete_group',
      `group:${id}`,
      `删除分组: ${existing[0].name}`,
    );
  }

  // 任意登录用户可用：分组下拉选项
  async listOptions(): Promise<GroupOption[]> {
    const rows = await this.db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .orderBy(asc(groups.name));

    return rows.map((row: { id: string; name: string }) => ({
      id: row.id,
      name: row.name,
    }));
  }

  // 辅助：检查用户是否在某组
  async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.groupId, groupId)))
      .limit(1);
    return rows.length > 0;
  }

  // 辅助：获取分组的 leaderId
  async getGroupLeader(groupId: string): Promise<string | null> {
    const rows = await this.db
      .select({ leaderId: groups.leaderId })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0].leaderId ?? null;
  }

  private toDto(row: GroupWithLeader): Group {
    return {
      id: row.id,
      name: row.name,
      remark: row.remark ?? undefined,
      leaderId: row.leaderId ?? undefined,
      leaderName: row.leaderNickname ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
