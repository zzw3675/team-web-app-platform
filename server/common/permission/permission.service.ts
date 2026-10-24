import { Injectable } from '@nestjs/common';
import type { UserLevel, VisibilityType, ScopeType } from '@shared/api.interface';

interface UserRow {
  id: string;
  level: UserLevel;
  groupId?: string | null;
  approved: boolean;
}

interface PageRow {
  id: string;
  visibility: VisibilityType;
  visibleUserIds: string[];
  visibleGroupIds?: string[];
  groupId?: string | null;
  ownerId?: string | null;
}

interface TemplateRow {
  id: string;
  visibility: VisibilityType;
  visibleUserIds: string[];
  visibleGroupIds: string[];
  ownerId?: string | null;
}

interface AppDataRow {
  id: string;
  readScope: ScopeType;
  readUserIds: string[];
  editScope: ScopeType;
  editUserIds: string[];
  ownerId?: string | null;
  ownerGroupId?: string | null;
}

@Injectable()
export class PermissionService {
  isSuperAdmin(user: UserRow): boolean {
    return user.level === 'super_admin';
  }

  isLevel1Admin(user: UserRow): boolean {
    return user.level === 'level_1';
  }

  isLevel2Admin(user: UserRow): boolean {
    return user.level === 'level_2';
  }

  isAdmin(user: UserRow): boolean {
    return (
      user.level === 'super_admin' ||
      user.level === 'level_1' ||
      user.level === 'level_2'
    );
  }

  private isGlobalAdmin(user: UserRow): boolean {
    return user.level === 'super_admin' || user.level === 'level_1';
  }

  private isOwner(user: UserRow, resource: { ownerId?: string | null }): boolean {
    return !!resource.ownerId && resource.ownerId === user.id;
  }

  private isSameGroup(user: UserRow, groupId?: string | null): boolean {
    return !!groupId && !!user.groupId && user.groupId === groupId;
  }

  private isInUserList(userId: string, list: string[]): boolean {
    return list.includes(userId);
  }

  private isInGroupList(
    user: UserRow,
    groupIds: string[],
  ): boolean {
    return !!user.groupId && groupIds.includes(user.groupId);
  }

  canViewPage(
    user: UserRow,
    page: PageRow,
    memberGroupIds: string[] = [],
  ): boolean {
    if (this.isGlobalAdmin(user)) return true;
    if (this.isOwner(user, page)) return true;
    if (!user.approved) return false;

    switch (page.visibility) {
      case 'all':
        return true;
      case 'group': {
        const targetGroups: string[] =
          page.visibleGroupIds && page.visibleGroupIds.length > 0
            ? page.visibleGroupIds
            : page.groupId
              ? [page.groupId]
              : [];
        if (targetGroups.length === 0) return false;
        return (
          this.isInGroupList(user, targetGroups) ||
          targetGroups.some((groupId: string) =>
            memberGroupIds.includes(groupId),
          )
        );
      }
      case 'users':
        return this.isInUserList(user.id, page.visibleUserIds);
      case 'owner':
        return false; // owner 已在上方处理
      default:
        return false;
    }
  }

  canEditPage(user: UserRow, page: PageRow): boolean {
    if (this.isGlobalAdmin(user)) return true;
    if (this.isOwner(user, page)) return true;
    // level_2 组长可以管理本组的门户
    if (
      user.level === 'level_2' &&
      page.groupId &&
      user.groupId === page.groupId
    ) {
      return true;
    }
    return false;
  }

  canViewTemplate(user: UserRow, template: TemplateRow): boolean {
    if (this.isGlobalAdmin(user)) return true;
    if (this.isOwner(user, template)) return true;
    if (!user.approved) return false;

    switch (template.visibility) {
      case 'all':
        return true;
      case 'group':
        return this.isInGroupList(user, template.visibleGroupIds);
      case 'users':
        return this.isInUserList(user.id, template.visibleUserIds);
      case 'owner':
        return false;
      default:
        return false;
    }
  }

  canReadProject(user: UserRow, project: AppDataRow): boolean {
    if (this.isGlobalAdmin(user)) return true;
    if (this.isOwner(user, project)) return true;
    if (!user.approved) return false;

    switch (project.readScope) {
      case 'all':
        return true;
      case 'group':
        // app_data 无 groupId：按项目负责人所属分组判定，同组可见
        return this.isSameGroup(user, project.ownerGroupId);
      case 'users':
        return this.isInUserList(user.id, project.readUserIds);
      case 'owner':
        return false;
      default:
        return false;
    }
  }

  canEditProject(user: UserRow, project: AppDataRow): boolean {
    if (this.isGlobalAdmin(user)) return true;
    if (!this.canReadProject(user, project)) return false;
    if (this.isOwner(user, project)) return true;

    switch (project.editScope) {
      case 'all':
        return true;
      case 'group':
        return this.isSameGroup(user, project.ownerGroupId);
      case 'users':
        return this.isInUserList(user.id, project.editUserIds);
      case 'owner':
        return false;
      default:
        return false;
    }
  }
}
