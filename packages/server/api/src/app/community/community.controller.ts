import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { securityAccess } from '../core/security/authorization/fastify-security';
import { communityService } from './community.service';

export const communityController: FastifyPluginAsyncZod = async (app) => {
  // ── Profile Endpoints ──
  app.get('/users/me/profile', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_profile_me', {
      bio: 'Your life in one sentence',
      pronouns: '',
      bannerColor: '#5c4d44',
      statusThought: 'Shower thought?',
      widgets: {
        favoriteGame: 'Neverness to Everness',
        gamesILike: ['Minecraft', 'Valorant'],
        showActivity: true,
        showConnections: true,
      },
    });
  });

  app.put('/users/me/profile', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const current = await communityService.get('user_profile_me', {});
    const updated = { ...current, ...(req.body as any) };
    return communityService.set('user_profile_me', updated);
  });

  // ── Assignments (Kanban) Endpoints ──
  app.get('/community/assignments', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('community_assignments', []);
  });

  app.post('/community/assignments', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_assignments', []);
    const newItem = { ...(req.body as any), id: (req.body as any).id || `asg_${Date.now()}` };
    const updated = [newItem, ...list];
    await communityService.set('community_assignments', updated);
    return newItem;
  });

  app.put('/community/assignments/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_assignments', []);
    const updated = list.map((item) => (item.id === id ? { ...item, ...(req.body as any) } : item));
    await communityService.set('community_assignments', updated);
    return { success: true, id };
  });

  app.delete('/community/assignments/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_assignments', []);
    const updated = list.filter((item) => item.id !== id);
    await communityService.set('community_assignments', updated);
    return { success: true };
  });

  // ── Calendar Events Endpoints ──
  app.get('/community/calendar/events', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('community_calendar_events', []);
  });

  app.post('/community/calendar/events', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_calendar_events', []);
    const newEvent = { ...(req.body as any), id: (req.body as any).id || `evt_${Date.now()}` };
    const updated = [newEvent, ...list];
    await communityService.set('community_calendar_events', updated);
    return newEvent;
  });

  app.delete('/community/calendar/events/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_calendar_events', []);
    const updated = list.filter((item) => item.id !== id);
    await communityService.set('community_calendar_events', updated);
    return { success: true };
  });

  // ── Calls History Endpoints ──
  app.get('/community/calls/logs', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('community_calls_logs', []);
  });

  app.post('/community/calls/logs', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_calls_logs', []);
    const newLog = { ...(req.body as any), id: (req.body as any).id || `call_${Date.now()}` };
    const updated = [newLog, ...list];
    await communityService.set('community_calls_logs', updated);
    return newLog;
  });

  app.delete('/community/calls/logs/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_calls_logs', []);
    const updated = list.filter((item) => item.id !== id);
    await communityService.set('community_calls_logs', updated);
    return { success: true };
  });

  // ── Message Requests Endpoints ──
  app.get('/community/message-requests', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('community_message_requests', []);
  });

  app.post('/community/message-requests/:id/accept', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_message_requests', []);
    await communityService.set('community_message_requests', list.filter((r) => r.id !== id));
    return { success: true, id };
  });

  app.post('/community/message-requests/:id/ignore', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_message_requests', []);
    await communityService.set('community_message_requests', list.filter((r) => r.id !== id));
    return { success: true, id };
  });

  app.post('/community/message-requests/:id/spam', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_message_requests', []);
    const updated = list.map((r) => (r.id === id ? { ...r, isSpam: true } : r));
    await communityService.set('community_message_requests', updated);
    return { success: true, id };
  });

  // ── Billing, Subscriptions, & Gifts Endpoints ──
  app.get('/billing/payment-methods', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('billing_payment_methods', [
      {
        id: 'pm-qris',
        name: 'QRIS / GoPay (Midtrans)',
        type: 'e-wallet',
        details: 'Instant QRIS & GoPay Auto-Debit',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  app.post('/billing/payment-methods', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('billing_payment_methods', []);
    const newPm = { ...(req.body as any), id: `pm_${Date.now()}` };
    const updated = [newPm, ...list];
    await communityService.set('billing_payment_methods', updated);
    return newPm;
  });

  app.delete('/billing/payment-methods/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('billing_payment_methods', []);
    await communityService.set('billing_payment_methods', list.filter((p) => p.id !== id));
    return { success: true };
  });

  app.get('/billing/transactions', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('billing_transactions', [
      {
        id: 'trx_init_01',
        description: 'Nectar Pass Monthly Subscription',
        amount: 149000,
        currency: 'IDR',
        status: 'settlement',
        date: new Date().toISOString(),
        paymentMethod: 'GoPay / QRIS',
      },
    ]);
  });

  app.get('/billing/subscriptions', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_subscription', {
      planId: 'free',
      planName: 'Anticeil Free Tier',
      status: 'none',
      boostSlots: 0,
      perks: ['Akses chat standar', 'Upload file hingga 25MB'],
    });
  });

  app.post('/billing/subscriptions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    return communityService.set('user_subscription', req.body);
  });

  app.post('/billing/subscriptions/cancel', {
    config: { security: securityAccess.public() },
  }, async () => {
    const sub = {
      planId: 'free',
      planName: 'Anticeil Free Tier',
      status: 'none',
      boostSlots: 0,
      perks: ['Akses chat standar', 'Upload file hingga 25MB'],
    };
    return communityService.set('user_subscription', sub);
  });

  app.get('/billing/gifts', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('billing_gifts', []);
  });

  app.post('/billing/gifts/redeem', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { code } = req.body as { code: string };
    const newGift = {
      id: `gift_${Date.now()}`,
      code,
      type: 'nectar_1m',
      title: '1 Bulan Nectar Nitro Pass',
      redeemed: true,
      redeemedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const list = await communityService.get<any[]>('billing_gifts', []);
    await communityService.set('billing_gifts', [newGift, ...list]);
    return { success: true, gift: newGift, message: 'Kode hadiah berhasil diklaim!' };
  });

  // ── Games & Connected Apps Endpoints ──
  app.get('/community/games', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('community_games', [
      {
        id: 'terraria',
        name: 'Terraria',
        verified: true,
        lastPlayed: '2 days ago',
        enabled: true,
        icon: '🌳',
      },
    ]);
  });

  app.post('/community/games', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_games', []);
    const newGame = { ...(req.body as any), id: (req.body as any).id || `game_${Date.now()}` };
    const updated = [newGame, ...list];
    await communityService.set('community_games', updated);
    return newGame;
  });

  app.put('/community/games/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_games', []);
    const updated = list.map((g) => (g.id === id ? { ...g, ...(req.body as any) } : g));
    await communityService.set('community_games', updated);
    return { success: true };
  });

  app.delete('/community/games/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_games', []);
    await communityService.set('community_games', list.filter((g) => g.id !== id));
    return { success: true };
  });

  app.get('/community/connections', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('community_connections', [
      {
        id: 'conn-spotify',
        platformId: 'spotify',
        accountName: 'ESTEFANO',
        platformName: 'Spotify',
        icon: '🟢',
        displayOnProfile: true,
        displayStatus: true,
      },
    ]);
  });

  app.post('/community/connections', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_connections', []);
    const newConn = { ...(req.body as any), id: `conn_${Date.now()}` };
    const updated = [newConn, ...list];
    await communityService.set('community_connections', updated);
    return newConn;
  });

  app.put('/community/connections/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_connections', []);
    const updated = list.map((c) => (c.id === id ? { ...c, ...(req.body as any) } : c));
    await communityService.set('community_connections', updated);
    return { success: true };
  });

  app.delete('/community/connections/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_connections', []);
    await communityService.set('community_connections', list.filter((c) => c.id !== id));
    return { success: true };
  });

  app.get('/community/apps', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('community_apps', [
      {
        id: 'app-nve',
        name: 'Neverness to Everness',
        authorizedDate: '11/1/2026',
        icon: '🌸',
        permissionsCount: 4,
        permissionsList: [
          'Akses info profil publik',
          'Lihat aktivitas bermain game',
          'Kirim status pencapaian game',
        ],
        aboutInfo: 'Game RPG open-world anime futuristik resmi terintegrasi dengan Anticeil.',
        policiesUrl: 'https://anticeil.com/privacy',
      },
    ]);
  });

  app.delete('/community/apps/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_apps', []);
    await communityService.set('community_apps', list.filter((a) => a.id !== id));
    return { success: true };
  });

  // ── Colony Management & Discovery Endpoints ──
  app.get('/colony/colonies', {
    config: { security: securityAccess.public() },
  }, async () => {
    const list = await communityService.get<any[]>('community_colonies', []);
    const populated = await Promise.all(
      list.map(async (c) => {
        const members = await communityService.get<any[]>(`community_colony_members_${c.id}`, []);
        const membersCount = members.length > 0 ? members.length : (typeof c.membersCount === 'number' && c.membersCount > 0 ? c.membersCount : 1);
        const onlineCount = members.length > 0
          ? members.filter((m) => m.status !== 'offline').length || 1
          : (typeof c.onlineCount === 'number' && c.onlineCount > 0 ? c.onlineCount : 1);
        return {
          ...c,
          membersCount,
          onlineCount,
        };
      })
    );
    return populated;
  });

  app.post('/colony/colonies', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_colonies', []);
    const body = (req.body as any) || {};
    const user = (req as any).user || {};
    const isPublic = body.isPublic !== undefined ? Boolean(body.isPublic) : (body.visibility === 'public');
    const colonyId = body.id || `hub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const creatorMember = {
      id: user.id || body.ownerId || `user_${Date.now()}`,
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (body.ownerName || 'Admin'),
      username: user.email?.split('@')[0] || body.ownerUsername || 'admin',
      avatar: user.avatar || body.ownerAvatar || null,
      role: 'owner',
      status: 'online',
      joinedAt: new Date().toISOString(),
    };
    await communityService.set(`community_colony_members_${colonyId}`, [creatorMember]);

    const newColony = {
      id: colonyId,
      name: body.name || 'Colony Baru',
      description: body.description || '',
      color: body.color || 'bg-indigo-600',
      iconUrl: body.iconUrl || undefined,
      initials: body.initials || (body.name ? body.name.slice(0, 3).toUpperCase() : 'CLN'),
      inviteCode: body.inviteCode || Math.random().toString(36).slice(2, 8).toUpperCase(),
      membersCount: 1,
      onlineCount: 1,
      role: body.role || 'owner',
      tags: body.tags || ['komunitas'],
      category: body.category || 'community',
      isPublic,
      visibility: isPublic ? 'public' : 'private',
      accessSettings: body.accessSettings || {
        joinMethod: isPublic ? 'discoverable' : 'invite_only',
      },
      ...body,
    };
    const updated = [...list.filter((c) => c.id !== newColony.id), newColony];
    await communityService.set('community_colonies', updated);
    return newColony;
  });

  app.put('/colony/colonies/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_colonies', []);
    const body = (req.body as any) || {};
    const updated = list.map((c) => {
      if (c.id === id) {
        const isPublic = body.isPublic !== undefined
          ? Boolean(body.isPublic)
          : (body.visibility !== undefined ? body.visibility === 'public' : c.isPublic);
        return {
          ...c,
          ...body,
          isPublic,
          visibility: isPublic ? 'public' : 'private',
        };
      }
      return c;
    });
    await communityService.set('community_colonies', updated);
    const saved = updated.find((c) => c.id === id);
    return saved || { id, ...body };
  });

  app.delete('/colony/colonies/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_colonies', []);
    const updated = list.filter((c) => c.id !== id);
    await communityService.set('community_colonies', updated);
    await communityService.delete(`community_colony_members_${id}`);
    return { success: true };
  });

  app.put('/colony/colonies/:id/access', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_colonies', []);
    const accessSettings = (req.body as any) || {};
    const isPublic = accessSettings.joinMethod === 'discoverable';
    const updated = list.map((c) => (c.id === id ? {
      ...c,
      accessSettings,
      isPublic,
      visibility: isPublic ? 'public' : 'private',
    } : c));
    await communityService.set('community_colonies', updated);
    return { success: true, accessSettings };
  });

  app.post('/colony/colonies/:id/boost', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_colonies', []);
    let updatedColony: any = null;
    const updated = list.map((c) => {
      if (c.id === id) {
        const boostsCount = (c.boostsCount || 0) + 1;
        const boostTier = boostsCount >= 10 ? 3 : boostsCount >= 5 ? 2 : boostsCount >= 2 ? 1 : 0;
        updatedColony = { ...c, boostsCount, boostTier };
        return updatedColony;
      }
      return c;
    });
    await communityService.set('community_colonies', updated);
    return updatedColony || { success: true, boostsCount: 1, boostTier: 0 };
  });

  // ── Colony Members Management (Fullstack) ──
  app.get('/colony/colonies/:id/members', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    return members;
  });

  app.post('/colony/colonies/:id/members', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    const newMember = {
      id: body.id || body.userId || `user_${Date.now()}`,
      name: body.name || 'Anggota Baru',
      username: body.username || undefined,
      avatar: body.avatar || null,
      role: body.role || 'member',
      status: body.status || 'online',
      joinedAt: new Date().toISOString(),
    };
    const updatedMembers = [...members.filter((m) => m.id !== newMember.id), newMember];
    await communityService.set(`community_colony_members_${id}`, updatedMembers);

    const list = await communityService.get<any[]>('community_colonies', []);
    const updatedList = list.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          membersCount: updatedMembers.length,
          onlineCount: updatedMembers.filter((m) => m.status !== 'offline').length || 1,
        };
      }
      return c;
    });
    await communityService.set('community_colonies', updatedList);
    return { success: true, member: newMember, membersCount: updatedMembers.length };
  });

  app.delete('/colony/colonies/:id/members/:userId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    const updatedMembers = members.filter((m) => m.id !== userId);
    await communityService.set(`community_colony_members_${id}`, updatedMembers);

    const list = await communityService.get<any[]>('community_colonies', []);
    const updatedList = list.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          membersCount: Math.max(1, updatedMembers.length),
          onlineCount: Math.max(1, updatedMembers.filter((m) => m.status !== 'offline').length),
        };
      }
      return c;
    });
    await communityService.set('community_colonies', updatedList);
    return { success: true, membersCount: updatedMembers.length };
  });

  app.put('/colony/colonies/:id/members/:userId/role', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const { role } = (req.body as any) || {};
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    const updatedMembers = members.map((m) => (m.id === userId ? { ...m, role: role || m.role } : m));
    await communityService.set(`community_colony_members_${id}`, updatedMembers);
    return { success: true, userId, role };
  });

  // Discovery Endpoint: returns ONLY public/discoverable colonies from real database
  app.get('/colony/colonies/discover', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const query = (req.query as any) || {};
    const q = (query.q || '').toLowerCase().trim();
    const cat = (query.category || '').toLowerCase().trim();

    // Fetch real colonies stored in the database
    const stored = await communityService.get<any[]>('community_colonies', []);

    // Filter strictly for PUBLIC colonies only:
    let publicOnly = stored.filter((c) => {
      if (c.id === 'anticeil' || c.id === 'direct-messages') return false;
      const isExplicitPrivate = c.isPublic === false || c.visibility === 'private' || c.accessSettings?.joinMethod === 'invite_only';
      if (isExplicitPrivate) return false;
      const isExplicitPublic = c.isPublic === true || c.visibility === 'public' || c.accessSettings?.joinMethod === 'discoverable';
      return isExplicitPublic;
    });

    if (cat && cat !== 'all') {
      publicOnly = publicOnly.filter((c) => {
        const matchesCategory = c.category && c.category.toLowerCase() === cat;
        const matchesTag = c.tags && Array.isArray(c.tags) && c.tags.some((t: string) => t.toLowerCase().includes(cat));
        return matchesCategory || matchesTag;
      });
    }

    if (q) {
      publicOnly = publicOnly.filter((c) => {
        const matchName = c.name && c.name.toLowerCase().includes(q);
        const matchDesc = c.description && c.description.toLowerCase().includes(q);
        const matchTag = c.tags && Array.isArray(c.tags) && c.tags.some((t: string) => t.toLowerCase().includes(q));
        return matchName || matchDesc || matchTag;
      });
    }

    // Populate actual member & online counts
    const populated = await Promise.all(
      publicOnly.map(async (c) => {
        const members = await communityService.get<any[]>(`community_colony_members_${c.id}`, []);
        const membersCount = members.length > 0 ? members.length : (typeof c.membersCount === 'number' && c.membersCount > 0 ? c.membersCount : 1);
        const onlineCount = members.length > 0
          ? members.filter((m) => m.status !== 'offline').length || 1
          : (typeof c.onlineCount === 'number' && c.onlineCount > 0 ? c.onlineCount : 1);
        return {
          ...c,
          membersCount,
          onlineCount,
        };
      })
    );

    return populated;
  });

  app.post('/colony/colonies/join', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, inviteCode, user: joinUser } = (req.body as any) || {};
    const stored = await communityService.get<any[]>('community_colonies', []);
    const target = stored.find((c) => c.id === colonyId || (inviteCode && (c.inviteCode === inviteCode || c.id === inviteCode)));
    if (target) {
      const members = await communityService.get<any[]>(`community_colony_members_${target.id}`, []);
      const currentReqUser = (req as any).user || joinUser || {};
      const newMemberId = currentReqUser.id || `user_${Date.now()}`;
      if (!members.some((m) => m.id === newMemberId)) {
        members.push({
          id: newMemberId,
          name: currentReqUser.firstName ? `${currentReqUser.firstName} ${currentReqUser.lastName || ''}`.trim() : (currentReqUser.name || 'Anggota Baru'),
          username: currentReqUser.username || currentReqUser.email?.split('@')[0] || 'member',
          avatar: currentReqUser.avatar || null,
          role: 'member',
          status: 'online',
          joinedAt: new Date().toISOString(),
        });
        await communityService.set(`community_colony_members_${target.id}`, members);
      }
      target.membersCount = members.length;
      target.onlineCount = members.filter((m) => m.status !== 'offline').length || 1;
      await communityService.set('community_colonies', stored);
      return { success: true, colony: target };
    }
    return { success: true, colony: { id: colonyId || inviteCode, name: 'Colony Komunitas', role: 'member', membersCount: 1, onlineCount: 1 } };
  });

  // ── Anticeil Native Cosmetics Shop (Fullstack Database) ──────────────
  const INITIAL_SHOP_ITEMS = [
    // Anticeil Cyber Core Collection
    {
      id: 'shop_anticeil_cyber_bundle',
      name: 'Anticeil Cybernetic Core Bundle (3pc)',
      collection: 'Anticeil Cyber Core',
      category: 'bundle',
      description: 'Paket bundel lengkap: Dekorasi Avatar Cyber Void, Efek Profil Hologram Matrix, dan Nameplate Hex Shield.',
      priceIdr: 140000,
      priceOrbs: 1000,
      discountPercent: 30,
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      previewIcon: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
      badge: 'Bundel Populer',
      itemTypes: ['avatar_decoration', 'profile_effect', 'nameplate'],
      featured: true,
    },
    {
      id: 'shop_anticeil_cyber_void',
      name: 'Cyber Void Frame',
      collection: 'Anticeil Cyber Core',
      category: 'avatar_decoration',
      description: 'Bingkai avatar futuristik dengan aksen neon cybernetic dan partikel hologram berkilau.',
      priceIdr: 65000,
      priceOrbs: 500,
      previewIcon: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
      badge: 'Baru',
      featured: true,
    },
    {
      id: 'shop_anticeil_hex_badge',
      name: 'Hex Matrix Nameplate',
      collection: 'Anticeil Cyber Core',
      category: 'nameplate',
      description: 'Pelat nama sarang lebah futuristik dengan aksen biru sian khas Anticeil.',
      priceIdr: 45000,
      priceOrbs: 350,
      previewIcon: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
      badge: 'Official',
      featured: false,
    },
    // Starlight Cosmic Collection
    {
      id: 'shop_anticeil_cosmic_bundle',
      name: 'Starlight Cosmic Odyssey Bundle (3pc)',
      collection: 'Starlight Cosmic',
      category: 'bundle',
      description: 'Aura galaksi kosmik, cincin avatar nebula bersinar, dan lencana konstelasi eksklusif Anticeil.',
      priceIdr: 150000,
      priceOrbs: 1100,
      discountPercent: 25,
      bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
      previewIcon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
      badge: 'Unggulan',
      itemTypes: ['avatar_decoration', 'profile_effect', 'nameplate'],
      featured: true,
    },
    {
      id: 'shop_anticeil_aurora_glow',
      name: 'Aurora Borealis Spectrum',
      collection: 'Aurora Spectrum',
      category: 'profile_effect',
      description: 'Pendaran cahaya polar aurora hijau zamrud dan violet elegan pada latar kartu profil.',
      priceIdr: 85000,
      priceOrbs: 650,
      previewIcon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
      badge: 'Populer',
      featured: true,
    },
    {
      id: 'shop_anticeil_starlight_crown',
      name: 'Starlight Celestial Crown',
      collection: 'Starlight Cosmic',
      category: 'nameplate',
      description: 'Lencana mahkota bintang berkilau halus di samping nama pengguna Anda.',
      priceIdr: 45000,
      priceOrbs: 350,
      previewIcon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
      badge: 'Hot',
      featured: true,
    },
    // Obsidian Minimalist Collection
    {
      id: 'shop_anticeil_obsidian_frame',
      name: 'Obsidian Geometric Border',
      collection: 'Obsidian Minimalist',
      category: 'avatar_decoration',
      description: 'Garis tepi geometris monokrom tajam dan minimalis untuk tampilan avatar elegan.',
      priceIdr: 55000,
      priceOrbs: 420,
      previewIcon: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&auto=format&fit=crop&q=80',
      badge: 'Minimalis',
      featured: true,
    },
    // Nature & Zen Collection
    {
      id: 'shop_anticeil_sakura_ring',
      name: 'Zen Sakura Petals',
      collection: 'Nature & Zen',
      category: 'avatar_decoration',
      description: 'Kelopak bunga sakura lembut berputar melingkar di sekeliling avatar profil.',
      priceIdr: 65000,
      priceOrbs: 500,
      previewIcon: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=200&auto=format&fit=crop&q=80',
      badge: 'Favorit',
      featured: false,
    },
    {
      id: 'shop_anticeil_fireflies_aura',
      name: 'Golden Fireflies Field',
      collection: 'Nature & Zen',
      category: 'profile_effect',
      description: 'Partikel kunang-kunang keemasan melayang lembut di kartu profil Anda.',
      priceIdr: 85000,
      priceOrbs: 650,
      previewIcon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
      badge: 'Estetik',
      featured: false,
    },
  ];

  const sanitizeShopItems = (items: any[]) => {
    if (!Array.isArray(items)) return INITIAL_SHOP_ITEMS;
    const filtered = items.filter((i) =>
      i &&
      i.collection !== 'Zenless Zone Zero' &&
      i.collection !== 'Deadpool & Wolverine' &&
      i.collection !== 'Dead by Daylight' &&
      !String(i.name || '').includes('Miyabi') &&
      !String(i.name || '').includes('Ellen Joe') &&
      !String(i.name || '').includes('Burnice') &&
      !String(i.name || '').includes('Deadpool') &&
      !String(i.name || '').includes('Wolverine') &&
      !String(i.name || '').includes('Trapper')
    );
    return filtered.length > 0 ? filtered : INITIAL_SHOP_ITEMS;
  };

  app.get('/community/shop/items', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const query = (req.query as any) || {};
    const cat = (query.category || '').toLowerCase().trim();
    const col = (query.collection || '').toLowerCase().trim();
    const q = (query.q || '').toLowerCase().trim();

    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    if (storedItems.length !== rawStored?.length) {
      await communityService.set('community_shop_items', storedItems);
    }

    let filtered = [...storedItems];

    if (cat && cat !== 'all') {
      filtered = filtered.filter((it) => it.category?.toLowerCase() === cat);
    }
    if (col && col !== 'all') {
      filtered = filtered.filter((it) => it.collection?.toLowerCase() === col);
    }
    if (q) {
      filtered = filtered.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.description?.toLowerCase().includes(q) ||
          it.collection?.toLowerCase().includes(q)
      );
    }
    return filtered;
  });

  app.post('/community/shop/items', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const newItem = {
      id: body.id || `shop_custom_${Date.now()}`,
      name: body.name || 'Custom Product',
      collection: body.collection || 'Anticeil Custom',
      category: body.category || 'avatar_decoration',
      description: body.description || 'Eksklusif dibuat oleh komunitas.',
      priceIdr: Number(body.priceIdr) || 78000,
      priceOrbs: Number(body.priceOrbs) || 600,
      discountPercent: body.discountPercent ? Number(body.discountPercent) : undefined,
      bannerUrl: body.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      previewIcon: body.previewIcon || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
      badge: body.badge || 'Baru',
      featured: Boolean(body.featured),
      createdAt: new Date().toISOString(),
    };

    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const updated = [newItem, ...storedItems];
    await communityService.set('community_shop_items', updated);

    return {
      success: true,
      message: 'Item berhasil ditambahkan ke katalog Shop!',
      item: newItem,
      items: updated,
    };
  });

  app.delete('/community/shop/items/:itemId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { itemId } = (req.params as any) || {};
    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const updated = storedItems.filter((i) => i.id !== itemId);
    await communityService.set('community_shop_items', updated);

    return {
      success: true,
      message: 'Item berhasil dihapus dari katalog Shop!',
      deletedId: itemId,
    };
  });

  app.get('/community/shop/featured', {
    config: { security: securityAccess.public() },
  }, async () => {
    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const featuredItems = storedItems.filter((it) => it.featured);

    const defaultCollections = [
      {
        id: 'anticeil_cyber_core',
        name: 'Anticeil Cyber Core',
        tagline: 'Koleksi Resmi Anticeil',
        subtitle: 'Tingkatkan tampilan profil Anda dengan nuansa masa depan, dekorasi hologram neon, dan pelat nama berpresisi tinggi.',
        bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        actionLabel: 'Lihat Koleksi Cyber',
        items: storedItems.filter((i) => i.collection === 'Anticeil Cyber Core'),
      },
      {
        id: 'starlight_cosmic',
        name: 'Starlight Cosmic',
        tagline: 'Galactic Wonder',
        subtitle: 'Pancarkan aura kosmik tak terbatas dengan cincin nebula dan efek aurora konstelasi bintang.',
        bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
        actionLabel: 'Jelajahi Kosmik',
        items: storedItems.filter((i) => i.collection === 'Starlight Cosmic'),
      },
      {
        id: 'obsidian_minimalist',
        name: 'Obsidian Minimalist',
        tagline: 'Sleek & Clean',
        subtitle: 'Desain monokrom premium bagi pengguna yang menyukai estetika rapi, bersih, dan berwibawa.',
        bannerUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
        actionLabel: 'Buka Minimalist',
        items: storedItems.filter((i) => i.collection === 'Obsidian Minimalist'),
      },
    ];

    const rawCollections = await communityService.get<any[]>('community_shop_collections', defaultCollections);
    const sanitizeCollections = (cols: any[]) => {
      if (!Array.isArray(cols)) return defaultCollections;
      const valid = cols.filter((c) =>
        c &&
        c.id !== 'zenless_zone_zero' &&
        c.id !== 'deadpool_wolverine' &&
        c.id !== 'dead_by_daylight' &&
        !String(c.name || '').includes('Zenless') &&
        !String(c.name || '').includes('Marvel') &&
        !String(c.name || '').includes('Deadpool') &&
        !String(c.name || '').includes('Daylight')
      );
      return valid.length > 0 ? valid : defaultCollections;
    };

    const collections = sanitizeCollections(rawCollections);
    if (collections.length !== rawCollections?.length) {
      await communityService.set('community_shop_collections', collections);
    }

    return {
      heroCollection: collections[0] || defaultCollections[0],
      collections,
      featuredItems,
    };
  });

  app.post('/community/shop/featured', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { collections } = (req.body as any) || {};
    if (Array.isArray(collections)) {
      await communityService.set('community_shop_collections', collections);
    }
    return { success: true, message: 'Featured collections berhasil diperbarui!' };
  });

  app.get('/community/shop/balance', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const balance = await communityService.get<any>(`community_shop_balance_${userId}`, {
      orbs: 1500,
      nectar: 250,
      currencyCode: 'IDR',
    });
    return balance;
  });

  app.post('/community/shop/purchase', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { itemId, currency = 'orbs' } = (req.body as any) || {};

    const storedItems = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const targetItem = storedItems.find((i) => i.id === itemId);
    if (!targetItem) {
      return { success: false, message: 'Item tidak ditemukan di Shop.' };
    }

    const inventory = await communityService.get<any[]>(`community_shop_inventory_${userId}`, []);
    if (inventory.some((i) => i.id === itemId)) {
      return { success: true, message: 'Item sudah dimiliki di inventaris Anda.', item: targetItem, alreadyOwned: true };
    }

    // Check balance
    const balanceKey = `community_shop_balance_${userId}`;
    const currentBalance = await communityService.get<any>(balanceKey, { orbs: 1500, nectar: 250, currencyCode: 'IDR' });
    const cost = targetItem.priceOrbs || 600;

    if (currency === 'orbs' && currentBalance.orbs < cost) {
      return { success: false, message: 'Orbs Anda tidak mencukupi untuk item ini.' };
    }

    if (currency === 'orbs') {
      currentBalance.orbs -= cost;
      await communityService.set(balanceKey, currentBalance);
    }

    const purchasedRecord = {
      ...targetItem,
      purchasedAt: new Date().toISOString(),
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const updatedInventory = [...inventory, purchasedRecord];
    await communityService.set(`community_shop_inventory_${userId}`, updatedInventory);

    return {
      success: true,
      message: `Berhasil membeli ${targetItem.name}! 🎉`,
      item: purchasedRecord,
      newBalance: currentBalance,
    };
  });

  app.post('/community/shop/topup', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { amount = 500 } = (req.body as any) || {};

    const balanceKey = `community_shop_balance_${userId}`;
    const currentBalance = await communityService.get<any>(balanceKey, { orbs: 1500, nectar: 250, currencyCode: 'IDR' });
    currentBalance.orbs = (currentBalance.orbs || 0) + Number(amount);
    await communityService.set(balanceKey, currentBalance);

    return {
      success: true,
      message: `Berhasil menambahkan +${amount} Orbs ke saldo Anda! ✨`,
      balance: currentBalance,
    };
  });

  app.get('/community/shop/inventory', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return await communityService.get<any[]>(`community_shop_inventory_${userId}`, []);
  });

  app.get('/community/shop/wishlist', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return await communityService.get<any[]>(`community_shop_wishlist_${userId}`, []);
  });

  app.post('/community/shop/wishlist/:itemId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { itemId } = req.params as { itemId: string };

    const wishlistKey = `community_shop_wishlist_${userId}`;
    const currentWishlist = await communityService.get<any[]>(wishlistKey, []);

    let updatedWishlist: any[];
    let isWishlisted: boolean;

    if (currentWishlist.some((i) => i.id === itemId)) {
      updatedWishlist = currentWishlist.filter((i) => i.id !== itemId);
      isWishlisted = false;
    } else {
      const storedItems = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
      const target = storedItems.find((i) => i.id === itemId);
      if (target) {
        updatedWishlist = [...currentWishlist, target];
        isWishlisted = true;
      } else {
        updatedWishlist = currentWishlist;
        isWishlisted = false;
      }
    }

    await communityService.set(wishlistKey, updatedWishlist);
    return { success: true, isWishlisted, wishlist: updatedWishlist };
  });

  app.post('/community/shop/equip', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { itemId, slot } = (req.body as any) || {};

    const profileKey = `community_user_profile_${userId}`;
    const currentProfile = await communityService.get<any>(profileKey, {});
    const updatedProfile = {
      ...currentProfile,
      [slot]: itemId,
      updatedAt: new Date().toISOString(),
    };
    await communityService.set(profileKey, updatedProfile);
    return { success: true, slot, itemId, profile: updatedProfile };
  });
};
