import {
  ChatService,
  type BatchGetChatsResponse,
  type ChatInfo,
  type SearchChatsParams,
  type SearchChatsResponse,
} from '@lark-apaas/client-toolkit/tools/services';

const chatService = new ChatService();

export async function searchChats(
  params: SearchChatsParams,
): Promise<SearchChatsResponse> {
  return chatService.searchChats(params);
}

export async function listChatsByIds(
  chatIds: string[],
): Promise<BatchGetChatsResponse> {
  return chatService.listChatsByIds(chatIds);
}

export type { BatchGetChatsResponse, ChatInfo, SearchChatsParams, SearchChatsResponse };
