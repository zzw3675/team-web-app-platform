import dayjs from 'dayjs';
import type {
  AppData,
  JizhangRecord,
  ScopeType,
  UserLevel,
} from '@shared/api.interface';
import { jizhangApi } from '@client/src/api';

/** 记账分类 */
export const JIZHANG_CATEGORIES: string[] = [
  '餐饮',
  '交通',
  '购物',
  '居家',
  '医疗',
  '教育',
  '娱乐',
  '工资',
  '其他',
];

/** 可读范围文案 */
export const READ_SCOPE_LABELS: Record<ScopeType, string> = {
  all: '所有人可读',
  group: '指定组可读',
  owner: '仅负责人可读',
  users: '指定成员可读',
};

/** 编辑范围文案 */
export const EDIT_SCOPE_LABELS: Record<ScopeType, string> = {
  all: '所有人可编辑',
  group: '指定组可编辑',
  owner: '仅负责人可编辑',
  users: '指定成员可编辑',
};

export interface ScopeOption {
  value: ScopeType;
  label: string;
}

/** 可读范围选项 */
export const READ_SCOPE_OPTIONS: ScopeOption[] = [
  { value: 'all', label: '所有人' },
  { value: 'group', label: '指定组' },
  { value: 'owner', label: '仅负责人' },
  { value: 'users', label: '指定成员' },
];

/** 编辑范围选项 */
export const EDIT_SCOPE_OPTIONS: ScopeOption[] = [
  { value: 'owner', label: '仅负责人' },
  { value: 'group', label: '指定组' },
  { value: 'all', label: '所有人' },
  { value: 'users', label: '指定成员' },
];

/** 金额统一保留两位小数 */
export function formatAmount(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

/** 今日日期字符串 YYYY-MM-DD */
export function todayString(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** 把后端可能返回的 ISO 时间裁剪为 YYYY-MM-DD */
export function normalizeDateString(value: string | null | undefined): string {
  if (!value) return todayString();
  const matched = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return matched ? matched[0] : dayjs(value).format('YYYY-MM-DD');
}

/** YYYY-MM-DD -> Date（本地零点） */
export function toDateObject(value: string): Date {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.toDate() : new Date();
}

/** Date -> YYYY-MM-DD */
export function toDateString(value: Date): string {
  return dayjs(value).format('YYYY-MM-DD');
}

/** 解析逗号/顿号/空白分隔的用户 ID 列表 */
export function parseUserIdList(text: string): string[] {
  const parts = text
    .split(/[\s,，、;；]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(parts));
}

/** 判断编辑范围是否宽于可读范围（前端基本提示，后端强制校验） */
export function isEditScopeWiderThanRead(
  readScope: ScopeType,
  editScope: ScopeType,
): boolean {
  if (readScope === 'all') return false;
  if (editScope === 'all') return true;
  if (editScope === 'owner') return false;
  if (editScope === 'group') return readScope === 'owner' || readScope === 'users';
  // editScope === 'users'
  return readScope === 'owner';
}

/** 单次拉取记录的分页大小（后端 pageSize 上限为 100） */
export const RECORD_FETCH_PAGE_SIZE = 100;

/** 全量拉取的页数上限，防止极端数据量下无限循环 */
export const RECORD_FETCH_MAX_PAGES = 100;

export interface RecordFetchFilters {
  dateFrom?: string;
  dateTo?: string;
  incomeExpense?: 'income' | 'expense';
  category?: string;
}

export interface AllRecordsResult {
  items: JizhangRecord[];
  total: number;
  /** true = 已取回全部记录；false = 达到页数上限被截断 */
  complete: boolean;
}

/**
 * 按筛选条件循环分页拉取项目全量记录。
 * 用于导出存档等需要「与页头统计一致的全量明细」的场景。
 */
export async function fetchAllProjectRecords(
  projectId: string,
  filters: RecordFetchFilters = {},
  pageSize: number = RECORD_FETCH_PAGE_SIZE,
  maxPages: number = RECORD_FETCH_MAX_PAGES,
): Promise<AllRecordsResult> {
  const items: JizhangRecord[] = [];
  let total = 0;
  let page = 1;
  let complete = false;

  while (page <= maxPages) {
    const res = await jizhangApi.listRecords(projectId, {
      ...filters,
      page,
      pageSize,
    });
    total = res.total ?? 0;
    const pageItems: JizhangRecord[] = res.items ?? [];
    items.push(...pageItems);
    if (pageItems.length === 0) {
      complete = items.length >= total;
      break;
    }
    if (items.length >= total) {
      complete = true;
      break;
    }
    page += 1;
  }

  return { items, total: Math.max(total, items.length), complete };
}

/** HTML 转义：导出存档时把用户数据当作文本插入，避免被解析为标签 */
export function escapeHtml(value: string | null | undefined): string {
  const text = value ?? '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 当前用户是否可编辑该项目。
 * group 范围前端拿不到分组信息，交给后端判定，默认放行。
 */
export function canEditProject(
  project: AppData | null,
  userId: string | undefined,
  level?: UserLevel,
): boolean {
  if (!project) return false;
  if (level === 'super_admin' || level === 'level_1') return true;
  if (!userId) return false;
  if (project.ownerId && project.ownerId === userId) return true;
  switch (project.editScope) {
    case 'all':
      return true;
    case 'owner':
      return project.ownerId === userId;
    case 'users':
      return (project.editUserIds ?? []).includes(userId);
    default:
      return true;
  }
}
