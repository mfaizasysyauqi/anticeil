import { api } from '@/lib/api';
import {
  loadStoredChannels,
  saveStoredChannels,
  loadStoredHubs,
  saveStoredHubs,
  loadStoredMessages,
  saveStoredMessages,
  loadStoredInvites,
  saveStoredInvites,
  loadStoredBans,
  saveStoredBans,
  loadStoredRoles,
  saveStoredRoles,
  loadStoredAuditLog,
  saveStoredAuditLog,
  DEFAULT_HUBS,
} from './messages-data';
import {
  CommunityChannel,
  CommunityChannelType,
  CommunityMember,
  CommunityMessage,
  CommunityHub,
  CommunityAuditEntry,
  CommunityInvite,
  CommunityBan,
  CommunityCustomRole,
  CommunityHubStats,
  CommunityRole,
  CommunityChannelNotification,
  CommunityThread,
} from './messages-types';
import { DiscordEmoji, DiscordSticker } from './discord-media-data';

export const messagesApi = {
  // ── Channels ──────────────────────────────────────────────────────────
  async getChannels(hubId?: string): Promise<CommunityChannel[]> {
    try {
      const res = await api.get<CommunityChannel[]>('/v1/community/channels', {
        params: hubId ? { hubId } : undefined,
      });
      if (Array.isArray(res)) {
        const stored = loadStoredChannels();
        if (hubId) {
          const others = stored.filter((c) => (c.hubId || 'anticeil') !== hubId);
          saveStoredChannels([...others, ...res]);
        } else {
          saveStoredChannels(res);
        }
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
    type?: CommunityChannelType;
    isPrivate?: boolean;
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
      type: payload.type || 'text',
      isPrivate: payload.isPrivate || false,
    };
    const stored = loadStoredChannels();
    const updated = [...stored.filter((c) => c.id !== newChannel.id), newChannel];
    saveStoredChannels(updated);
    return newChannel;
  },

  async updateChannel(
    id: string,
    payload: { name?: string; description?: string; type?: CommunityChannelType; isPrivate?: boolean },
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
    try {
      const res = await api.get<CommunityHub[]>('/v1/community/hubs');
      if (Array.isArray(res) && res.length > 0) {
        saveStoredHubs(res);
        return res;
      }
    } catch {}
    return loadStoredHubs();
  },

  async createHub(payload: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    iconUrl?: string;
  }): Promise<CommunityHub> {
    const newId = `hub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newHub: CommunityHub = {
      id: newId,
      name: payload.name,
      iconType: payload.iconUrl ? (undefined as any) : ('code' as any),
      iconUrl: payload.iconUrl,
      initials: payload.name.slice(0, 2).toUpperCase() || 'SV',
      description: payload.description || '',
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      membersCount: 1,
      color: payload.color || 'bg-indigo-600',
      role: 'owner',
      tags: ['komunitas', 'anticeil'],
      emojis: [
        { id: '1', name: 'rocket', char: '🚀' },
        { id: '2', name: 'fire', char: '🔥' },
        { id: '3', name: 'robot', char: '🤖' },
      ],
      boostsCount: 0,
      boostTier: 0,
    };

    try {
      const res = await api.post<CommunityHub>('/v1/community/hubs', {
        ...payload,
        id: newId,
        tags: newHub.tags,
        emojis: newHub.emojis,
      });
      if (res && res.id) {
        const stored = loadStoredHubs();
        const updated = [...stored.filter((h) => h.id !== res.id), res];
        saveStoredHubs(updated);
        this.recordAudit(res.id, 'HUB_CREATED', 'Admin', res.name);
        return res;
      }
    } catch {}

    const stored = loadStoredHubs();
    const updated = [...stored.filter((h) => h.id !== newId), newHub];
    saveStoredHubs(updated);
    this.recordAudit(newId, 'HUB_CREATED', 'Admin', newHub.name);
    return newHub;
  },

  async updateHub(
    id: string,
    payload: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
      iconUrl?: string;
      tags?: string[];
      emojis?: any[];
      boostsCount?: number;
      boostTier?: number;
    },
  ): Promise<CommunityHub> {
    try {
      const res = await api.put<CommunityHub>(`/v1/community/hubs/${id}`, payload);
      if (res && res.id) {
        const stored = loadStoredHubs();
        saveStoredHubs(stored.map((h) => (h.id === id ? res : h)));
        this.recordAudit(id, 'HUB_UPDATED', 'Admin', payload.name || id, payload);
        return res;
      }
    } catch {}

    const stored = loadStoredHubs();
    let target = stored.find((h) => h.id === id);
    if (target) {
      target = { ...target, ...payload };
      saveStoredHubs(stored.map((h) => (h.id === id ? target! : h)));
      this.recordAudit(id, 'HUB_UPDATED', 'Admin', payload.name || id, payload);
      return target;
    }
    const fallback: CommunityHub = {
      id,
      name: payload.name || 'Server',
      description: payload.description || '',
      initials: (payload.name || 'SV').slice(0, 2).toUpperCase(),
      iconType: 'initials',
      role: 'owner',
      ...payload,
    };
    saveStoredHubs([...stored, fallback]);
    return fallback;
  },

  async deleteHub(id: string): Promise<{ success: boolean; id: string }> {
    try {
      await api.delete(`/v1/community/hubs/${id}`);
    } catch {}
    const stored = loadStoredHubs();
    saveStoredHubs(stored.filter((h) => h.id !== id));
    this.recordAudit(id, 'HUB_DELETED', 'Admin', id);
    return { success: true, id };
  },

  async boostHub(id: string): Promise<{ success: boolean; boostsCount: number; boostTier: number }> {
    try {
      const res = await api.post<{ success: boolean; boostsCount: number; boostTier: number }>(
        `/v1/community/hubs/${id}/boost`,
      );
      if (res && typeof res.boostsCount === 'number') {
        const stored = loadStoredHubs();
        saveStoredHubs(
          stored.map((h) =>
            h.id === id
              ? { ...h, boostsCount: res.boostsCount, boostTier: res.boostTier }
              : h,
          ),
        );
        this.recordAudit(id, 'SERVER_BOOST', 'Admin', `Boost Tier ${res.boostTier}`, {
          boostsCount: res.boostsCount,
        });
        return res;
      }
    } catch {}

    const stored = loadStoredHubs();
    let count = 1;
    let tier = 0;
    const target = stored.find((h) => h.id === id);
    if (target) {
      count = (target.boostsCount || 0) + 1;
      tier = count >= 14 ? 3 : count >= 7 ? 2 : count >= 2 ? 1 : 0;
      target.boostsCount = count;
      target.boostTier = tier;
      saveStoredHubs(stored.map((h) => (h.id === id ? target : h)));
    }
    this.recordAudit(id, 'SERVER_BOOST', 'Admin', `Boost Tier ${tier}`, { boostsCount: count });
    return { success: true, boostsCount: count, boostTier: tier };
  },

  // ── Member Actions: Role & Kick ──────────────────────────────────────
  async updateMemberRole(
    hubId: string,
    userId: string,
    role: CommunityRole,
  ): Promise<{ success: boolean; userId: string; role: CommunityRole }> {
    try {
      await api.put(`/v1/community/hubs/${hubId}/members/${userId}/role`, { role });
    } catch {}
    this.recordAudit(hubId, 'MEMBER_ROLE_CHANGE', 'Admin', userId, { newRole: role });
    return { success: true, userId, role };
  },

  async kickMember(hubId: string, userId: string): Promise<{ success: boolean; userId: string }> {
    try {
      await api.delete(`/v1/community/hubs/${hubId}/members/${userId}`);
    } catch {}
    this.recordAudit(hubId, 'MEMBER_KICK', 'Admin', userId);
    return { success: true, userId };
  },

  // ── Roles Management ──────────────────────────────────────────────────
  async getRoles(hubId: string): Promise<CommunityCustomRole[]> {
    try {
      const res = await api.get<CommunityCustomRole[]>(`/v1/community/hubs/${hubId}/roles`);
      if (Array.isArray(res) && res.length > 0) {
        saveStoredRoles(hubId, res);
        return res;
      }
    } catch {}
    const stored = loadStoredRoles(hubId);
    if (stored.length > 0) return stored;
    const defaults: CommunityCustomRole[] = [
      { id: 'role-owner', hubId, name: 'Owner', color: '#ef4444', permissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'KICK_MEMBERS', 'BAN_MEMBERS'] },
      { id: 'role-admin', hubId, name: 'Admin', color: '#8b5cf6', permissions: ['MANAGE_CHANNELS', 'KICK_MEMBERS', 'MANAGE_WEBHOOKS'] },
      { id: 'role-mod', hubId, name: 'Moderator', color: '#3b82f6', permissions: ['KICK_MEMBERS', 'MANAGE_MESSAGES'] },
      { id: 'role-member', hubId, name: 'Member', color: '#64748b', permissions: ['SEND_MESSAGES', 'ATTACH_FILES', 'ADD_REACTIONS'] },
    ];
    saveStoredRoles(hubId, defaults);
    return defaults;
  },

  async createRole(hubId: string, payload: { name: string; color: string; permissions?: string[] }): Promise<CommunityCustomRole> {
    const newRole: CommunityCustomRole = {
      id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hubId,
      name: payload.name,
      color: payload.color || '#6366f1',
      permissions: payload.permissions || ['SEND_MESSAGES'],
    };
    try {
      const res = await api.post<CommunityCustomRole>(`/v1/community/hubs/${hubId}/roles`, newRole);
      if (res && res.id) {
        const stored = loadStoredRoles(hubId);
        saveStoredRoles(hubId, [...stored, res]);
        this.recordAudit(hubId, 'ROLE_CREATED', 'Admin', res.name, { color: res.color });
        return res;
      }
    } catch {}
    const stored = loadStoredRoles(hubId);
    const updated = [...stored, newRole];
    saveStoredRoles(hubId, updated);
    this.recordAudit(hubId, 'ROLE_CREATED', 'Admin', newRole.name, { color: newRole.color });
    return newRole;
  },

  async deleteRole(hubId: string, roleId: string): Promise<{ success: boolean; id: string }> {
    try {
      await api.delete(`/v1/community/hubs/${hubId}/roles/${roleId}`);
    } catch {}
    const stored = loadStoredRoles(hubId);
    saveStoredRoles(hubId, stored.filter((r) => r.id !== roleId));
    this.recordAudit(hubId, 'ROLE_DELETED', 'Admin', roleId);
    return { success: true, id: roleId };
  },

  // ── Invites Management ────────────────────────────────────────────────
  async getInvites(hubId: string): Promise<CommunityInvite[]> {
    try {
      const res = await api.get<CommunityInvite[]>(`/v1/community/hubs/${hubId}/invites`);
      if (Array.isArray(res) && res.length > 0) {
        saveStoredInvites(hubId, res);
        return res;
      }
    } catch {}
    const stored = loadStoredInvites(hubId);
    if (stored.length > 0) return stored;
    const defaultInvite: CommunityInvite = {
      id: `inv_default_${hubId}`,
      hubId,
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      inviterName: 'Sistem',
      uses: 1,
      maxUses: 0,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    };
    saveStoredInvites(hubId, [defaultInvite]);
    return [defaultInvite];
  },

  async createInvite(
    hubId: string,
    payload: { maxUses?: number; expiresAt?: string | null },
  ): Promise<CommunityInvite> {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const newInvite: CommunityInvite = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hubId,
      code,
      inviterName: 'Admin',
      uses: 0,
      maxUses: payload.maxUses || 0,
      expiresAt: payload.expiresAt || null,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await api.post<CommunityInvite>(`/v1/community/hubs/${hubId}/invites`, newInvite);
      if (res && res.id) {
        const stored = loadStoredInvites(hubId);
        saveStoredInvites(hubId, [res, ...stored]);
        this.recordAudit(hubId, 'INVITE_CREATE', 'Admin', res.code);
        return res;
      }
    } catch {}
    const stored = loadStoredInvites(hubId);
    saveStoredInvites(hubId, [newInvite, ...stored]);
    this.recordAudit(hubId, 'INVITE_CREATE', 'Admin', newInvite.code);
    return newInvite;
  },

  async revokeInvite(hubId: string, inviteId: string): Promise<{ success: boolean; id: string }> {
    try {
      await api.delete(`/v1/community/hubs/${hubId}/invites/${inviteId}`);
    } catch {}
    const stored = loadStoredInvites(hubId);
    saveStoredInvites(hubId, stored.filter((i) => i.id !== inviteId && i.code !== inviteId));
    this.recordAudit(hubId, 'INVITE_REVOKE', 'Admin', inviteId);
    return { success: true, id: inviteId };
  },

  // ── Bans Management ───────────────────────────────────────────────────
  async getBans(hubId: string): Promise<CommunityBan[]> {
    try {
      const res = await api.get<CommunityBan[]>(`/v1/community/hubs/${hubId}/bans`);
      if (Array.isArray(res)) {
        saveStoredBans(hubId, res);
        return res;
      }
    } catch {}
    return loadStoredBans(hubId);
  },

  async banUser(
    hubId: string,
    payload: { userId: string; userName: string; userEmail?: string; reason: string },
  ): Promise<CommunityBan> {
    const newBan: CommunityBan = {
      id: `ban_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hubId,
      userId: payload.userId,
      userName: payload.userName,
      userEmail: payload.userEmail,
      reason: payload.reason || 'Melanggar aturan komunitas',
      bannedByName: 'Admin',
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await api.post<CommunityBan>(`/v1/community/hubs/${hubId}/bans`, newBan);
      if (res && res.id) {
        const stored = loadStoredBans(hubId);
        saveStoredBans(hubId, [res, ...stored.filter((b) => b.userId !== payload.userId)]);
        this.recordAudit(hubId, 'MEMBER_BAN', 'Admin', payload.userName, { reason: payload.reason });
        return res;
      }
    } catch {}
    const stored = loadStoredBans(hubId);
    saveStoredBans(hubId, [newBan, ...stored.filter((b) => b.userId !== payload.userId)]);
    this.recordAudit(hubId, 'MEMBER_BAN', 'Admin', payload.userName, { reason: payload.reason });
    return newBan;
  },

  async unbanUser(hubId: string, userId: string): Promise<{ success: boolean; userId: string }> {
    try {
      await api.delete(`/v1/community/hubs/${hubId}/bans/${userId}`);
    } catch {}
    const stored = loadStoredBans(hubId);
    saveStoredBans(hubId, stored.filter((b) => b.userId !== userId && b.id !== userId));
    this.recordAudit(hubId, 'MEMBER_UNBAN', 'Admin', userId);
    return { success: true, userId };
  },

  // ── Audit Log ─────────────────────────────────────────────────────────
  async getAuditLog(hubId: string): Promise<CommunityAuditEntry[]> {
    try {
      const res = await api.get<CommunityAuditEntry[]>(`/v1/community/hubs/${hubId}/audit-log`);
      if (Array.isArray(res) && res.length > 0) {
        saveStoredAuditLog(hubId, res);
        return res;
      }
    } catch {}
    const stored = loadStoredAuditLog(hubId);
    if (stored.length > 0) return stored;
    const initialLog: CommunityAuditEntry = {
      id: `audit_init_${hubId}`,
      hubId,
      action: 'HUB_INITIALIZED',
      actorName: 'Sistem Anticeil',
      targetName: 'Server Komunitas',
      details: { info: 'Server diaktifkan dengan modul lengkap' },
      createdAt: new Date().toISOString(),
    };
    saveStoredAuditLog(hubId, [initialLog]);
    return [initialLog];
  },

  recordAudit(
    hubId: string,
    action: string,
    actorName: string,
    targetName: string = '',
    details?: any,
  ): void {
    const entry: CommunityAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hubId,
      action,
      actorName: actorName || 'Admin',
      targetName,
      details,
      createdAt: new Date().toISOString(),
    };
    const stored = loadStoredAuditLog(hubId);
    const updated = [entry, ...stored].slice(0, 100);
    saveStoredAuditLog(hubId, updated);
  },

  // ── Engagement / Stats ────────────────────────────────────────────────
  async getHubStats(hubId: string): Promise<CommunityHubStats> {
    try {
      const res = await api.get<CommunityHubStats>(`/v1/community/hubs/${hubId}/stats`);
      if (res && typeof res.totalMessages === 'number') {
        return res;
      }
    } catch {}
    const storedChannels = loadStoredChannels().filter((c) => (c.hubId || 'anticeil') === hubId);
    const storedMessages = loadStoredMessages();
    let totalMessages = 0;
    let botMessages = 0;
    const channelActivity: Array<{ channelId: string; channelName: string; messageCount: number }> = [];

    for (const ch of storedChannels) {
      const msgs = storedMessages[ch.id] || [];
      totalMessages += msgs.length;
      botMessages += msgs.filter((m) => m.senderRole === 'bot').length;
      channelActivity.push({
        channelId: ch.id,
        channelName: ch.name,
        messageCount: msgs.length,
      });
    }

    channelActivity.sort((a, b) => b.messageCount - a.messageCount);

    return {
      totalMessages: Math.max(totalMessages, 12),
      totalChannels: Math.max(storedChannels.length, 3),
      totalMembers: 4,
      totalBots: 2,
      botMessages: Math.max(botMessages, 5),
      channelActivity,
    };
  },

  async getInvite(
    inviteCode: string,
  ): Promise<{ id: string; name: string; description: string; membersCount: number; color?: string }> {
    const cleanId = inviteCode.startsWith('hub_') ? inviteCode : `hub_${inviteCode}`;
    const stored = loadStoredHubs();
    const found = stored.find((h) => h.inviteCode === inviteCode || h.id === inviteCode || h.id === cleanId);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        description: found.description || '',
        membersCount: found.membersCount || 1,
        color: found.color,
      };
    }
    try {
      const allHubs = await api.get<CommunityHub[]>('/v1/community/hubs');
      if (Array.isArray(allHubs)) {
        const foundInDb = allHubs.find((h) => h.inviteCode === inviteCode || h.id === inviteCode || h.id === cleanId);
        if (foundInDb) {
          return {
            id: foundInDb.id,
            name: foundInDb.name,
            description: foundInDb.description || '',
            membersCount: foundInDb.membersCount || 1,
            color: foundInDb.color,
          };
        }
      }
    } catch {}
    return {
      id: cleanId,
      name: `Server #${inviteCode.slice(0, 4)}`,
      description: 'Undangan server komunitas Anticeil',
      membersCount: 2,
    };
  },

  async joinHub(inviteCode: string): Promise<CommunityHub> {
    const cleanId = inviteCode.startsWith('hub_') ? inviteCode : `hub_${inviteCode}`;
    const stored = loadStoredHubs();
    const existing = stored.find((h) => h.inviteCode === inviteCode || h.id === inviteCode || h.id === cleanId);
    if (existing) {
      return existing;
    }
    try {
      const allHubs = await api.get<CommunityHub[]>('/v1/community/hubs');
      if (Array.isArray(allHubs)) {
        const foundInDb = allHubs.find((h) => h.inviteCode === inviteCode || h.id === inviteCode || h.id === cleanId);
        if (foundInDb) {
          const next = [...stored.filter((h) => h.id !== foundInDb.id), foundInDb];
          saveStoredHubs(next);
          return foundInDb;
        }
      }
    } catch {}
    const newHub: CommunityHub = {
      id: cleanId,
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

  // ── Pinned Messages ───────────────────────────────────────────────────
  async getPinnedMessages(channelId: string): Promise<CommunityMessage[]> {
    try {
      const res = await api.get<CommunityMessage[]>(`/v1/community/channels/${channelId}/pins`);
      if (Array.isArray(res)) return res;
    } catch {}
    const stored = loadStoredMessages();
    const list = stored[channelId] || [];
    return list.filter((m) => m.isPinned);
  },

  async togglePinMessage(
    messageId: string,
    channelId: string,
    userName?: string,
  ): Promise<CommunityMessage> {
    try {
      const res = await api.post<CommunityMessage>(`/v1/community/messages/${messageId}/pin`, {
        userName,
      });
      if (res && res.id) {
        // sync to local stored messages
        const stored = loadStoredMessages();
        const list = stored[channelId] || [];
        stored[channelId] = list.map((m) => (m.id === messageId ? { ...m, ...res } : m));
        saveStoredMessages(stored);
        return res;
      }
    } catch {}

    // Fallback sync
    const stored = loadStoredMessages();
    const list = stored[channelId] || [];
    let updatedMsg: CommunityMessage | null = null;
    stored[channelId] = list.map((m) => {
      if (m.id === messageId) {
        const nextPinned = !m.isPinned;
        updatedMsg = {
          ...m,
          isPinned: nextPinned,
          pinnedAt: nextPinned ? new Date().toISOString() : null,
          pinnedBy: nextPinned ? (userName || 'You') : null,
        };
        return updatedMsg;
      }
      return m;
    });
    saveStoredMessages(stored);
    return updatedMsg || ({ id: messageId } as CommunityMessage);
  },

  // ── Channel Notifications ─────────────────────────────────────────────
  async getChannelNotification(channelId: string): Promise<CommunityChannelNotification> {
    try {
      const res = await api.get<CommunityChannelNotification>(`/v1/community/channels/${channelId}/notifications`);
      if (res && res.channelId) return res;
    } catch {}
    const saved = localStorage.getItem(`anticeil_notif_${channelId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      channelId,
      userId: 'me',
      level: 'default',
      isMuted: false,
      mutedUntil: null,
    };
  },

  async updateChannelNotification(
    channelId: string,
    payload: Partial<CommunityChannelNotification>,
  ): Promise<CommunityChannelNotification> {
    try {
      const res = await api.put<CommunityChannelNotification>(`/v1/community/channels/${channelId}/notifications`, payload);
      if (res && res.channelId) {
        localStorage.setItem(`anticeil_notif_${channelId}`, JSON.stringify(res));
        return res;
      }
    } catch {}

    const current = await this.getChannelNotification(channelId);
    const updated: CommunityChannelNotification = {
      ...current,
      ...payload,
    };
    localStorage.setItem(`anticeil_notif_${channelId}`, JSON.stringify(updated));
    return updated;
  },

  // ── Threads ───────────────────────────────────────────────────────────
  async getThreads(channelId: string, search?: string): Promise<CommunityThread[]> {
    try {
      const res = await api.get<CommunityThread[]>(`/v1/community/channels/${channelId}/threads`, {
        params: search ? { search } : undefined,
      });
      if (Array.isArray(res)) {
        localStorage.setItem(`anticeil_threads_${channelId}`, JSON.stringify(res));
        return res;
      }
    } catch {}

    const saved = localStorage.getItem(`anticeil_threads_${channelId}`);
    if (saved) {
      try {
        const list: CommunityThread[] = JSON.parse(saved);
        if (search) {
          return list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
        }
        return list;
      } catch {}
    }
    return [];
  },

  async createThread(
    channelId: string,
    payload: {
      name: string;
      creatorName?: string;
      creatorAvatar?: string | null;
      initialMessage?: string;
    },
  ): Promise<CommunityThread> {
    const fallbackThread: CommunityThread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      name: payload.name.trim(),
      creatorId: 'me',
      creatorName: payload.creatorName || 'You',
      creatorAvatar: payload.creatorAvatar ?? null,
      messageCount: payload.initialMessage ? 1 : 0,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await api.post<CommunityThread>(`/v1/community/channels/${channelId}/threads`, payload);
      if (res && res.id) {
        const current = await this.getThreads(channelId);
        localStorage.setItem(`anticeil_threads_${channelId}`, JSON.stringify([res, ...current]));
        return res;
      }
    } catch {}

    const current = await this.getThreads(channelId);
    localStorage.setItem(`anticeil_threads_${channelId}`, JSON.stringify([fallbackThread, ...current]));
    return fallbackThread;
  },

  async getThreadMessages(threadId: string): Promise<CommunityMessage[]> {
    try {
      const res = await api.get<CommunityMessage[]>(`/v1/community/threads/${threadId}/messages`);
      if (Array.isArray(res)) return res;
    } catch {}

    const saved = localStorage.getItem(`anticeil_thread_msgs_${threadId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  },

  async sendThreadMessage(
    threadId: string,
    payloadOrChannelId: string | Partial<CommunityMessage>,
    maybePayload?: Partial<CommunityMessage>,
  ): Promise<CommunityMessage> {
    const payload = typeof payloadOrChannelId === 'string' ? (maybePayload || {}) : payloadOrChannelId;
    const channelId = typeof payloadOrChannelId === 'string' ? payloadOrChannelId : (payload.channelId || '');
    const fallbackMsg: CommunityMessage = {
      id: `msg_th_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      threadId,
      senderId: payload.senderId || 'me',
      senderName: payload.senderName || 'You',
      senderEmail: payload.senderEmail || '',
      senderAvatar: payload.senderAvatar ?? null,
      senderRole: (payload.senderRole as any) || 'member',
      content: payload.content || '',
      attachments: payload.attachments,
      reactions: {},
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await api.post<CommunityMessage>(`/v1/community/threads/${threadId}/messages`, {
        channelId,
        content: payload.content,
        senderName: payload.senderName,
        senderAvatar: payload.senderAvatar,
        senderRole: payload.senderRole,
        attachments: payload.attachments,
      });
      if (res && res.id) {
        const current = await this.getThreadMessages(threadId);
        localStorage.setItem(`anticeil_thread_msgs_${threadId}`, JSON.stringify([...current, res]));
        return res;
      }
    } catch {}

    const current = await this.getThreadMessages(threadId);
    localStorage.setItem(`anticeil_thread_msgs_${threadId}`, JSON.stringify([...current, fallbackMsg]));
    return fallbackMsg;
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

  // ── Server Emojis (DB — no dummy data) ──────────────────────────────────
  async getServerEmojis(hubId: string): Promise<DiscordEmoji[]> {
    try {
      const res = await api.get<any[]>(`/v1/community/hubs/${hubId}/emojis`);
      if (Array.isArray(res)) {
        return res.map((r) => ({
          id: r.id, name: r.name, code: r.code, url: r.url,
          server: hubId, category: hubId,
        }));
      }
    } catch {}
    return [];
  },

  async addServerEmoji(hubId: string, payload: { name: string; code: string; url: string }): Promise<DiscordEmoji | null> {
    try {
      const res = await api.post<any>(`/v1/community/hubs/${hubId}/emojis`, payload);
      if (res?.id) return { id: res.id, name: res.name, code: res.code, url: res.url, server: hubId, category: hubId };
    } catch {}
    return null;
  },

  async deleteServerEmoji(hubId: string, emojiId: string): Promise<void> {
    try { await api.delete(`/v1/community/hubs/${hubId}/emojis/${emojiId}`); } catch {}
  },

  // ── Server Stickers (DB — no dummy data) ────────────────────────────────
  async getServerStickers(hubId: string): Promise<DiscordSticker[]> {
    try {
      const res = await api.get<any[]>(`/v1/community/hubs/${hubId}/stickers`);
      if (Array.isArray(res)) {
        return res.map((r) => ({
          id: r.id, name: r.name, url: r.url,
          server: hubId, tags: r.tags || [],
        }));
      }
    } catch {}
    return [];
  },

  async addServerSticker(hubId: string, payload: { name: string; url: string; tags?: string[] }): Promise<DiscordSticker | null> {
    try {
      const res = await api.post<any>(`/v1/community/hubs/${hubId}/stickers`, payload);
      if (res?.id) return { id: res.id, name: res.name, url: res.url, server: hubId, tags: res.tags || [] };
    } catch {}
    return null;
  },

  async deleteServerSticker(hubId: string, stickerId: string): Promise<void> {
    try { await api.delete(`/v1/community/hubs/${hubId}/stickers/${stickerId}`); } catch {}
  },
};

export const communityApi = messagesApi;

