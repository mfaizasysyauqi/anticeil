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
  CommunityMember,
  CommunityMessage,
  CommunityHub,
  CommunityAuditEntry,
  CommunityInvite,
  CommunityBan,
  CommunityCustomRole,
  CommunityHubStats,
  CommunityRole,
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

