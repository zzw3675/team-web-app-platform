import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ApiResponse,
  AppData,
  AuditLog,
  CreateJizhangProjectRequest,
  CreateJizhangRecordRequest,
  Group,
  HistoryRecord,
  JizhangCategorySummary,
  JizhangRecord,
  JizhangRecordListQuery,
  JizhangSummaryQuery,
  ListResponse,
  LoginRequest,
  LoginResponse,
  OrganizationResponse,
  Page,
  RegisterRequest,
  ChangePasswordRequest,
  CreateUserRequest,
  ResetPasswordAdminResponse,
  ResetPasswordConfirmRequest,
  ResetPasswordRequest,
  Setting,
  SendTestEmailRequest,
  SmtpConfigResponse,
  Template,
  UpdateSmtpConfigRequest,
  UpdateJizhangProjectRequest,
  UpdateJizhangRecordRequest,
  User,
  UserDirectoryItem,
  UserLevel,
} from '@shared/api.interface';
import { historyApi as historyModuleApi } from './history';

const TOKEN_KEY = 'auth_token';

const http: AxiosInstance = axiosForBackend as unknown as AxiosInstance;

const rawBasePath: string = (process.env.CLIENT_BASE_PATH as string) || '';
const basePath: string = rawBasePath.endsWith('/')
  ? rawBasePath.slice(0, -1)
  : rawBasePath;
http.defaults.baseURL = `${basePath}/api`;
http.defaults.timeout = 15000;
http.defaults.headers.post['Content-Type'] = 'application/json';

// 请求拦截器：附加 token 和 CSRF
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-App-Token'] = token;
    }
    const cookies = document.cookie.split('; ');
    let csrfToken: string | null = null;
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'suda-csrf-token') {
        csrfToken = decodeURIComponent(value);
        break;
      }
    }
    if (!csrfToken) csrfToken = window.csrfToken ?? null;
    if (csrfToken && config.headers) {
      config.headers['X-Suda-Csrf-Token'] = csrfToken;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// 响应拦截器：401 清 token + 跳登录
http.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && !('data' in response.data) && !('error' in response.data)) {
      response.data = { data: response.data };
    }
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      const { pathname, search } = window.location;
      if (!pathname.endsWith('/login')) {
        const routePath =
          basePath && pathname.startsWith(basePath)
            ? pathname.slice(basePath.length) || '/'
            : pathname;
        const message = error.response.data?.error?.message ?? '';
        const reason = message.includes('账号不存在')
          ? '&reason=account-missing'
          : '';
        const redirect = encodeURIComponent(`${routePath}${search}`);
        window.location.replace(
          `${basePath}/login?redirect=${redirect}${reason}`,
        );
      }
    }
    return Promise.reject(error);
  },
);

// 401 由响应拦截器统一清 token 并跳登录，页面无需再弹错误提示
export function isUnauthorizedError(error: unknown): boolean {
  const axiosErr = error as AxiosError<ApiResponse> | undefined;
  return axiosErr?.response?.status === 401;
}

// 提取后端错误信息
export function extractApiError(
  error: unknown,
  fallback = '请求失败，请稍后重试',
): string {
  const axiosErr = error as AxiosError<ApiResponse> | undefined;
  const msg = axiosErr?.response?.data?.error?.message;
  if (msg) return msg;
  const fieldErrors = axiosErr?.response?.data?.error?.fieldErrors;
  if (fieldErrors) {
    const first = Object.values(fieldErrors).find(
      (v): v is string[] => Array.isArray(v) && v.length > 0,
    );
    if (first) return first[0];
  }
  if (axiosErr?.message) return axiosErr.message;
  return fallback;
}

async function toBlobRequestError(error: unknown): Promise<Error> {
  const axiosErr = error as AxiosError<Blob> | undefined;
  const payload: Blob | undefined = axiosErr?.response?.data;
  if (payload instanceof Blob && payload.type.includes('json')) {
    const text: string = await payload.text();
    try {
      const parsed: ApiResponse = JSON.parse(text) as ApiResponse;
      return new Error(extractApiError({ response: { data: parsed } }));
    } catch {
      return new Error('导出失败，请稍后重试');
    }
  }
  if (error instanceof Error) return error;
  return new Error('导出失败，请稍后重试');
}

