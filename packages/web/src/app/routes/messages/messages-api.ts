import { api } from '@/lib/api';
import {
  loadStoredChannels,
  saveStoredChannels,
  loadStoredHubs,
  saveStoredHubs,
  loadStoredMessages,
  saveStoredMessages,
  DEFAULT_HUBS,
} from './messages-data';
import {
  CommunityChannel,
  CommunityMember,
  CommunityMessage,
  CommunityHub,
} from './messages-types';

export const messagesApi = {
  // ── Channels ──────────────────────────────────────────────────────────
  async getChannels(hubId?: string): Promise<CommunityChannel[]> {
    try {
      const res = await api.get<CommunityChannel[]>('/v1/community/channels', {
        params: hubId ? { hubId } : undefined,
      });
      if (Array.isArray(res) && res.length > 0) {
        saveStoredChannels(res);
        return res;
      }
    } catch {}
    const stored = loadStoredChannels();
    return hubId ? stored.filter((c) => (c.hubId || 'anticeil') === hubId) : stored;
  },

  async createChannel(payload: {
    name: string;
    description: string;
    category: 'CHANNELS' | 'DIRECT MESSAGES';
    hubId?: string;
  }): Promise<CommunityChannel> {
    try {
      const res = await api.post<CommunityChannel>('/v1/community/channels', payload);
      if (res && res.id) {
        const stored = loadStoredChannels();
        const updated = [...stored.filter((c) => c.id !== res.id), res];
        saveStoredChannels(updated);
        return res;
      }
    } catch {}
    const newChannel: CommunityChannel = {
      id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: payload.name,
      description: payload.description,
      category: payload.category,
      hubId: payload.hubId || 'anticeil',
    };
    const stored = loadStoredChannels();
    const updated = [...stored.filter((c) => c.id !== newChannel.id), newChannel];
    saveStoredChannels(updated);
    return newChannel;
  },

  async updateChannel(
    id: string,
    payload: { name?: string; description?: string },
  ): Promise<CommunityChannel> {
    try {
      const res = await api.put<CommunityChannel>(`/v1/community/channels/${id}`, payload);
      if (res && res.id) {
        const stored = loadStoredChannels();
        saveStoredChannels(stored.map((c) => (c.id === id ? res : c)));
        return res;
      }
    } catch {}
    const stored = loadStoredChannels();
    let target = stored.find((c) => c.id === id);
    if (target) {
      target = { ...target, ...payload };
      saveStoredChannels(stored.map((c) => (c.id === id ? target! : c)));
      return target;
    }
    const fallback: CommunityChannel = {
      id,
      name: payload.name || 'Channel',
      description: payload.description || '',
      category: 'CHANNELS',
      hubId: 'anticeil',
    };
    saveStoredChannels([...stored, fallback]);
    return fallback;
  },

  async deleteChannel(id: string): Promise<{ success: boolean; id: string }> {
    try {
      await api.delete(`/v1/community/channels/${id}`);
    } catch {}
    const stored = loadStoredChannels();
    saveStoredChannels(stored.filter((c) => c.id !== id));
    return { success: true, id };
  },

  // ── Messages ──────────────────────────────────────────────────────────
  async getMessages(channelId: string): Promise<CommunityMessage[]> {
    try {
      const res = await api.get<CommunityMessage[]>(`/v1/community/channels/${channelId}/messages`);
      if (Array.isArray(res)) {
        const stored = loadStoredMessages();
        stored[channelId] = res;
        saveStoredMessages(stored);
        return res;
      }
    } catch {}
    const stored = loadStoredMessages();
    return stored[channelId] || [];
  },

  async sendMessage(
    channelId: string,
    payload: Partial<CommunityMessage>,
  ): Promise<CommunityMessage> {
    const fallbackMsg: CommunityMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      senderId: payload.senderId || 'me',
      senderName: payload.senderName || 'Anonymous',
      senderEmail: payload.senderEmail || '',
      senderAvatar: payload.senderAvatar ?? null,
      senderRole: (payload.senderRole as any) || 'member',
      content: payload.content || '',
      attachments: payload.attachments,
      reactions: {},
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await api.post<CommunityMessage>(`/v1/community/channels/${channelId}/messages`, {
        ...payload,
        channelId,
      });
      if (res && res.id) {
        const stored = loadStoredMessages();
        stored[channelId] = [...(stored[channelId] || []).filter((m) => m.id !== res.id), res];
        saveStoredMessages(stored);
        return res;
      }
    } catch {}

    const stored = loadStoredMessages();
    stored[channelId] = [...(stored[channelId] || []), fallbackMsg];
    saveStoredMessages(stored);
    return fallbackMsg;
  },

  async deleteMessage(messageId: string): Promise<{ success: boolean; id: string }> {
    try {
      await api.delete(`/v1/community/messages/${messageId}`);
    } catch {}
    const stored = loadStoredMessages();
    for (const chId in stored) {
      stored[chId] = stored[chId].filter((m) => m.id !== messageId);
    }
    saveStoredMessages(stored);
    return { success: true, id: messageId };
  },

  async toggleReaction(
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<{ id: string; channelId?: string; reactions: Record<string, string[]> }> {
    try {
      const res = await api.post<{ id: string; channelId?: string; reactions: Record<string, string[]> }>(
        `/v1/community/messages/${messageId}/reactions`,
        { emoji, userId }
      );
      if (res && res.reactions) {
        return res;
      }
    } catch {}
    const stored = loadStoredMessages();
    let targetMsg: CommunityMessage | null = null;
    for (const chId in stored) {
      const msg = stored[chId].find((m) => m.id === messageId);
      if (msg) {
        targetMsg = msg;
        const currentReactions = msg.reactions || {};
        const users = currentReactions[emoji] || [];
        if (users.includes(userId)) {
          currentReactions[emoji] = users.filter((u) => u !== userId);
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji];
          }
        } else {
          currentReactions[emoji] = [...users, userId];
        }
        msg.reactions = currentReactions;
        break;
      }
    }
    saveStoredMessages(stored);
    return {
      id: messageId,
      channelId: targetMsg?.channelId,
      reactions: targetMsg?.reactions || {},
    };
  },

  // ── Members & Friends (Fetches real workspace users from /v1/users) ──
  async getMembers(projectId?: string, hubId?: string): Promise<CommunityMember[]> {
    try {
      const res = await api.get<any>('/v1/users', {
        params: { limit: 100 },
      });
      const usersList = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(usersList) && usersList.length > 0) {
        return usersList.map((u: any) => {
          const firstName = u.firstName || '';
          const lastName = u.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim() || u.email?.split('@')[0] || 'Pengguna Anticeil';
          return {
            id: u.id,
            name: fullName,
            email: u.email || '',
            avatar: u.imageUrl || null,
            username: u.username || u.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
            role: (u.platformRole === 'OWNER' || u.platformRole === 'ADMIN' ? 'admin' : 'member') as any,
            status: 'online' as const,
          };
        });
      }
    } catch {
      // Graceful fallback if unauthenticated
    }
    return [];
  },

  // ── Hubs (Servers) & Invites ──────────────────────────────────────────
  async getHubs(): Promise<CommunityHub[]> {
    return loadStoredHubs();
  },

  async createHub(payload: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<CommunityHub> {
    const newId = `hub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newHub: CommunityHub = {
      id: newId,
      name: payload.name,
      iconType: 'code' as any,
      initials: payload.name.slice(0, 2).toUpperCase() || 'SV',
      description: payload.description || '',
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      membersCount: 1,
      color: payload.color || 'bg-indigo-600',
      role: 'owner',
    };
    const stored = loadStoredHubs();
    const updated = [...stored.filter((h) => h.id !== newId), newHub];
    saveStoredHubs(updated);
    return newHub;
  },

  async updateHub(
    id: string,
    payload: { name?: string; description?: string; color?: string; icon?: string },
  ): Promise<CommunityHub> {
    const stored = loadStoredHubs();
    let target = stored.find((h) => h.id === id);
    if (target) {
      target = { ...target, ...payload };
      saveStoredHubs(stored.map((h) => (h.id === id ? target! : h)));
      return target;
    }
    const fallback: CommunityHub = {
      id,
      name: payload.name || 'Server',
      description: payload.description || '',
      initials: (payload.name || 'SV').slice(0, 2).toUpperCase(),
      role: 'owner',
    };
    saveStoredHubs([...stored, fallback]);
    return fallback;
  },

  async deleteHub(id: string): Promise<{ success: boolean; id: string }> {
    const stored = loadStoredHubs();
    saveStoredHubs(stored.filter((h) => h.id !== id));
    return { success: true, id };
  },

  async getInvite(
    inviteCode: string,
  ): Promise<{ id: string; name: string; description: string; membersCount: number; color?: string }> {
    const stored = loadStoredHubs();
    const found = stored.find((h) => h.inviteCode === inviteCode || h.id === inviteCode);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        description: found.description || '',
        membersCount: found.membersCount || 1,
        color: found.color,
      };
    }
    return {
      id: `hub_${inviteCode}`,
      name: `Server #${inviteCode.slice(0, 4)}`,
      description: 'Undangan server komunitas Anticeil',
      membersCount: 2,
    };
  },

  async joinHub(inviteCode: string): Promise<CommunityHub> {
    const stored = loadStoredHubs();
    const existing = stored.find((h) => h.inviteCode === inviteCode || h.id === inviteCode);
    if (existing) {
      return existing;
    }
    const newHub: CommunityHub = {
      id: `hub_${inviteCode}`,
      name: `Server Komunitas`,
      iconType: 'code' as any,
      initials: 'SK',
      description: 'Bergabung melalui link undangan',
      inviteCode,
      membersCount: 2,
      color: 'bg-emerald-600',
      role: 'member',
    };
    saveStoredHubs([...stored, newHub]);
    return newHub;
  },

  async inviteMemberByUsername(
    hubId: string,
    username: string,
  ): Promise<{ found: boolean; alreadyMember?: boolean; user?: CommunityMember }> {
    const members = await messagesApi.getMembers();
    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    const found = members.find(
      (m) =>
        (m.username && m.username.toLowerCase() === cleanUser) ||
        m.name.toLowerCase() === cleanUser ||
        m.email.toLowerCase().startsWith(cleanUser),
    );
    if (found) {
      return { found: true, user: found };
    }
    return { found: false };
  },

  // ── Bot Webhooks ──────────────────────────────────────────────────────
  async testWebhook(payload: {
    channelId?: string;
    channel?: string;
    hubId?: string;
    botName?: string;
    content: string;
  }): Promise<any> {
    return api.post('/v1/community/webhook', payload);
  },
};

export const communityApi = messagesApi;
