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
      bio: '',
      pronouns: '',
      bannerColor: '#5c4d44',
      statusThought: '',
      widgets: {
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
        id: 'app-anticeil-tools',
        name: 'Anticeil DevTools Integration',
        authorizedDate: '11/1/2026',
        icon: '⚡',
        permissionsCount: 3,
        permissionsList: [
          'Akses info profil publik',
          'Sinkronisasi status aktivitas kolaboratif',
          'Kirim notifikasi workspace',
        ],
        aboutInfo: 'Integrasi resmi peralatan produktivitas dan kolaborasi Anticeil.',
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

  // ── Anticeil Native Animated Cosmetics Shop (Fullstack Database) ──────
  const INITIAL_SHOP_ITEMS = [
    // 1. Anticeil Cyber Core (Animated Frames, Overlays & Namecards)
    {
      id: 'shop_cyber_void_frame',
      name: 'Cyber Void Frame (Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF dengan cincin sirkuit neon cybernetic berputar dan denyut hologram biru sian.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      badge: 'Animasi Baru',
      featured: true,
    },
    {
      id: 'shop_hex_matrix_nameplate',
      name: 'Hex Matrix Namecard (Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'nameplate',
      description: 'Namecard strip animasi GIF dengan aliran gelombang kode sarang lebah futuristik di samping nama profil.',
      priceIdr: 45000,
      priceDew: 350,
      priceOrbs: 350,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      badge: 'Official',
      featured: false,
    },
    {
      id: 'shop_cyber_stream_overlay',
      name: 'Cyber Stream Overlay (Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'profile_effect',
      description: 'Overlay efek kartu profil animasi GIF dengan hujan kode biner digital dan partikel glitch hologram berkilau.',
      priceIdr: 85000,
      priceDew: 650,
      priceOrbs: 650,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      badge: 'Hot Effect',
      featured: true,
    },
    {
      id: 'shop_anticeil_cyber_bundle',
      name: 'Anticeil Cybernetic Core Bundle (3pc Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'bundle',
      description: 'Paket bundel lengkap: Bingkai Cyber Void, Overlay Matrix Stream, dan Hex Matrix Namecard.',
      priceIdr: 140000,
      priceDew: 1000,
      priceOrbs: 1000,
      discountPercent: 30,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      badge: 'Bundel Populer',
      itemTypes: ['avatar_decoration', 'profile_effect', 'nameplate'],
      featured: true,
    },

    // 2. Starlight Cosmic Collection (Animated Celestial)
    {
      id: 'shop_celestial_halo',
      name: 'Celestial Starlight Halo (Animated)',
      collection: 'Starlight Cosmic',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF lingkaran bintang emas berkilau dan partikel debu kosmik berotasi halus.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      badge: 'Kosmik',
      featured: true,
    },
    {
      id: 'shop_starlight_namecard',
      name: 'Starlight Shimmer Namecard (Animated)',
      collection: 'Starlight Cosmic',
      category: 'nameplate',
      description: 'Namecard strip animasi GIF dengan pancaran pendar kilau konstelasi bintang dan pita nebula emas.',
      priceIdr: 45000,
      priceDew: 350,
      priceOrbs: 350,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      badge: 'Hot',
      featured: false,
    },
    {
      id: 'shop_aurora_glow_overlay',
      name: 'Aurora Borealis Spectrum Overlay (Animated)',
      collection: 'Starlight Cosmic',
      category: 'profile_effect',
      description: 'Overlay animasi GIF tirai cahaya polar aurora hijau zamrud dan violet menari anggun di atas kartu profil.',
      priceIdr: 85000,
      priceDew: 650,
      priceOrbs: 650,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazl5MGI5OTU3a2Z2OXV6ZG42NTRhMW1rNmhrNWw3MWk2M29wb2psciZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7bu3XilJ5BOiSGic/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazl5MGI5OTU3a2Z2OXV6ZG42NTRhMW1rNmhrNWw3MWk2M29wb2psciZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7bu3XilJ5BOiSGic/giphy.gif',
      badge: 'Unggulan',
      featured: true,
    },
    {
      id: 'shop_anticeil_cosmic_bundle',
      name: 'Starlight Cosmic Odyssey Bundle (3pc Animated)',
      collection: 'Starlight Cosmic',
      category: 'bundle',
      description: 'Paket bundel kosmik lengkap: Bingkai Celestial Halo, Overlay Aurora Borealis, dan Starlight Namecard.',
      priceIdr: 150000,
      priceDew: 1100,
      priceOrbs: 1100,
      discountPercent: 25,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      badge: 'Unggulan',
      itemTypes: ['avatar_decoration', 'profile_effect', 'nameplate'],
      featured: true,
    },

    // 3. Nature & Zen Collection
    {
      id: 'shop_zen_sakura_frame',
      name: 'Zen Sakura Petals Frame (Animated)',
      collection: 'Nature & Zen',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF kelopak bunga sakura merah muda berputar melingkar lembut di sekeliling avatar.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3N2c2J3YnpsdzJjcXl0OTk5OHZ4NW9wbjl6MWs1bnlsOXpmdG9zOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/l0MYt5jPR6QX5pnqM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3N2c2J3YnpsdzJjcXl0OTk5OHZ4NW9wbjl6MWs1bnlsOXpmdG9zOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/l0MYt5jPR6QX5pnqM/giphy.gif',
      badge: 'Favorit',
      featured: false,
    },
    {
      id: 'shop_fireflies_overlay',
      name: 'Golden Fireflies Field Overlay (Animated)',
      collection: 'Nature & Zen',
      category: 'profile_effect',
      description: 'Overlay animasi GIF kawanan kunang-kunang keemasan melayang lembut di malam hari menutupi kartu profil.',
      priceIdr: 85000,
      priceDew: 650,
      priceOrbs: 650,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczU3bDN6OXpxeHN3bzI4eWprOWp6cTFscXFkZTBwbzE0bmk4d3JkOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26BRzozg4TCBXv6QU/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczU3bDN6OXpxeHN3bzI4eWprOWp6cTFscXFkZTBwbzE0bmk4d3JkOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26BRzozg4TCBXv6QU/giphy.gif',
      badge: 'Estetik',
      featured: false,
    },

    // 4. Inferno & Void Collection
    {
      id: 'shop_inferno_flame_frame',
      name: 'Inferno Flame Ring (Animated)',
      collection: 'Inferno & Void',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF kobaran api membara melingkari foto profil dengan percikan bara menyala.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjA3YWRmYTVjOGMzMjdhZjhhMmM3ZjcyOGRhZjU2MzExMWJmZWI2MSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKtnuHOHHUjR38Y/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjA3YWRmYTVjOGMzMjdhZjhhMmM3ZjcyOGRhZjU2MzExMWJmZWI2MSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKtnuHOHHUjR38Y/giphy.gif',
      badge: 'Intens',
      featured: true,
    },
    {
      id: 'shop_crimson_scratch_namecard',
      name: 'Crimson Scratch Glitch Namecard (Animated)',
      collection: 'Inferno & Void',
      category: 'nameplate',
      description: 'Namecard strip animasi GIF garis cakar merah darah dan denyut glitch crimson intens.',
      priceIdr: 45000,
      priceDew: 350,
      priceOrbs: 350,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGgyaW05bWJqOWt0aXFzZG12dXB2ZHE5YWRqdGF1MnlqNHU1Mms4ZiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oKIPnAiaMCws8nOsE/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGgyaW05bWJqOWt0aXFzZG12dXB2ZHE5YWRqdGF1MnlqNHU1Mms4ZiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oKIPnAiaMCws8nOsE/giphy.gif',
      badge: 'Dark',
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
      priceDew: Number(body.priceDew) || Number(body.priceOrbs) || 600,
      priceOrbs: Number(body.priceDew) || Number(body.priceOrbs) || 600,
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
    const rawBal = await communityService.get<any>(`community_shop_balance_${userId}`, {
      dew: 1500,
      currencyCode: 'IDR',
    });
    const currentDew = typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500);
    return {
      dew: currentDew,
      orbs: currentDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };
  });

  app.post('/community/shop/purchase', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { itemId, currency = 'dew' } = (req.body as any) || {};

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
    const rawBal = await communityService.get<any>(balanceKey, { dew: 1500, currencyCode: 'IDR' });
    const currentDew = typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500);
    const cost = targetItem.priceDew || targetItem.priceOrbs || 600;

    if ((currency === 'dew' || currency === 'orbs') && currentDew < cost) {
      return { success: false, message: 'Saldo Dew Anda tidak mencukupi untuk item ini.' };
    }

    const updatedDew = (currency === 'dew' || currency === 'orbs') ? currentDew - cost : currentDew;
    const newBalance = {
      dew: updatedDew,
      orbs: updatedDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };

    if (currency === 'dew' || currency === 'orbs') {
      await communityService.set(balanceKey, newBalance);
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
      newBalance,
    };
  });

  app.post('/community/shop/topup', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { amount = 500 } = (req.body as any) || {};

    const balanceKey = `community_shop_balance_${userId}`;
    const rawBal = await communityService.get<any>(balanceKey, { dew: 1500, currencyCode: 'IDR' });
    const currentDew = (typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500)) + Number(amount);
    const newBalance = {
      dew: currentDew,
      orbs: currentDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };
    await communityService.set(balanceKey, newBalance);

    return {
      success: true,
      message: `Berhasil menambahkan +${amount} Dew ke saldo Anda! 💧`,
      balance: newBalance,
    };
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

  // ── 7. Gamification Quests System (F2P Dew Economy) ──
  const INITIAL_QUESTS = [
    {
      id: 'quest_watch_together',
      title: 'YouTube Watch Party Explorer',
      subtitle: 'Tonton video YouTube bersama kawan di Voice Channel selama 10 menit.',
      category: 'activity',
      promoter: 'Anticeil Activities',
      coverUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      badge: 'Unggulan',
      rewardDew: 300,
      rewardIcon: '💧',
      target: 10,
      unit: 'menit',
      actionLabel: 'Mulai Menonton',
      appId: 'youtube-watch',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_chess_master',
      title: 'Anticeil Chess PvP / AI Challenge',
      subtitle: 'Mainkan minimal 1 pertandingan catur multiplayer atau tantang Bot AI.',
      category: 'game',
      promoter: 'Anticeil Games',
      coverUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&auto=format&fit=crop&q=80',
      badge: 'Game Baru',
      rewardDew: 250,
      rewardIcon: '💧',
      target: 1,
      unit: 'ronde',
      actionLabel: 'Main Catur',
      appId: 'chess',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_active_chat',
      title: 'Active Community Messenger',
      subtitle: 'Kirimkan minimal 5 pesan di saluran teks Colony atau pesan langsung.',
      category: 'social',
      promoter: 'Anticeil Community',
      coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      badge: 'Harian',
      rewardDew: 200,
      rewardIcon: '💧',
      target: 5,
      unit: 'pesan',
      actionLabel: 'Mulai Chat',
      appId: 'chat',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_jamspace_board',
      title: 'Jamspace Whiteboard Collab',
      subtitle: 'Buka kanvas Jamspace Whiteboard dan buat sketsa ide bersama teman saluran.',
      category: 'activity',
      promoter: 'Anticeil Studio',
      coverUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80',
      badge: 'Kreatif',
      rewardDew: 200,
      rewardIcon: '💧',
      target: 1,
      unit: 'sesi',
      actionLabel: 'Buka Kanvas',
      appId: 'whiteboard',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_profile_styler',
      title: 'Profil Estetik Eksklusif',
      subtitle: 'Pasang bingkai avatar animasi atau efek profil di pengaturan akun Anda.',
      category: 'profile',
      promoter: 'Anticeil Studio',
      coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      badge: 'Estetik',
      rewardDew: 100,
      rewardIcon: '💧',
      target: 1,
      unit: 'profil',
      actionLabel: 'Buka Profil',
      appId: 'profile',
      endsAt: '2026-12-31T23:59:59Z',
    },
  ];

  app.get('/community/quests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const userQuestsState = await communityService.get<Record<string, any>>(`community_quests_user_${userId}`, {});

    const quests = INITIAL_QUESTS.map((q) => {
      const state = userQuestsState[q.id] || {};
      const status = state.status || 'available';
      const progress = state.progress || 0;
      return {
        ...q,
        status, // 'available' | 'in_progress' | 'completed' | 'claimed'
        progress,
        acceptedAt: state.acceptedAt || null,
        claimedAt: state.claimedAt || null,
      };
    });

    return quests;
  });

  app.post('/community/quests/accept', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { questId } = (req.body as any) || {};

    const target = INITIAL_QUESTS.find((q) => q.id === questId);
    if (!target) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const stateKey = `community_quests_user_${userId}`;
    const userQuestsState = await communityService.get<Record<string, any>>(stateKey, {});
    const existing = userQuestsState[questId] || {};

    if (existing.status === 'claimed') {
      return { success: false, message: 'Quest ini sudah Anda klaim sebelumnya.' };
    }

    userQuestsState[questId] = {
      ...existing,
      status: existing.status === 'completed' ? 'completed' : 'in_progress',
      progress: existing.progress || 0,
      acceptedAt: existing.acceptedAt || new Date().toISOString(),
    };

    await communityService.set(stateKey, userQuestsState);
    return {
      success: true,
      message: `Quest "${target.title}" berhasil diterima! Selesaikan untuk mendapatkan ${target.rewardDew} Dew. 🎯`,
      quest: { ...target, ...userQuestsState[questId] },
    };
  });

  app.post('/community/quests/progress', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { questId, amount = 1 } = (req.body as any) || {};

    const target = INITIAL_QUESTS.find((q) => q.id === questId);
    if (!target) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const stateKey = `community_quests_user_${userId}`;
    const userQuestsState = await communityService.get<Record<string, any>>(stateKey, {});
    const existing = userQuestsState[questId] || { status: 'in_progress', progress: 0 };

    if (existing.status === 'claimed') {
      return { success: false, message: 'Quest ini sudah diklaim.' };
    }

    const newProgress = Math.min(target.target, (existing.progress || 0) + Number(amount));
    const newStatus = newProgress >= target.target ? 'completed' : 'in_progress';

    userQuestsState[questId] = {
      ...existing,
      status: newStatus,
      progress: newProgress,
      completedAt: newStatus === 'completed' ? (existing.completedAt || new Date().toISOString()) : null,
    };

    await communityService.set(stateKey, userQuestsState);
    return {
      success: true,
      message: newStatus === 'completed' ? `Selamat! Quest "${target.title}" telah selesai! Klaim Dew sekarang. 🎉` : `Progress quest "${target.title}" diperbarui.`,
      quest: { ...target, ...userQuestsState[questId] },
    };
  });

  app.post('/community/quests/claim', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { questId } = (req.body as any) || {};

    const target = INITIAL_QUESTS.find((q) => q.id === questId);
    if (!target) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const stateKey = `community_quests_user_${userId}`;
    const userQuestsState = await communityService.get<Record<string, any>>(stateKey, {});
    const existing = userQuestsState[questId] || {};

    if (existing.status === 'claimed') {
      return { success: false, message: 'Hadiah quest ini sudah pernah diklaim.' };
    }

    // Set claimed
    userQuestsState[questId] = {
      ...existing,
      status: 'claimed',
      progress: target.target,
      claimedAt: new Date().toISOString(),
    };
    await communityService.set(stateKey, userQuestsState);

    // Increase User Dew Balance
    const balanceKey = `community_shop_balance_${userId}`;
    const rawBal = await communityService.get<any>(balanceKey, { dew: 1500, currencyCode: 'IDR' });
    const currentDew = typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500);
    const newDew = currentDew + target.rewardDew;
    const newBalance = {
      dew: newDew,
      orbs: newDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };
    await communityService.set(balanceKey, newBalance);

    // Save into claimed history
    const claimedKey = `community_quests_claimed_${userId}`;
    const claimedHistory = await communityService.get<any[]>(claimedKey, []);
    const claimedRecord = {
      ...target,
      claimedAt: new Date().toISOString(),
    };
    await communityService.set(claimedKey, [claimedRecord, ...claimedHistory.filter((c) => c.id !== questId)]);

    return {
      success: true,
      message: `Selamat! Anda berhasil mengklaim +${target.rewardDew} Dew dari quest "${target.title}"! 💧🎉`,
      rewardDew: target.rewardDew,
      newBalance,
      quest: { ...target, ...userQuestsState[questId] },
    };
  });

  app.get('/community/quests/claimed', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return await communityService.get<any[]>(`community_quests_claimed_${userId}`, []);
  });
};