// ---------------- Auth API ----------------
export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await http.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return res.data.data as LoginResponse;
  },

  async register(data: RegisterRequest): Promise<void> {
    const res = await http.post<ApiResponse<void>>('/auth/register', data);
    return res.data.data as void;
  },

  async getProfile(): Promise<User> {
    const res = await http.get<ApiResponse<{ user: User }>>('/auth/profile');
    const payload = res.data.data as { user?: User } | undefined;
    if (!payload || !payload.user) {
      throw new Error('账号资料格式异常');
    }
    return payload.user;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const res = await http.post<ApiResponse<void>>(
      '/auth/change-password',
      data,
    );
    return res.data.data as void;
  },

  async logout(): Promise<void> {
    const res = await http.post<ApiResponse<void>>('/auth/logout');
    return res.data.data as void;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    const res = await http.post<ApiResponse<void>>(
      '/auth/reset-password',
      data,
    );
    return res.data.data as void;
  },

  async resetPasswordConfirm(data: ResetPasswordConfirmRequest): Promise<void> {
    const res = await http.post<ApiResponse<void>>(
      '/auth/reset-password/confirm',
      data,
    );
    return res.data.data as void;
  },
};

// ---------------- 人员目录（已审核用户，登录即可查） ----------------
export const usersDirectoryApi = {
  async list(keyword: string, limit = 20): Promise<UserDirectoryItem[]> {
    const res = await http.get<ApiResponse<{ items: UserDirectoryItem[] }>>(
      '/users/directory',
      { params: { keyword, limit } },
    );
    return res.data.data?.items ?? [];
  },

  async listByIds(ids: string[]): Promise<UserDirectoryItem[]> {
    if (ids.length === 0) return [];
    const res = await http.get<ApiResponse<{ items: UserDirectoryItem[] }>>(
      '/users/directory',
      { params: { ids: ids.join(',') } },
    );
    return res.data.data?.items ?? [];
  },
};

// ---------------- Admin Users API ----------------
export interface UserGroupCount {
  groupId: string | null;
  count: number;
}

export const adminUsersApi = {
  async create(data: CreateUserRequest): Promise<User> {
    const res = await http.post<ApiResponse<User>>('/admin/users', data);
    return res.data.data as User;
  },

  async organization(): Promise<OrganizationResponse> {
    const res = await http.get<ApiResponse<OrganizationResponse>>(
      '/admin/users/organization',
    );
    return res.data.data as OrganizationResponse;
  },

  async list(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    approved?: boolean;
    level?: string;
    groupId?: string;
  }): Promise<ListResponse<User>> {
    const res = await http.get<ApiResponse<ListResponse<User>>>(
      '/admin/users',
      { params },
    );
    return res.data.data as ListResponse<User>;
  },

  async update(
    id: string,
    data: Partial<Omit<User, 'groupId'>> & { groupId?: string | null },
  ): Promise<User> {
    const res = await http.patch<ApiResponse<User>>(
      `/admin/users/${id}`,
      data,
    );
    return res.data.data as User;
  },

  // 各分组真实人数（groupId 为 null 表示未分组）
  async listGroupCounts(): Promise<UserGroupCount[]> {
    const res = await http.get<ApiResponse<{ items: UserGroupCount[] }>>(
      '/admin/users/group-counts',
    );
    return res.data.data?.items ?? [];
  },

  async approve(
    id: string,
    data?: { level?: UserLevel; groupId?: string | null },
  ): Promise<void> {
    const res = await http.post<ApiResponse<void>>(
      `/admin/users/${id}/approve`,
      data,
    );
    return res.data.data as void;
  },

  async reject(id: string): Promise<void> {
    const res = await http.post<ApiResponse<void>>(
      `/admin/users/${id}/reject`,
    );
    return res.data.data as void;
  },

  async resetPassword(id: string): Promise<ResetPasswordAdminResponse> {
    const res = await http.post<ApiResponse<ResetPasswordAdminResponse>>(
      `/admin/users/${id}/reset-password`,
    );
    return res.data.data as ResetPasswordAdminResponse;
  },

  async remove(id: string): Promise<void> {
    const res = await http.delete<ApiResponse<void>>(`/admin/users/${id}`);
    return res.data.data as void;
  },
};

