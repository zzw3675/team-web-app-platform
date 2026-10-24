import http from '@client/src/api';
import type {
  ApiResponse,
  HistoryRecord,
  ListResponse,
} from '@shared/api.interface';

/**
 * 历史版本接口（/api/history）
 * 单独成模块，避免挤压 api/index.ts 聚合文件。
 */
export const historyApi = {
  async listByTarget(
    targetCollection: string,
    targetRecordId: string,
  ): Promise<HistoryRecord[]> {
    const res = await http.get<ApiResponse<HistoryRecord[]>>('/history', {
      params: { targetCollection, targetRecordId },
    });
    return res.data.data as HistoryRecord[];
  },

  async listByProject(
    projectId: string,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ListResponse<HistoryRecord>> {
    const res = await http.get<ApiResponse<ListResponse<HistoryRecord>>>(
      `/history/project/${projectId}`,
      { params },
    );
    return res.data.data as ListResponse<HistoryRecord>;
  },

  async restore(historyId: string): Promise<void> {
    await http.post(`/history/${historyId}/restore`);
  },
};
