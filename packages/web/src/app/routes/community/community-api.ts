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

  async getMembers(projectId?: string, hubId?: string): Promise<CommunityMember[]> {
    try {
      const members = await api.get<CommunityMember[]>('/v1/community/members', {
        params: {
          ...(projectId ? { projectId } : {}),
          ...(hubId ? { hubId } : {}),
        },
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

  // ── Hubs (Servers) & Invites ──────────────────────────────────────────
  async getHubs(): Promise<CommunityHub[]> {
    try {
      const hubs = await api.get<any[]>('/v1/community/hubs');
      if (Array.isArray(hubs)) {
        return hubs.map((h) => ({
          id: h.id,
          name: h.name,
          iconType: (h.icon as any) || 'code',
          initials: h.name.slice(0, 2).toUpperCase(),
          description: h.description || '',
          inviteCode: h.inviteCode,
          membersCount: h.membersCount || 1,
          color: h.color || 'bg-indigo-600',
          role: h.role || 'member',
        }));
      }
      return [];
    } catch (err) {
      console.warn('communityApi.getHubs error', err);
      return [];
    }
  },

  async createHub(payload: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<CommunityHub> {
    const h = await api.post<any>('/v1/community/hubs', payload);
    return {
      id: h.id,
      name: h.name,
      iconType: (h.icon as any) || 'code',
      initials: h.name.slice(0, 2).toUpperCase(),
      description: h.description || '',
      inviteCode: h.inviteCode,
      membersCount: h.membersCount || 1,
      color: h.color || 'bg-indigo-600',
      role: 'owner',
    };
  },

  async updateHub(
    id: string,
    payload: { name?: string; description?: string; color?: string; icon?: string },
  ): Promise<CommunityHub> {
    const h = await api.put<any>(`/v1/community/hubs/${id}`, payload);
    return {
      id: h.id,
      name: h.name,
      iconType: (h.icon as any) || 'code',
      initials: h.name.slice(0, 2).toUpperCase(),
      description: h.description || '',
      inviteCode: h.inviteCode,
      membersCount: h.membersCount || 1,
      color: h.color || 'bg-indigo-600',
      role: h.role,
    };
  },

  async deleteHub(id: string): Promise<{ success: boolean; id: string }> {
    return api.delete<{ success: boolean; id: string }>(`/v1/community/hubs/${id}`);
  },

  async getInvite(
    inviteCode: string,
  ): Promise<{ id: string; name: string; description: string; membersCount: number; color?: string }> {
    return api.get(`/v1/community/invite/${inviteCode}`);
  },

  async joinHub(inviteCode: string): Promise<CommunityHub> {
    const h = await api.post<any>(`/v1/community/invite/${inviteCode}/join`);
    return {
      id: h.id,
      name: h.name,
      iconType: (h.icon as any) || 'code',
      initials: h.name.slice(0, 2).toUpperCase(),
      description: h.description || '',
      inviteCode: h.inviteCode,
      membersCount: h.membersCount || 1,
      color: h.color || 'bg-indigo-600',
      role: h.role || 'member',
    };
  },
};
