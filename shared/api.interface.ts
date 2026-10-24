export type UserLevel = 'super_admin' | 'level_1' | 'level_2' | 'level_3';

export type VisibilityType = 'all' | 'group' | 'users' | 'owner';

export type ScopeType = 'all' | 'group' | 'owner' | 'users';

export type PageType = 'html' | 'link';

export type TemplateType = 'html' | 'app';

export type HistoryAction = 'update' | 'delete' | 'restore';

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  level: UserLevel;
  groupId?: string;
  groupName?: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDirectoryItem {
  id: string;
  nickname: string;
  level: UserLevel;
}

export interface Group {
  id: string;
  name: string;
  remark?: string;
  leaderId?: string;
  leaderName?: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupOption {
  id: string;
  name: string;
}

export interface OrganizationMember {
  id: string;
  nickname: string;
  level: UserLevel;
  approved: boolean;
}

export interface OrganizationGroup {
  id: string;
  name: string;
  remark?: string;
  leaderId?: string;
  leaderName?: string;
  members: OrganizationMember[];
}

export interface OrganizationResponse {
  groups: OrganizationGroup[];
  ungrouped: OrganizationMember[];
}

export interface AddGroupMembersRequest {
  userIds: string[];
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  icon?: string;
  description?: string;
  htmlContent?: string;
  url?: string;
  visibility: VisibilityType;
  visibleUserIds: string[];
  visibleGroupIds: string[];
  sortOrder: number;
  ownerId?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  icon?: string;
  type: PageType;
  url?: string;
  htmlContent?: string;
  visibility: VisibilityType;
  visibleUserIds: string[];
  visibleGroupIds: string[];
  sortOrder: number;
  enabled: boolean;
  groupId?: string;
  groupName?: string;
  ownerId?: string;
  ownerName?: string;
  isDeleted: boolean;
  appMode: boolean;
  templateId?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  id: string;
  app: string;
  title: string;
  content: Record<string, any>;
  ownerId?: string;
  ownerName?: string;
  readScope: ScopeType;
  readUserIds: string[];
  editScope: ScopeType;
  editUserIds: string[];
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JizhangRecord {
  id: string;
  recordDate: string;
  incomeExpense: 'income' | 'expense';
  category: string;
  amount: string;
  remark?: string;
  recorderId?: string;
  recorderName?: string;
  isDeleted: boolean;
  ownerId?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryRecord {
  id: string;
  targetCollection: string;
  targetRecordId: string;
  targetTitle?: string;
  projectId?: string;
  snapshot: Record<string, any>;
  action: HistoryAction;
  operatorId?: string;
  operatorName?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  operatorId?: string;
  operatorName?: string;
  action: string;
  target?: string;
  detail?: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    timestamp?: number;
    details?: string;
  };
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

// Admin: Users
export interface UpdateUserRequest {
  level?: UserLevel;
  groupId?: string | null;
  nickname?: string;
}

export interface ApproveUserRequest {
  level?: UserLevel;
  groupId?: string | null;
}

export interface CreateUserRequest {
  email: string;
  nickname: string;
  password: string;
  level?: UserLevel;
  groupId?: string | null;
}

export interface ResetPasswordAdminResponse {
  newPassword: string;
}

export interface UserOverviewResponse {
  total: number;
  pending: number;
  approved: number;
  level1: number;
  level2: number;
  level3: number;
}

// Admin: Groups
export interface CreateGroupRequest {
  name: string;
  remark?: string;
  leaderId?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  remark?: string;
  leaderId?: string | null;
}

// Admin: Pages
export interface UpdatePageRequest {
  title?: string;
  icon?: string | null;
  sortOrder?: number;
  enabled?: boolean;
}

export interface UpdatePageOwnerRequest {
  ownerId: string;
}

export interface UpdateVisibilityRequest {
  visibility: VisibilityType;
  visibleUserIds: string[];
  visibleGroupIds?: string[];
}

// Admin: Templates
export interface CreateTemplateRequest {
  name: string;
  type: TemplateType;
  icon?: string;
  description?: string;
  htmlContent?: string;
  url?: string;
  visibility?: VisibilityType;
  visibleUserIds?: string[];
  visibleGroupIds?: string[];
  sortOrder?: number;
  ownerId?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  type?: TemplateType;
  icon?: string | null;
  description?: string | null;
  htmlContent?: string | null;
  url?: string | null;
  sortOrder?: number;
}

export interface UpdateTemplateVisibilityRequest {
  visibility: VisibilityType;
  visibleGroupIds: string[];
  visibleUserIds: string[];
}

// Admin: Settings
export interface SiteNameResponse {
  siteName: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
}

// Admin: Email (SMTP)
export interface SmtpConfigResponse {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  siteUrl: string;
  hasPass: boolean;
}

export interface UpdateSmtpConfigRequest {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  fromName?: string;
  siteUrl?: string;
}

export interface SendTestEmailRequest {
  to: string;
}

export interface SendTestEmailResponse {
  messageId: string;
}

// Jizhang: Projects
export interface CreateJizhangProjectRequest {
  title: string;
  readScope: ScopeType;
  readUserIds?: string[];
  editScope: ScopeType;
  editUserIds?: string[];
}

export interface UpdateJizhangProjectRequest {
  title?: string;
  readScope?: ScopeType;
  readUserIds?: string[];
  editScope?: ScopeType;
  editUserIds?: string[];
}

// Jizhang: Records
export interface CreateJizhangRecordRequest {
  recordDate: string;
  incomeExpense: 'income' | 'expense';
  category: string;
  amount: string;
  remark?: string;
}

export interface UpdateJizhangRecordRequest {
  recordDate?: string;
  incomeExpense?: 'income' | 'expense';
  category?: string;
  amount?: string;
  remark?: string;
}

export interface JizhangCategorySummary {
  category: string;
  totalAmount: string;
  count: number;
}

export interface JizhangRecordListQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  incomeExpense?: 'income' | 'expense';
  dateFrom?: string;
  dateTo?: string;
  includeDeleted?: boolean;
}

export interface JizhangSummaryQuery {
  dateFrom?: string;
  dateTo?: string;
  incomeExpense?: 'income' | 'expense';
}
