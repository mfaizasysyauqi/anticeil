import { api } from '@/lib/api';
import { CommunityChannel, CommunityMember, CommunityMessage } from './community-types';

export const communityApi = {
  async getChannels(hubId?: string): Promise<CommunityChannel[]> {
    try {
      const channels = await api.get<CommunityChannel[]>('/v1/community/channels', {
        params: hubId ? { hubId } : undefined,
      });
      if (Array.isArray(channels)) {
        return channels;
      }
      return [];
    } catch (err) {
      console.warn('communityApi.getChannels error', err);
      return [];
    }
  },

  async createChannel(payload: {
    name: string;
    description: string;
    category: 'CHANNELS' | 'DIRECT MESSAGES';
    hubId?: string;
  }): Promise<CommunityChannel> {
    return api.post<CommunityChannel>('/v1/community/channels', payload);
  },

  async updateChannel(
    id: string,
    payload: { name?: string; description?: string },
  ): Promise<CommunityChannel> {
    return api.put<CommunityChannel>(`/v1/community/channels/${id}`, payload);
  },

  async deleteChannel(id: string): Promise<{ success: boolean; id: string }> {
    return api.delete<{ success: boolean; id: string }>(`/v1/community/channels/${id}`);
  },

  async getMessages(channelId: string): Promise<CommunityMessage[]> {
    try {
      const messages = await api.get<CommunityMessage[]>(
        `/v1/community/channels/${channelId}/messages`,
      );
      if (Array.isArray(messages)) {
        return messages;
      }
      return [];
    } catch (err) {
      console.warn('communityApi.getMessages error', err);
      return [];
    }
  },

  async sendMessage(
    channelId: string,
    payload: Partial<CommunityMessage>,
  ): Promise<CommunityMessage> {
    return api.post<CommunityMessage>(
      `/v1/community/channels/${channelId}/messages`,
      payload,
    );
  },

  async deleteMessage(messageId: string): Promise<{ success: boolean; id: string }> {
    return api.delete<{ success: boolean; id: string }>(
      `/v1/community/messages/${messageId}`,
    );
  },

  async toggleReaction(
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<{ id: string; channelId?: string; reactions: Record<string, string[]> }> {
    return api.post(`/v1/community/messages/${messageId}/reactions`, {
      emoji,
      userId,
    });
  },

  async getMembers(projectId?: string): Promise<CommunityMember[]> {
    try {
      const members = await api.get<CommunityMember[]>('/v1/community/members', {
        params: projectId ? { projectId } : undefined,
      });
      if (Array.isArray(members)) {
        return members;
      }
      return [];
    } catch (err) {
      console.warn('communityApi.getMembers error', err);
      return [];
    }
  },
};
