import { apiClient } from '@/lib/api-client';
import { Conversation, Message } from '@/types';

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get<Conversation[]>('/api/chat/conversations');
    return res.data || [];
  },

  async createDirectConversation(otherUserId: string): Promise<Conversation> {
    const res = await apiClient.post<Conversation>('/api/chat/conversations/direct', { otherUserId });
    return res.data;
  },

  async getMessages(conversationId: string, page = 1, pageSize = 50): Promise<Message[]> {
    const res = await apiClient.get<Message[]>(`/api/chat/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`);
    return res.data || [];
  },

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const res = await apiClient.post<Message>(`/api/chat/conversations/${conversationId}/messages`, {
      content,
      messageType: 'Text',
    });
    return res.data;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.post(`/api/chat/conversations/${conversationId}/read`);
  },

  async addReaction(messageId: string, reaction: string): Promise<void> {
    await apiClient.post(`/api/chat/messages/${messageId}/reactions`, { reaction });
  },

  async removeReaction(messageId: string, reaction: string): Promise<void> {
    await apiClient.delete(`/api/chat/messages/${messageId}/reactions?reaction=${encodeURIComponent(reaction)}`);
  }
};
