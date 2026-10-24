import type { UserLevel } from '@shared/api.interface';

/** Select 中代表「全部」的占位值 */
export const ALL_VALUE = '__all__';

/** Select 中代表「未分组 / 无」的占位值 */
export const NO_GROUP_VALUE = '__none__';

export type UserStatusFilter = 'all' | 'pending' | 'approved';

export type LevelFilter = UserLevel | 'all';

export const statusOptions: UserStatusFilter[] = ['all', 'pending', 'approved'];

export const statusLabels: Record<UserStatusFilter, string> = {
  all: '全部状态',
  pending: '待审核',
  approved: '已审核',
};

export const levelLabels: Record<UserLevel, string> = {
  super_admin: '超级管理员',
  level_1: '一级管理员',
  level_2: '二级管理员',
  level_3: '普通用户',
};

export interface LevelOption {
  value: UserLevel;
  label: string;
}

/** 管理端可授予的级别（不含内置的超级管理员） */
export const assignableLevels: LevelOption[] = [
  { value: 'level_1', label: '一级管理员' },
  { value: 'level_2', label: '二级管理员' },
  { value: 'level_3', label: '普通用户' },
];

/** 筛选栏使用的全部级别选项（含内置超级管理员） */
export const levelFilterOptions: LevelOption[] = [
  { value: 'super_admin', label: levelLabels.super_admin },
  ...assignableLevels,
];
