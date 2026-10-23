import { api } from '@/lib/api';
import { DEFAULT_CHANNELS, DEFAULT_MEMBERS, INITIAL_MESSAGES } from './community-data';
import { CommunityChannel, CommunityMember, CommunityMessage } from './community-types';

export const communityApi = {
  async getChannels(hubId?: string): Promise<CommunityChannel[]> {
    try {
      const channels = await api.get<CommunityChannel[]>('/v1/community/channels', {
        params: hubId ? { hubId } : undefined,
      });
      if (Array.isArray(channels) && channels.length > 0) {
        return channels;
      }
      return hubId ? DEFAULT_CHANNELS.filter((c) => c.hubId === hubId) : DEFAULT_CHANNELS;
    } catch {
      return hubId ? DEFAULT_CHANNELS.filter((c) => c.hubId === hubId) : DEFAULT_CHANNELS;
    }
  },

  async createChannel(payload: {
    name: string;
    description: string;
    category: 'CHANNELS' | 'DIRECT MESSAGES';
    hubId: string;
  }): Promise<CommunityChannel> {
    try {
      return await api.post<CommunityChannel>('/v1/community/channels', payload);
    } catch {
      const cleanName = payload.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      return {
        id: cleanName || `channel-${Date.now()}`,
        name: cleanName || payload.name,
        description: payload.description,
        category: payload.category,
        hubId: payload.hubId,
      };
    }
  },

  async updateChannel(
    id: string,
    payload: { name?: string; description?: string },
  ): Promise<CommunityChannel> {
    try {
      return await api.put<CommunityChannel>(`/v1/community/channels/${id}`, payload);
    } catch {
      return {
        id,
        name: payload.name || id,
        description: payload.description || '',
        category: 'CHANNELS',
      };
    }
  },

  async deleteChannel(id: string): Promise<{ success: boolean; id: string }> {
    try {
      return await api.delete<{ success: boolean; id: string }>(`/v1/community/channels/${id}`);
    } catch {
      return { success: true, id };
    }
  },

  async getMessages(channelId: string): Promise<CommunityMessage[]> {
    try {
      const messages = await api.get<CommunityMessage[]>(
        `/v1/community/channels/${channelId}/messages`,
      );
      if (Array.isArray(messages)) {
        return messages;
      }
      return INITIAL_MESSAGES[channelId] || [];
    } catch {
      return INITIAL_MESSAGES[channelId] || [];
    }
  },

  async sendMessage(
    channelId: string,
    payload: Partial<CommunityMessage>,
  ): Promise<CommunityMessage> {
    try {
      return await api.post<CommunityMessage>(
        `/v1/community/channels/${channelId}/messages`,
        payload,
      );
    } catch {
      return {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        channelId,
        senderId: payload.senderId || 'anon-user',
        senderName: payload.senderName || 'Pengguna Anticeil',
        senderEmail: payload.senderEmail || 'user@anticeil.com',
        senderAvatar: payload.senderAvatar || null,
        senderRole: payload.senderRole || 'member',
        content: payload.content || '',
        createdAt: new Date().toISOString(),
        attachments: payload.attachments,
        reactions: {},
      };
    }
  },

  async deleteMessage(messageId: string): Promise<{ success: boolean; id: string }> {
    try {
      return await api.delete<{ success: boolean; id: string }>(
        `/v1/community/messages/${messageId}`,
      );
    } catch {
      return { success: true, id: messageId };
    }
  },

  async toggleReaction(
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<{ id: string; channelId?: string; reactions: Record<string, string[]> }> {
    try {
      return await api.post(`/v1/community/messages/${messageId}/reactions`, {
        emoji,
        userId,
      });
    } catch {
      return { id: messageId, reactions: {} };
    }
  },

  async getMembers(): Promise<CommunityMember[]> {
    try {
      const members = await api.get<CommunityMember[]>('/v1/community/members');
      if (Array.isArray(members) && members.length > 0) {
        return members;
      }
      return DEFAULT_MEMBERS;
    } catch {
      return DEFAULT_MEMBERS;
    }
  },
};