// ---------------- Admin Groups API ----------------
export const adminGroupsApi = {
  async list(params: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<ListResponse<Group>> {
    const res = await http.get<ApiResponse<ListResponse<Group>>>(
      '/admin/groups',
      { params },
    );
    return res.data.data as ListResponse<Group>;
  },

  async listAll(): Promise<Group[]> {
    const res = await http.get<ApiResponse<ListResponse<Group>>>(
      '/admin/groups',
      { params: { page: 1, pageSize: 100 } },
    );
    return (res.data.data as ListResponse<Group>).items;
  },

  async get(id: string): Promise<Group> {
    const res = await http.get<ApiResponse<Group>>(`/admin/groups/${id}`);
    return res.data.data as Group;
  },

  async create(data: { name: string; leaderId?: string; remark?: string }): Promise<Group> {
    const res = await http.post<ApiResponse<Group>>('/admin/groups', data);
    return res.data.data as Group;
  },

  async update(
    id: string,
    data: { name?: string; leaderId?: string; remark?: string },
  ): Promise<Group> {
    const res = await http.patch<ApiResponse<Group>>(
      `/admin/groups/${id}`,
      data,
    );
    return res.data.data as Group;
  },

  async remove(id: string): Promise<void> {
    const res = await http.delete<ApiResponse<void>>(`/admin/groups/${id}`);
    return res.data.data as void;
  },

  async addMembers(id: string, userIds: string[]): Promise<{ added: number }> {
    const res = await http.post<ApiResponse<{ added: number }>>(
      `/admin/groups/${id}/members`,
      { userIds },
    );
    return res.data.data as { added: number };
  },

  async removeMember(id: string, userId: string): Promise<void> {
    const res = await http.delete<ApiResponse<void>>(
      `/admin/groups/${id}/members/${userId}`,
    );
    return res.data.data as void;
  },
};

// ---------------- Groups Options API（任意已登录用户可调用） ----------------
export interface GroupOption {
  id: string;
  name: string;
}

export const groupsApi = {
  async options(): Promise<GroupOption[]> {
    const res = await http.get<ApiResponse<{ items: GroupOption[] }>>(
      '/groups/options',
    );
    return res.data.data?.items ?? [];
  },
};

// ---------------- Admin Templates API ----------------
export const adminTemplatesApi = {
  async list(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  } = {}): Promise<ListResponse<Template>> {
    const res = await http.get<ApiResponse<ListResponse<Template>>>(
      '/admin/templates',
      { params },
    );
    return res.data.data as ListResponse<Template>;
  },

  async get(id: string): Promise<Template> {
    const res = await http.get<ApiResponse<Template>>(`/admin/templates/${id}`);
    return res.data.data as Template;
  },

  async updateVisibility(
    id: string,
    data: {
      visibility: 'all' | 'group' | 'users' | 'owner';
      visibleGroupIds?: string[];
      visibleUserIds?: string[];
    },
  ): Promise<Template> {
    const res = await http.patch<ApiResponse<Template>>(
      `/admin/templates/${id}/visibility`,
      data,
    );
    return res.data.data as Template;
  },
};

// ---------------- Admin Pages API ----------------
export const adminPagesApi = {
  async list(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: 'all' | 'enabled' | 'disabled' | 'trash';
  }): Promise<ListResponse<Page>> {
    const res = await http.get<ApiResponse<ListResponse<Page>>>(
      '/admin/pages',
      { params },
    );
    return res.data.data as ListResponse<Page>;
  },

  async get(id: string): Promise<Page> {
    const res = await http.get<ApiResponse<Page>>(`/admin/pages/${id}`);
    return res.data.data as Page;
  },

  async update(
    id: string,
    data: Partial<Pick<Page, 'title' | 'icon' | 'sortOrder'>>,
  ): Promise<Page> {
    const res = await http.patch<ApiResponse<Page>>(
      `/admin/pages/${id}`,
      data,
    );
    return res.data.data as Page;
  },

  async updateOwner(id: string, ownerId: string): Promise<Page> {
    const res = await http.patch<ApiResponse<Page>>(`/admin/pages/${id}`, {
      ownerId,
    });
    return res.data.data as Page;
  },

  async updateVisibility(
    id: string,
    data: {
      visibility: 'all' | 'group' | 'users' | 'owner';
      visibleUserIds?: string[];
      visibleGroupIds?: string[];
      groupId?: string;
    },
  ): Promise<Page> {
    const res = await http.patch<ApiResponse<Page>>(
      `/admin/pages/${id}`,
      data,
    );
    return res.data.data as Page;
  },

  async disable(id: string): Promise<void> {
    const res = await http.post<ApiResponse<void>>(`/admin/pages/${id}/disable`);
    return res.data.data as void;
  },

  async enable(id: string): Promise<void> {
    const res = await http.post<ApiResponse<void>>(`/admin/pages/${id}/enable`);
    return res.data.data as void;
  },

  async trash(id: string): Promise<void> {
    const res = await http.post<ApiResponse<void>>(`/admin/pages/${id}/trash`);
    return res.data.data as void;
  },

  async restore(id: string): Promise<void> {
    const res = await http.post<ApiResponse<void>>(`/admin/pages/${id}/restore`);
    return res.data.data as void;
  },

  // 物理删除（仅回收站中的门户）
  async deleteForever(id: string): Promise<void> {
    const res = await http.post<ApiResponse<void>>(
      `/admin/pages/${id}/delete-forever`,
    );
    return res.data.data as void;
  },

  async remove(id: string): Promise<void> {
    const res = await http.delete<ApiResponse<void>>(`/admin/pages/${id}`);
    return res.data.data as void;
  },
};

// ---------------- Admin Audit Logs API ----------------
export const adminAuditLogsApi = {
  async list(params: {
    page?: number;
    pageSize?: number;
    operator?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ListResponse<AuditLog>> {
    const res = await http.get<ApiResponse<ListResponse<AuditLog>>>(
      '/admin/audit-logs',
      { params },
    );
    return res.data.data as ListResponse<AuditLog>;
  },
};

// ---------------- Admin Settings API ----------------
export const adminSettingsApi = {
  async getSiteName(): Promise<string> {
    const res = await http.get<ApiResponse<{ items: Setting[] }>>(
      '/admin/settings',
    );
    const items: Setting[] = res.data.data?.items ?? [];
    const setting: Setting | undefined = items.find(
      (item: Setting) => item.key === 'site-name',
    );
    return setting?.value ?? '';
  },

  async updateSiteName(value: string): Promise<void> {
    await http.patch<ApiResponse<Setting>>('/admin/settings/site-name', {
      value,
    });
  },
};

// ---------------- Admin Email (SMTP) API ----------------
export const adminEmailApi = {
  async getConfig(): Promise<SmtpConfigResponse> {
    const res = await http.get<ApiResponse<SmtpConfigResponse>>(
      '/admin/email/config',
    );
    return res.data.data as SmtpConfigResponse;
  },

  async updateConfig(
    data: UpdateSmtpConfigRequest,
  ): Promise<SmtpConfigResponse> {
    const res = await http.put<ApiResponse<SmtpConfigResponse>>(
      '/admin/email/config',
      data,
    );
    return res.data.data as SmtpConfigResponse;
  },

  async sendTest(data: SendTestEmailRequest): Promise<void> {
    await http.put<ApiResponse<{ messageId: string }>>('/admin/email/test', data);
  },
};

// ---------------- Public Settings API ----------------
export const publicSettingsApi = {
  async getSiteName(): Promise<string> {
    const res = await http.get<ApiResponse<{ siteName: string }>>(
      '/settings/site-name',
    );
    return (res.data.data as { siteName: string }).siteName;
  },
};

// ---------------- Pages API (front) ----------------
export const pagesApi = {
  async list(params: { page?: number; pageSize?: number } = {}): Promise<
    ListResponse<Page>
  > {
    const res = await http.get<ApiResponse<ListResponse<Page>>>('/pages', {
      params,
    });
    return res.data.data as ListResponse<Page>;
  },

  async create(data: {
    templateId: string;
    title: string;
    slug: string;
    ownerId: string;
    visibility: 'all' | 'group' | 'users' | 'owner';
    visibleUserIds?: string[];
    visibleGroupIds?: string[];
    groupId?: string;
  }): Promise<Page> {
    const res = await http.post<ApiResponse<Page>>('/pages', data);
    return res.data.data as Page;
  },

  async get(id: string): Promise<Page> {
    const res = await http.get<ApiResponse<Page>>(`/pages/${id}`);
    return res.data.data as Page;
  },

  async getBySlug(slug: string): Promise<Page> {
    const res = await http.get<ApiResponse<Page>>(`/pages/by-slug/${slug}`);
    return res.data.data as Page;
  },
};

// ---------------- Templates API (front) ----------------
export const templatesApi = {
  async list(params: { page?: number; pageSize?: number } = {}): Promise<
    ListResponse<Template>
  > {
    const res = await http.get<ApiResponse<ListResponse<Template>>>(
      '/templates',
      { params },
    );
    return res.data.data as ListResponse<Template>;
  },
};

// ---------------- Jizhang API ----------------
export const jizhangApi = {
  // 项目管理
  async listProjects(params: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<ListResponse<AppData>> {
    const res = await http.get<ApiResponse<ListResponse<AppData>>>(
      '/jizhang/projects',
      { params },
    );
    return res.data.data as ListResponse<AppData>;
  },

  async getProject(id: string): Promise<AppData> {
    const res = await http.get<ApiResponse<AppData>>(`/jizhang/projects/${id}`);
    return res.data.data as AppData;
  },

  async createProject(data: CreateJizhangProjectRequest): Promise<AppData> {
    const res = await http.post<ApiResponse<AppData>>(
      '/jizhang/projects',
      data,
    );
    return res.data.data as AppData;
  },

  async updateProject(
    id: string,
    data: UpdateJizhangProjectRequest,
  ): Promise<AppData> {
    const res = await http.patch<ApiResponse<AppData>>(
      `/jizhang/projects/${id}`,
      data,
    );
    return res.data.data as AppData;
  },

  async deleteProject(id: string): Promise<void> {
    const res = await http.delete<ApiResponse<void>>(`/jizhang/projects/${id}`);
    return res.data.data as void;
  },

  // 记录列表
  async listRecords(
    projectId: string,
    params: JizhangRecordListQuery = {},
  ): Promise<ListResponse<JizhangRecord>> {
    const res = await http.get<ApiResponse<ListResponse<JizhangRecord>>>(
      `/jizhang/projects/${projectId}/records`,
      { params },
    );
    return res.data.data as ListResponse<JizhangRecord>;
  },

  async createRecord(
    projectId: string,
    data: CreateJizhangRecordRequest,
  ): Promise<JizhangRecord> {
    const res = await http.post<ApiResponse<JizhangRecord>>(
      `/jizhang/projects/${projectId}/records`,
      data,
    );
    return res.data.data as JizhangRecord;
  },

  async updateRecord(
    projectId: string,
    recordId: string,
    data: UpdateJizhangRecordRequest,
  ): Promise<JizhangRecord> {
    const res = await http.patch<ApiResponse<JizhangRecord>>(
      `/jizhang/projects/${projectId}/records/${recordId}`,
      data,
    );
    return res.data.data as JizhangRecord;
  },

  async deleteRecord(projectId: string, recordId: string): Promise<void> {
    const res = await http.delete<ApiResponse<void>>(
      `/jizhang/projects/${projectId}/records/${recordId}`,
    );
    return res.data.data as void;
  },

  async restoreRecord(projectId: string, recordId: string): Promise<void> {
    const res = await http.post<ApiResponse<void>>(
      `/jizhang/projects/${projectId}/records/${recordId}/restore`,
    );
    return res.data.data as void;
  },

  // 回收站
  async listRecycle(
    projectId: string,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ListResponse<JizhangRecord>> {
    const res = await http.get<ApiResponse<ListResponse<JizhangRecord>>>(
      `/jizhang/projects/${projectId}/records/recycle`,
      { params },
    );
    return res.data.data as ListResponse<JizhangRecord>;
  },

  // 分类汇总
  async categorySummary(
    projectId: string,
    params: JizhangSummaryQuery = {},
  ): Promise<JizhangCategorySummary[]> {
    const res = await http.get<ApiResponse<JizhangCategorySummary[]>>(
      `/jizhang/projects/${projectId}/records/summary/category`,
      { params },
    );
    return res.data.data as JizhangCategorySummary[];
  },

  // CSV 导出
  async exportCsv(projectId: string): Promise<void> {
    let csvData: Blob;
    try {
      const res = await http.get<Blob>(
        `/jizhang/projects/${projectId}/records/export`,
        { responseType: 'blob', timeout: 120000 },
      );
      csvData = res.data;
    } catch (error) {
      throw await toBlobRequestError(error);
    }
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvData], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jizhang_${projectId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

// ---------------- History API ----------------
export const historyApi = {
  getProjectHistory(
    projectId: string,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ListResponse<HistoryRecord>> {
    return historyModuleApi.listByProject(projectId, params);
  },

  restore(_projectId: string, historyId: string): Promise<void> {
    return historyModuleApi.restore(historyId);
  },
};

export default http;
