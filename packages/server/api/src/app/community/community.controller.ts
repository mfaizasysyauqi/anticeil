import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { securityAccess } from '../core/security/authorization/fastify-security';
import { authenticateOrThrow } from '../core/security/v2/authn/authenticate';
import { s3Helper } from '../file/s3-helper';
import { system } from '../helper/system/system';
import { AppSystemProp } from '../helper/system/system-props';
import { communityService } from './community.service';

export const communityController: FastifyPluginAsyncZod = async (app) => {
  // ── Cloudflare R2 Media Upload & CDN Streaming ──
  app.post('/community/upload', {
    config: { security: securityAccess.public() },
    schema: {
      body: z.object({
        filename: z.string(),
        mimeType: z.string().optional(),
        base64: z.string(),
      }),
    },
  }, async (req, reply) => {
    try {
      const { filename, mimeType, base64 } = req.body as {
        filename: string;
        mimeType?: string;
        base64: string;
      };

      const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
      const buffer = Buffer.from(pureBase64, 'base64');
      const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `community/media/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanName}`;

      // Upload directly to Cloudflare R2 via S3 API
      await s3Helper(app.log).uploadFile(s3Key, buffer, mimeType);

      const customCdn = system.get<string>('AP_S3_PUBLIC_URL' as any);
      const publicBase = system.get<string>(AppSystemProp.FRONTEND_URL) || '';
      const url = customCdn
        ? `${customCdn.replace(/\/$/, '')}/${s3Key}`
        : `${publicBase.replace(/\/$/, '')}/api/v1/community/media/${encodeURIComponent(s3Key)}`;

      return {
        url,
        s3Key,
        filename,
        size: buffer.length,
      };
    } catch (err: any) {
      app.log.error(err, 'Failed to upload media to Cloudflare R2');
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        error: 'Upload failed',
        message: err.message,
      });
    }
  });

  app.get('/community/media/:s3Key', {
    config: { security: securityAccess.public() },
  }, async (req, reply) => {
    try {
      const { s3Key } = req.params as { s3Key: string };
      const decodedKey = decodeURIComponent(s3Key);
      const fileBuffer = await s3Helper(app.log).getFile(decodedKey);

      const ext = decodedKey.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        mp4: 'video/mp4',
        webm: 'video/webm',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        pdf: 'application/pdf',
      };
      const contentType = (ext && mimeMap[ext]) || 'application/octet-stream';

      return reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(fileBuffer);
    } catch {
      return reply.status(StatusCodes.NOT_FOUND).send({ error: 'File not found in R2' });
    }
  });
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

  app.put('/community/calendar/events/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_calendar_events', []);
    const updated = list.map((item) => (item.id === id ? { ...item, ...(req.body as any) } : item));
    await communityService.set('community_calendar_events', updated);
    return updated.find((item) => item.id === id) || { success: true, id };
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

  app.post('/community/message-requests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_message_requests', []);
    const newReq = {
      ...(req.body as any),
      id: (req.body as any)?.id || `req_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newReq, ...list.filter((r) => r.id !== newReq.id)];
    await communityService.set('community_message_requests', updated);
    return { success: true, id: newReq.id, request: newReq };
  });

  app.delete('/community/message-requests/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_message_requests', []);
    await communityService.set('community_message_requests', list.filter((r) => r.id !== id));
    return { success: true, id };
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
    const list = await communityService.get<any[]>('billing_payment_methods', []);
    const clean = Array.isArray(list) ? list.filter((p) => p && p.id !== 'pm-qris') : [];
    return clean;
  });

  app.post('/billing/payment-methods', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('billing_payment_methods', []);
    const newPm = { ...(req.body as any), id: `pm_${Date.now()}` };
    const clean = Array.isArray(list) ? list.filter((p) => p && p.id !== 'pm-qris') : [];
    const updated = [newPm, ...clean];
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
    const list = await communityService.get<any[]>('billing_transactions', []);
    const clean = Array.isArray(list) ? list.filter((t) => t && t.id !== 'trx_init_01') : [];
    return clean;
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

  app.post('/billing/gifts', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const gift = {
      ...(req.body as any),
      id: (req.body as any)?.id || `gift_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const list = await communityService.get<any[]>('billing_gifts', []);
    const updated = [gift, ...list.filter((g) => g.id !== gift.id)];
    await communityService.set('billing_gifts', updated);
    return { success: true, gift };
  });

  app.delete('/billing/gifts/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('billing_gifts', []);
    await communityService.set('billing_gifts', list.filter((g) => g.id !== id));
    return { success: true, id };
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

  app.post('/community/apps', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const appItem = {
      ...(req.body as any),
      id: (req.body as any)?.id || `app_${Date.now()}`,
      authorizedDate: new Date().toLocaleDateString(),
    };
    const list = await communityService.get<any[]>('community_apps', []);
    const updated = [appItem, ...list.filter((a) => a.id !== appItem.id)];
    await communityService.set('community_apps', updated);
    return { success: true, app: appItem };
  });

  app.put('/community/apps/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_apps', []);
    const updated = list.map((a) => (a.id === id ? { ...a, ...(req.body as any) } : a));
    await communityService.set('community_apps', updated);
    return { success: true };
  });

  app.delete('/community/apps/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_apps', []);
    await communityService.set('community_apps', list.filter((a) => a.id !== id));
    return { success: true };
  });

  // ── AI Command Center Sessions Endpoints ──
  app.get('/ai-command-center/sessions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return communityService.get<any[]>(`ai_sessions_${userId}`, []);
  });

  app.post('/ai-command-center/sessions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const body = (req.body as any) || {};
    const key = `ai_sessions_${userId}`;
    const sessions = await communityService.get<any[]>(key, []);
    const updated = [body, ...sessions.filter((s) => s.id !== body.id)];
    await communityService.set(key, updated);
    return body;
  });

  app.patch('/ai-command-center/sessions/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `ai_sessions_${userId}`;
    const sessions = await communityService.get<any[]>(key, []);
    const updated = sessions.map((s) => (s.id === id ? { ...s, ...body } : s));
    await communityService.set(key, updated);
    return { success: true, id };
  });

  app.put('/ai-command-center/sessions/:id/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `ai_sessions_${userId}`;
    const sessions = await communityService.get<any[]>(key, []);
    const updated = sessions.map((s) => (s.id === id ? { ...s, messages: body.messages || [] } : s));
    await communityService.set(key, updated);
    return { success: true, id };
  });

  app.patch('/ai-command-center/sessions/:id/pin', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `ai_sessions_${userId}`;
    const sessions = await communityService.get<any[]>(key, []);
    const updated = sessions.map((s) => (s.id === id ? { ...s, isPinned: body.isPinned } : s));
    await communityService.set(key, updated);
    return { success: true, id };
  });

  app.delete('/ai-command-center/sessions/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { id } = (req.params as any) || {};
    const key = `ai_sessions_${userId}`;
    const sessions = await communityService.get<any[]>(key, []);
    await communityService.set(key, sessions.filter((s) => s.id !== id));
    return { success: true, id };
  });

  app.delete('/ai-command-center/sessions/:id/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { id } = (req.params as any) || {};
    const key = `ai_sessions_${userId}`;
    const sessions = await communityService.get<any[]>(key, []);
    const updated = sessions.map((s) => (s.id === id ? { ...s, messages: [] } : s));
    await communityService.set(key, updated);
    return { success: true, id };
  });

  // ── Colony Management & Discovery Endpoints ──
  app.get('/colony/colonies', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const query = (req.query as any) || {};
    const { userId, email, all } = query;
    const authHeader = req.headers['authorization'];
    let currentUserId = userId;
    let currentUserEmail = email ? String(email).toLowerCase().trim() : null;
    if (!currentUserId && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const principal = await authenticateOrThrow(req.log, authHeader);
        if (principal && principal.id) {
          currentUserId = principal.id;
          if (principal.email) currentUserEmail = String(principal.email).toLowerCase().trim();
        }
      } catch {}
    }

    const list = await communityService.get<any[]>('community_colonies', []);
    const populated = await Promise.all(
      list.map(async (c) => {
        const members = await communityService.get<any[]>(`community_colony_members_${c.id}`, []);
        const membersCount = members.length > 0 ? members.length : (typeof c.membersCount === 'number' && c.membersCount > 0 ? c.membersCount : 1);
        const onlineCount = members.length > 0
          ? members.filter((m) => m.status !== 'offline').length || 1
          : (typeof c.onlineCount === 'number' && c.onlineCount > 0 ? c.onlineCount : 1);
        const isMember = Boolean(
          (currentUserId && (c.ownerId === currentUserId || members.some((m) => m.id === currentUserId || m.userId === currentUserId))) ||
          (currentUserEmail && members.some((m) => m.email && m.email.toLowerCase().trim() === currentUserEmail))
        );
        return {
          ...c,
          membersCount,
          onlineCount,
          isMember,
        };
      })
    );

    // If requesting all=true (e.g. discovery / admin), return discoverable colonies
    if (all === 'true' || all === true) {
      return populated.map(({ isMember, ...rest }) => ({ ...rest, isMember }));
    }

    // Default (sidebar rail): Return STRICTLY only colonies the user belongs to + default 'anticeil'
    if (currentUserId || currentUserEmail) {
      return populated
        .filter((c) => c.id === 'anticeil' || c.isMember || (currentUserId && c.ownerId === currentUserId))
        .map(({ isMember, ...rest }) => rest);
    }

    // If no user is identified at all, strictly isolate to default home colony ('anticeil')
    return populated
      .filter((c) => c.id === 'anticeil')
      .map(({ isMember, ...rest }) => rest);
  });

  app.post('/colony/colonies', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_colonies', []);
    const body = (req.body as any) || {};
    const user = (req as any).user || body.user || {};
    const effectiveUserId = body.ownerId || body.userId || user.id || `user_${Date.now()}`;
    const isPublic = body.isPublic !== undefined ? Boolean(body.isPublic) : (body.visibility === 'public');
    const colonyId = body.id || `hub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const creatorMember = {
      id: effectiveUserId,
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (body.ownerName || user.name || 'Admin'),
      username: user.email?.split('@')[0] || body.ownerUsername || user.username || 'admin',
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
      ownerId: effectiveUserId,
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
    const { colonyId, inviteCode, user: joinUser, userId: bodyUserId } = (req.body as any) || {};
    const authHeader = req.headers['authorization'];
    let tokenUserId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const principal = await authenticateOrThrow(req.log, authHeader);
        if (principal && principal.id) tokenUserId = principal.id;
      } catch {}
    }

    const stored = await communityService.get<any[]>('community_colonies', []);
    const target = stored.find((c) => c.id === colonyId || (inviteCode && (c.inviteCode === inviteCode || c.id === inviteCode)));
    if (target) {
      const members = await communityService.get<any[]>(`community_colony_members_${target.id}`, []);
      const currentReqUser = (req as any).user || joinUser || {};
      const newMemberId = bodyUserId || currentReqUser.id || tokenUserId || `user_${Date.now()}`;
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

  // ── Colony Enterprise Tier Royal & SSO Auto-Join (JIT Provisioning) ───
  app.post('/colony/sso/auto-join', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { email, user: joinUser } = (req.body as any) || {};
    if (!email || !email.includes('@')) {
      return { success: false, joinedColonies: [] };
    }
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) {
      return { success: false, joinedColonies: [] };
    }

    const stored = await communityService.get<any[]>('community_colonies', []);
    const joinedColonies: any[] = [];

    for (const colony of stored) {
      // Must be Royal Tier with SSO enabled and claiming this domain
      const isRoyal = colony.tier === 'royal';
      const ssoActive = colony.ssoEnabled !== false;
      const allowedDomains: string[] = Array.isArray(colony.allowedEmailDomains)
        ? colony.allowedEmailDomains.map((d: string) => d.toLowerCase().trim())
        : [];

      if (isRoyal && ssoActive && allowedDomains.includes(domain)) {
        const members = await communityService.get<any[]>(`community_colony_members_${colony.id}`, []);
        const currentReqUser = (req as any).user || joinUser || {};
        const newMemberId = currentReqUser.id || `user_sso_${Date.now()}`;
        const existingIndex = members.findIndex(
          (m) => m.id === newMemberId || (m.email && m.email.toLowerCase() === email.toLowerCase())
        );

        if (existingIndex === -1) {
          members.push({
            id: newMemberId,
            name:
              currentReqUser.firstName
                ? `${currentReqUser.firstName} ${currentReqUser.lastName || ''}`.trim()
                : currentReqUser.name || email.split('@')[0],
            username: currentReqUser.username || email.split('@')[0],
            email,
            avatar: currentReqUser.avatar || null,
            role: 'member',
            status: 'online',
            isSsoUser: true,
            joinedAt: new Date().toISOString(),
          });
          await communityService.set(`community_colony_members_${colony.id}`, members);
        }

        colony.membersCount = members.length;
        colony.onlineCount = members.filter((m) => m.status !== 'offline').length || 1;
        joinedColonies.push(colony);
      }
    }

    if (joinedColonies.length > 0) {
      await communityService.set('community_colonies', stored);
    }

    return { success: true, joinedColonies };
  });

  app.post('/colony/colonies/:id/verify-domain', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const stored = await communityService.get<any[]>('community_colonies', []);
    const target = stored.find((c) => c.id === id);
    if (!target) {
      return { success: false, message: 'Colony tidak ditemukan' };
    }

    target.domainVerified = true;
    target.domainVerificationToken = target.domainVerificationToken || `anticeil-verify=${Math.random().toString(36).slice(2, 12)}`;
    await communityService.set('community_colonies', stored);

    return { success: true, domainVerified: true, token: target.domainVerificationToken };
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

  app.put('/community/shop/items/:itemId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { itemId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const index = storedItems.findIndex((i) => i.id === itemId);
    if (index === -1) {
      return { success: false, message: 'Item tidak ditemukan di Shop.' };
    }
    const updatedItem = {
      ...storedItems[index],
      ...body,
      id: itemId,
      priceIdr: body.priceIdr !== undefined ? Number(body.priceIdr) : storedItems[index].priceIdr,
      priceDew: body.priceDew !== undefined ? Number(body.priceDew) : (body.priceOrbs !== undefined ? Number(body.priceOrbs) : storedItems[index].priceDew),
      priceOrbs: body.priceDew !== undefined ? Number(body.priceDew) : (body.priceOrbs !== undefined ? Number(body.priceOrbs) : storedItems[index].priceOrbs),
    };
    storedItems[index] = updatedItem;
    await communityService.set('community_shop_items', storedItems);
    return {
      success: true,
      message: 'Item berhasil diperbarui!',
      item: updatedItem,
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
    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const userQuestsState = await communityService.get<Record<string, any>>(`community_quests_user_${userId}`, {});

    const quests = questList.map((q) => {
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

  app.post('/community/quests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const newQuest = {
      id: body.id || `quest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: body.title || 'Misi Komunitas Baru',
      subtitle: body.subtitle || 'Selesaikan misi untuk mendapatkan Dew gratis.',
      category: body.category || 'activity',
      promoter: body.promoter || 'Anticeil Community',
      coverUrl: body.coverUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      badge: body.badge || 'Misi Baru',
      rewardDew: Number(body.rewardDew) || 200,
      rewardIcon: '💧',
      target: Number(body.target) || 1,
      unit: body.unit || 'kali',
      actionLabel: body.actionLabel || 'Luncurkan',
      appId: body.appId || 'chat',
      endsAt: body.endsAt || '2026-12-31T23:59:59Z',
      status: 'available',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const currentList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const updated = [newQuest, ...currentList.filter((q) => q.id !== newQuest.id)];
    await communityService.set('community_quests_list', updated);

    return {
      success: true,
      message: `Quest "${newQuest.title}" berhasil ditambahkan! 🎯`,
      quest: newQuest,
      quests: updated,
    };
  });

  app.put('/community/quests/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const currentList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const index = currentList.findIndex((q) => q.id === id);

    if (index === -1) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const updatedQuest = {
      ...currentList[index],
      ...body,
      id,
      rewardDew: body.rewardDew !== undefined ? Number(body.rewardDew) : currentList[index].rewardDew,
      target: body.target !== undefined ? Number(body.target) : currentList[index].target,
    };
    currentList[index] = updatedQuest;
    await communityService.set('community_quests_list', currentList);

    return {
      success: true,
      message: `Quest "${updatedQuest.title}" berhasil diperbarui! ✨`,
      quest: updatedQuest,
    };
  });

  app.delete('/community/quests/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const currentList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const updated = currentList.filter((q) => q.id !== id);
    await communityService.set('community_quests_list', updated);

    return {
      success: true,
      message: 'Quest berhasil dihapus dari daftar!',
      deletedId: id,
    };
  });

  app.post('/community/quests/accept', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { questId } = (req.body as any) || {};

    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const target = questList.find((q) => q.id === questId);
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

    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const target = questList.find((q) => q.id === questId);
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

    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const target = questList.find((q) => q.id === questId);
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

  // ── 1. Friends & Friend Requests Endpoints ──
  app.get('/community/friends', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return communityService.get<any[]>(`community_friends_${userId}`, []);
  });

  app.get('/community/friends/requests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return communityService.get<any[]>(`community_friend_requests_${userId}`, []);
  });

  app.post('/community/friends/request', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const body = (req.body as any) || {};
    const targetUserId = body.targetUserId || body.targetUsername;

    const requestItem = {
      id: `freq_${Date.now()}`,
      senderId: userId,
      senderName: body.senderName || user.name || user.firstName || 'User',
      senderUsername: body.senderUsername || user.username || user.email?.split('@')[0],
      senderAvatar: body.senderAvatar || user.imageUrl || null,
      targetUserId,
      targetUsername: body.targetUsername,
      direction: 'incoming',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Save into recipient's requests
    const recipientKey = `community_friend_requests_${targetUserId}`;
    const recipientReqs = await communityService.get<any[]>(recipientKey, []);
    await communityService.set(recipientKey, [requestItem, ...recipientReqs.filter((r) => r.id !== requestItem.id)]);

    // Save outgoing into sender's requests
    const senderKey = `community_friend_requests_${userId}`;
    const senderReqs = await communityService.get<any[]>(senderKey, []);
    await communityService.set(senderKey, [{ ...requestItem, direction: 'outgoing' }, ...senderReqs]);

    return { success: true, message: 'Permintaan pertemanan berhasil dikirim!' };
  });

  app.post('/community/friends/request/:id/accept', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { id } = (req.params as any) || {};

    const reqsKey = `community_friend_requests_${userId}`;
    const requests = await communityService.get<any[]>(reqsKey, []);
    const targetReq = requests.find((r) => r.id === id);

    if (targetReq) {
      // Remove from requests
      await communityService.set(reqsKey, requests.filter((r) => r.id !== id));

      // Add to friends
      const friendsKey = `community_friends_${userId}`;
      const friends = await communityService.get<any[]>(friendsKey, []);
      const newFriend = {
        id: targetReq.senderId || targetReq.targetUserId || `friend_${Date.now()}`,
        name: targetReq.senderName || targetReq.targetUsername || 'Teman Anticeil',
        username: targetReq.senderUsername || targetReq.targetUsername,
        avatar: targetReq.senderAvatar || null,
        status: 'online',
        createdAt: new Date().toISOString(),
      };
      await communityService.set(friendsKey, [newFriend, ...friends.filter((f) => f.id !== newFriend.id)]);
      return { success: true, friendId: newFriend.id };
    }

    return { success: true };
  });

  app.post('/community/friends/request/:id/ignore', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { id } = (req.params as any) || {};
    const reqsKey = `community_friend_requests_${userId}`;
    const requests = await communityService.get<any[]>(reqsKey, []);
    await communityService.set(reqsKey, requests.filter((r) => r.id !== id));
    return { success: true };
  });

  app.delete('/community/friends/:friendId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { friendId } = (req.params as any) || {};
    const friendsKey = `community_friends_${userId}`;
    const friends = await communityService.get<any[]>(friendsKey, []);
    await communityService.set(friendsKey, friends.filter((f) => f.id !== friendId));
    return { success: true };
  });

  app.get('/community/members', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get<any[]>('community_members_list', []);
  });

  // ── 2. Channels & Categories Endpoints ──
  app.get('/colony/channels', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);
    if (channels.length === 0) {
      const defaultChannels = [
        {
          id: `ch_general_${colonyId}`,
          colonyId,
          name: 'general',
          description: 'Saluran obrolan umum kawan satu colony',
          type: 'text',
          category: 'CHANNELS',
        },
        {
          id: `ch_pengumuman_${colonyId}`,
          colonyId,
          name: 'pengumuman',
          description: 'Informasi dan pengumuman resmi',
          type: 'text',
          category: 'CHANNELS',
        },
        {
          id: `ch_voice_general_${colonyId}`,
          colonyId,
          name: 'Voice Lounge',
          description: 'Ruang ngobrol suara santai',
          type: 'voice',
          category: 'CHANNELS',
        },
        {
          id: `ch_gaming_${colonyId}`,
          colonyId,
          name: 'Gaming & Activities',
          description: 'Mabar game & nobar YouTube Watch Together',
          type: 'voice',
          category: 'CHANNELS',
        },
      ];
      await communityService.set(key, defaultChannels);
      return defaultChannels;
    }
    return channels;
  });

  app.post('/colony/channels', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const colonyId = body.colonyId || body.hubId || 'anticeil';
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);

    const newChannel = {
      id: body.id || `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: body.name || 'new-channel',
      description: body.description || '',
      category: body.category || 'CHANNELS',
      colonyId,
      type: body.type || 'text',
      isPrivate: Boolean(body.isPrivate),
      categoryId: body.categoryId || null,
      categoryName: body.categoryName || null,
      createdAt: new Date().toISOString(),
    };

    const updated = [...channels.filter((c) => c.id !== newChannel.id), newChannel];
    await communityService.set(key, updated);
    return newChannel;
  });

  app.put('/colony/channels/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const colonyId = body.colonyId || 'anticeil';
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);
    const index = channels.findIndex((c) => c.id === id);

    if (index !== -1) {
      const updatedChannel = { ...channels[index], ...body };
      channels[index] = updatedChannel;
      await communityService.set(key, channels);
      return updatedChannel;
    }

    const fallback = { id, ...body, colonyId };
    await communityService.set(key, [...channels, fallback]);
    return fallback;
  });

  app.delete('/colony/channels/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);
    await communityService.set(key, channels.filter((c) => c.id !== id));
    return { success: true, id };
  });

  // ── Colony Categories Endpoints (Fullstack CRUD) ──
  app.get('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.query as any) || {};
    const defaultCategories = colonyId ? [
      { id: `cat_text_${colonyId}`, colonyId, name: 'TEXT CHANNELS', isDefault: true },
      { id: `cat_voice_${colonyId}`, colonyId, name: 'VOICE CHANNELS', isDefault: true },
    ] : [];
    const list = await communityService.get<any[]>('community_colony_categories', []);
    if (colonyId) {
      const colonyCustom = list.filter((c) => c.colonyId === colonyId);
      const defaults = defaultCategories.filter((d) => !colonyCustom.some((c) => c.id === d.id));
      return [...defaults, ...colonyCustom];
    }
    return list;
  });

  app.post('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const newCat = {
      id: body.id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId: body.colonyId,
      name: (body.name || '').trim().toUpperCase(),
    };
    const list = await communityService.get<any[]>('community_colony_categories', []);
    const updated = [...list.filter((c) => c.id !== newCat.id), newCat];
    await communityService.set('community_colony_categories', updated);
    return newCat;
  });

  app.put('/colony/categories/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const list = await communityService.get<any[]>('community_colony_categories', []);
    const updated = list.map((c) => (c.id === id ? { ...c, ...body, name: (body.name || c.name).trim().toUpperCase() } : c));
    await communityService.set('community_colony_categories', updated);
    return updated.find((c) => c.id === id) || { success: true, id };
  });

  app.delete('/colony/categories/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const list = await communityService.get<any[]>('community_colony_categories', []);
    await communityService.set('community_colony_categories', list.filter((c) => c.id !== id));
    return { success: true, id };
  });

  app.get('/colony/channels/:channelId/permissions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_ch_perms_${channelId}`, []);
  });

  app.put('/colony/channels/:channelId/permissions/:targetId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, targetId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_ch_perms_${channelId}`;
    const perms = await communityService.get<any[]>(key, []);
    const overwrite = { id: targetId, ...body };
    const updated = [...perms.filter((p) => p.id !== targetId), overwrite];
    await communityService.set(key, updated);
    return overwrite;
  });

  app.delete('/colony/channels/:channelId/permissions/:targetId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, targetId } = (req.params as any) || {};
    const key = `colony_ch_perms_${channelId}`;
    const perms = await communityService.get<any[]>(key, []);
    await communityService.set(key, perms.filter((p) => p.id !== targetId));
    return { success: true };
  });

  // ── 3. Colony Categories Endpoints ──
  app.get('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    return communityService.get<any[]>(`colony_categories_${colonyId}`, [
      { id: `cat_text_${colonyId}`, colonyId, name: 'TEXT CHANNELS', isDefault: true },
      { id: `cat_voice_${colonyId}`, colonyId, name: 'VOICE CHANNELS', isDefault: true },
    ]);
  });

  app.post('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const colonyId = body.colonyId || 'anticeil';
    const key = `colony_categories_${colonyId}`;
    const current = await communityService.get<any[]>(key, []);
    const newCat = {
      id: body.id || `cat_${Date.now()}`,
      colonyId,
      name: body.name || 'NEW CATEGORY',
      isDefault: false,
    };
    const updated = [...current, newCat];
    await communityService.set(key, updated);
    return newCat;
  });

  app.delete('/colony/categories/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    const key = `colony_categories_${colonyId}`;
    const current = await communityService.get<any[]>(key, []);
    await communityService.set(key, current.filter((c) => c.id !== id));
    return { success: true, id };
  });

  // ── 4. Chat Messages Endpoints ──
  app.get('/colony/channels/:channelId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_messages_${channelId}`, []);
  });

  app.post('/colony/channels/:channelId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_messages_${channelId}`;
    const messages = await communityService.get<any[]>(key, []);

    const newMessage = {
      id: body.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      senderId: body.senderId || 'me',
      senderName: body.senderName || 'User',
      senderEmail: body.senderEmail || '',
      senderAvatar: body.senderAvatar || null,
      senderRole: body.senderRole || 'member',
      content: body.content || '',
      attachments: body.attachments || [],
      poll: body.poll || null,
      reactions: body.reactions || {},
      createdAt: new Date().toISOString(),
    };

    const updated = [...messages.filter((m) => m.id !== newMessage.id), newMessage];
    await communityService.set(key, updated);
    return newMessage;
  });

  app.delete('/colony/messages/:messageId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { messageId } = (req.params as any) || {};
    return { success: true, id: messageId };
  });

  app.post('/colony/messages/:messageId/reactions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { messageId } = (req.params as any) || {};
    const { emoji, userId = 'me' } = (req.body as any) || {};
    const key = `colony_msg_reactions_${messageId}`;
    const reactions = await communityService.get<Record<string, string[]>>(key, {});

    const users = reactions[emoji] || [];
    if (users.includes(userId)) {
      reactions[emoji] = users.filter((u) => u !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji] = [...users, userId];
    }

    await communityService.set(key, reactions);
    return { id: messageId, reactions };
  });

  app.post('/colony/messages/:messageId/poll-vote', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { messageId } = (req.params as any) || {};
    const { answerIds = [], userId = 'me', channelId } = (req.body as any) || {};
    if (channelId) {
      const key = `colony_messages_${channelId}`;
      const messages = await communityService.get<any[]>(key, []);
      const strAnswerIds = answerIds.map(String);
      const updated = messages.map((m) => {
        if (m.id === messageId) {
          const poll = m.poll || m.attachments?.find((a: any) => a.type === 'poll')?.pollData;
          if (poll) {
            const answers = (poll.answers || []).map((ans: any) => {
              const isSelected = strAnswerIds.includes(String(ans.id));
              const existingVotes = (ans.votes || []).filter((u: string) => u !== userId);
              return {
                ...ans,
                votes: isSelected ? [...existingVotes, userId] : existingVotes,
              };
            });
            const updatedPoll = { ...poll, answers };
            return {
              ...m,
              poll: updatedPoll,
              attachments: m.attachments?.map((a: any) =>
                a.type === 'poll' ? { ...a, pollData: updatedPoll } : a
              ),
            };
          }
        }
        return m;
      });
      await communityService.set(key, updated);
    }
    return { success: true };
  });

  // ── 5. Threads Endpoints ──
  app.get('/colony/channels/:channelId/threads', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_threads_${channelId}`, []);
  });

  app.post('/colony/channels/:channelId/threads', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_threads_${channelId}`;
    const threads = await communityService.get<any[]>(key, []);

    const newThread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      name: body.name?.trim() || 'New Thread',
      creatorId: body.creatorId || 'me',
      creatorName: body.creatorName || 'You',
      creatorAvatar: body.creatorAvatar ?? null,
      messageCount: body.initialMessage ? 1 : 0,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newThread, ...threads];
    await communityService.set(key, updated);

    if (body.initialMessage) {
      const msgKey = `colony_thread_msgs_${newThread.id}`;
      const firstMsg = {
        id: `tmsg_${Date.now()}`,
        channelId: newThread.id,
        senderId: newThread.creatorId,
        senderName: newThread.creatorName,
        senderAvatar: newThread.creatorAvatar,
        content: body.initialMessage,
        createdAt: new Date().toISOString(),
      };
      await communityService.set(msgKey, [firstMsg]);
    }

    return newThread;
  });

  app.get('/colony/channels/:channelId/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_thread_msgs_${threadId}`, []);
  });

  app.post('/colony/channels/:channelId/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_thread_msgs_${threadId}`;
    const msgs = await communityService.get<any[]>(key, []);
    const newMsg = {
      id: `tmsg_${Date.now()}`,
      channelId: threadId,
      senderId: body.senderId || 'me',
      senderName: body.senderName || 'You',
      senderAvatar: body.senderAvatar || null,
      content: body.content || '',
      createdAt: new Date().toISOString(),
    };
    await communityService.set(key, [...msgs, newMsg]);
    return newMsg;
  });

  app.put('/colony/channels/:channelId/threads/:threadId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, threadId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_threads_${channelId}`;
    const threads = await communityService.get<any[]>(key, []);
    const updated = threads.map((t) => (t.id === threadId ? { ...t, ...body } : t));
    await communityService.set(key, updated);
    return updated.find((t) => t.id === threadId) || { success: true, id: threadId };
  });

  app.delete('/colony/channels/:channelId/threads/:threadId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, threadId } = (req.params as any) || {};
    const key = `colony_threads_${channelId}`;
    const threads = await communityService.get<any[]>(key, []);
    await communityService.set(key, threads.filter((t) => t.id !== threadId));
    return { success: true, id: threadId };
  });

  app.delete('/colony/threads/:threadId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    return { success: true, id: threadId };
  });

  app.get('/colony/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_thread_msgs_${threadId}`, []);
  });

  app.post('/colony/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_thread_msgs_${threadId}`;
    const msgs = await communityService.get<any[]>(key, []);
    const newMsg = {
      id: `tmsg_${Date.now()}`,
      channelId: threadId,
      senderId: body.senderId || 'me',
      senderName: body.senderName || 'You',
      senderAvatar: body.senderAvatar || null,
      content: body.content || '',
      createdAt: new Date().toISOString(),
    };
    await communityService.set(key, [...msgs, newMsg]);
    return newMsg;
  });

  // ── 6. In-App Notifications Endpoints ──
  app.get('/community/notifications', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const query = (req.query as any) || {};
    const userId = query.userId || user.id;
    if (!userId || userId === 'me') {
      return [];
    }
    const notifs = await communityService.get<any[]>(`community_notifications_${userId}`, []);
    return Array.isArray(notifs) ? notifs : [];
  });

  app.post('/community/notifications', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const body = (req.body as any) || {};

    const rawTargets: string[] = Array.isArray(body.targetUserIds) && body.targetUserIds.length > 0
      ? body.targetUserIds
      : body.targetUserId ? [body.targetUserId] : [];

    const targetUserIds = rawTargets.filter((tid) => Boolean(tid) && tid !== 'undefined' && tid !== 'null');
    if (targetUserIds.length === 0) {
      return { success: false, message: 'No target recipients specified' };
    }

    const results: string[] = [];
    for (const tid of targetUserIds) {
      const key = `community_notifications_${tid}`;
      const notifs = await communityService.get<any[]>(key, []);

      const newNotif = {
        id: body.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: body.title || 'Notifikasi Baru',
        message: body.message || body.summary || '',
        summary: body.summary || body.message || '',
        type: body.type || 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
        ...body,
      };

      await communityService.set(key, [newNotif, ...notifs].slice(0, 100));
      results.push(newNotif.id);
    }

    return { success: true, ids: results, id: results[0] };
  });

  app.put('/community/notifications/:id/read', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const query = (req.query as any) || {};
    const userId = query.userId || user.id || 'me';
    const { id } = (req.params as any) || {};
    const key = `community_notifications_${userId}`;
    const notifs = await communityService.get<any[]>(key, []);
    const updated = notifs.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    await communityService.set(key, updated);
    return { success: true, id };
  });

  app.put('/community/notifications/read-all', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const query = (req.query as any) || {};
    const userId = query.userId || user.id || 'me';
    const key = `community_notifications_${userId}`;
    const notifs = await communityService.get<any[]>(key, []);
    const updated = notifs.map((n) => ({ ...n, isRead: true }));
    await communityService.set(key, updated);
    return { success: true };
  });

  app.delete('/community/notifications/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const query = (req.query as any) || {};
    const userId = query.userId || user.id || 'me';
    const { id } = (req.params as any) || {};
    const key = `community_notifications_${userId}`;
    const notifs = await communityService.get<any[]>(key, []);
    await communityService.set(key, notifs.filter((n) => n.id !== id));
    return { success: true, id };
  });

  app.delete('/community/notifications', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const query = (req.query as any) || {};
    const userId = query.userId || user.id || 'me';
    const key = `community_notifications_${userId}`;
    await communityService.set(key, []);
    await communityService.set('community_notifications_me', []);
    return { success: true };
  });

  // ── 7. Colony Webhooks Endpoints ──
  app.get('/colonies/:colonyId/webhooks', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_webhooks_${colonyId}`, []);
  });

  app.post('/colonies/:colonyId/webhooks', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_webhooks_${colonyId}`;
    const webhooks = await communityService.get<any[]>(key, []);

    const token = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    const newWebhook = {
      id: `wh_${Date.now()}`,
      colonyId,
      channelId: body.channelId || '',
      channelName: body.channelName || '',
      name: body.name || 'Anticeil Bot',
      avatarUrl: body.avatarUrl || null,
      token,
      url: `/api/v1/colonies/webhooks/${token}`,
      createdAt: new Date().toISOString(),
    };

    await communityService.set(key, [newWebhook, ...webhooks]);
    return newWebhook;
  });

  app.delete('/colonies/:colonyId/webhooks/:webhookId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, webhookId } = (req.params as any) || {};
    const key = `colony_webhooks_${colonyId}`;
    const webhooks = await communityService.get<any[]>(key, []);
    await communityService.set(key, webhooks.filter((w) => w.id !== webhookId));
    return { success: true };
  });

  app.put('/colonies/:colonyId/webhooks/:webhookId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, webhookId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_webhooks_${colonyId}`;
    const webhooks = await communityService.get<any[]>(key, []);
    const updated = webhooks.map((w) => (w.id === webhookId ? { ...w, ...body } : w));
    await communityService.set(key, updated);
    return updated.find((w) => w.id === webhookId) || { success: true, webhookId };
  });

  app.post('/colonies/webhooks/:token', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    return { success: true, message: 'Webhook event received successfully' };
  });

  // ── 8. User Security Sessions, 2FA & Settings Endpoints ──
  app.get('/users/me/sessions', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get<any[]>('user_sessions_me', [
      {
        id: 'sess_current',
        deviceName: 'Windows PC (Current)',
        deviceType: 'desktop',
        platform: 'windows',
        browser: 'Chrome / Desktop Client',
        os: 'Windows 11',
        ipAddress: '127.0.0.1',
        location: 'Indonesia',
        lastActive: 'Aktif Sekarang',
        isCurrent: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  app.delete('/users/me/sessions/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const current = await communityService.get<any[]>('user_sessions_me', []);
    await communityService.set('user_sessions_me', current.filter((s) => s.id !== id));
    return { success: true };
  });

  app.post('/users/me/sessions/revoke-others', {
    config: { security: securityAccess.public() },
  }, async () => {
    const current = await communityService.get<any[]>('user_sessions_me', []);
    await communityService.set('user_sessions_me', current.filter((s) => s.isCurrent));
    return { success: true };
  });

  app.get('/users/me/2fa/status', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_2fa_status_me', {
      isEnabled: false,
      enabledAt: null,
      hasBackupCodes: false,
      backupCodesRemaining: 0,
    });
  });

  app.post('/users/me/2fa/enable', {
    config: { security: securityAccess.public() },
  }, async () => {
    const state = {
      isEnabled: true,
      enabledAt: new Date().toISOString(),
      hasBackupCodes: true,
      backupCodesRemaining: 10,
    };
    await communityService.set('user_2fa_status_me', state);
    return { success: true, ...state };
  });

  app.post('/users/me/2fa/disable', {
    config: { security: securityAccess.public() },
  }, async () => {
    const state = {
      isEnabled: false,
      enabledAt: null,
      hasBackupCodes: false,
      backupCodesRemaining: 0,
    };
    await communityService.set('user_2fa_status_me', state);
    return { success: true, ...state };
  });

  app.post('/users/me/2fa/backup-codes/regenerate', {
    config: { security: securityAccess.public() },
  }, async () => {
    return {
      success: true,
      backupCodes: Array.from({ length: 10 }, () => Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
    };
  });

  app.get('/users/me/settings', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_settings_preferences_me', {
      theme: 'dark',
      soundEnabled: true,
      desktopNotifications: true,
      language: 'id',
      compactMode: false,
    });
  });

  app.put('/users/me/settings', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const current = await communityService.get('user_settings_preferences_me', {});
    const updated = { ...current, ...(req.body as any) };
    await communityService.set('user_settings_preferences_me', updated);
    return updated;
  });

  // ── 8. Colony Invites & Pause Invites Management ──
  app.get('/colony/colonies/:colonyId/invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_invites_${colonyId}`, []);
  });

  app.post('/colony/colonies/:colonyId/invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_invites_${colonyId}`;
    const invites = await communityService.get<any[]>(key, []);
    const newInvite = {
      id: body.id || `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      code: body.code || Math.random().toString(36).slice(2, 8).toUpperCase(),
      inviterName: body.inviterName || 'Admin',
      uses: body.uses || 0,
      maxUses: body.maxUses || 0,
      expiresAt: body.expiresAt || null,
      createdAt: body.createdAt || new Date().toISOString(),
    };
    const updated = [newInvite, ...invites.filter((i) => i.id !== newInvite.id)];
    await communityService.set(key, updated);
    return newInvite;
  });

  app.delete('/colony/colonies/:colonyId/invites/:inviteId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, inviteId } = (req.params as any) || {};
    const key = `colony_invites_${colonyId}`;
    const invites = await communityService.get<any[]>(key, []);
    const updated = invites.filter((i) => i.id !== inviteId && i.code !== inviteId);
    await communityService.set(key, updated);
    return { success: true, id: inviteId };
  });

  app.get('/colony/colonies/:colonyId/pause-invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get(`colony_security_pause_${colonyId}`, {
      isPaused: false,
      pauseDuration: '2 hours',
      pauseDMs: false,
    });
  });

  app.post('/colony/colonies/:colonyId/pause-invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const data = {
      isPaused: Boolean(body.isPaused),
      pauseDuration: body.pauseDuration || '2 hours',
      pauseDMs: Boolean(body.pauseDMs),
      updatedAt: new Date().toISOString(),
    };
    await communityService.set(`colony_security_pause_${colonyId}`, data);
    return data;
  });

  // ── Colony Custom Roles ──
  app.get('/colony/colonies/:colonyId/roles', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    if (roles.length === 0) {
      const defaultRoles = [
        {
          id: `role_admin_${colonyId}`,
          colonyId,
          name: 'Admin',
          color: '#5865F2',
          permissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS'],
          position: 1,
        },
        {
          id: `role_moderator_${colonyId}`,
          colonyId,
          name: 'Moderator',
          color: '#22c55e',
          permissions: ['MANAGE_MESSAGES', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS'],
          position: 2,
        },
      ];
      await communityService.set(key, defaultRoles);
      return defaultRoles;
    }
    return roles;
  });

  app.post('/colony/colonies/:colonyId/roles', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    const newRole = {
      id: body.id || `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      name: body.name || 'New Role',
      color: body.color || '#6366f1',
      permissions: body.permissions || ['SEND_MESSAGES'],
      position: body.position || roles.length + 1,
      createdAt: new Date().toISOString(),
    };
    const updated = [...roles.filter((r) => r.id !== newRole.id), newRole];
    await communityService.set(key, updated);
    return newRole;
  });

  app.put('/colony/colonies/:colonyId/roles/:roleId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, roleId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    const updated = roles.map((r) => (r.id === roleId ? { ...r, ...body } : r));
    await communityService.set(key, updated);
    return updated.find((r) => r.id === roleId) || { id: roleId, ...body };
  });

  app.delete('/colony/colonies/:colonyId/roles/:roleId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, roleId } = (req.params as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    await communityService.set(key, roles.filter((r) => r.id !== roleId));
    return { success: true, id: roleId };
  });

  // ── Colony Bans ──
  app.get('/colony/colonies/:colonyId/bans', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_bans_${colonyId}`, []);
  });

  app.post('/colony/colonies/:colonyId/bans', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_bans_${colonyId}`;
    const bans = await communityService.get<any[]>(key, []);
    const newBan = {
      id: body.id || `ban_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      userId: body.userId,
      userName: body.userName,
      userEmail: body.userEmail,
      reason: body.reason || 'Melanggar aturan komunitas',
      bannedByName: body.bannedByName || 'Admin',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    const updated = [newBan, ...bans.filter((b) => b.userId !== newBan.userId)];
    await communityService.set(key, updated);
    return newBan;
  });

  app.delete('/colony/colonies/:colonyId/bans/:userId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, userId } = (req.params as any) || {};
    const key = `colony_bans_${colonyId}`;
    const bans = await communityService.get<any[]>(key, []);
    await communityService.set(key, bans.filter((b) => b.userId !== userId && b.id !== userId));
    return { success: true, userId };
  });

  // ── Colony Audit Log ──
  app.get('/colony/colonies/:colonyId/audit-log', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_audit_${colonyId}`, []);
  });

  app.post('/colony/colonies/:colonyId/audit-log', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_audit_${colonyId}`;
    const logs = await communityService.get<any[]>(key, []);
    const newEntry = {
      id: body.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      action: body.action || 'SERVER_UPDATE',
      actorName: body.actorName || 'Admin',
      targetName: body.targetName || '',
      details: body.details || null,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...logs].slice(0, 100);
    await communityService.set(key, updated);
    return newEntry;
  });

  // ── Colony Stats / Engagement ──
  app.get('/colony/colonies/:colonyId/stats', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get(`colony_stats_${colonyId}`, {
      colonyId,
      totalMembers: 42,
      activeToday: 18,
      totalMessages: 1250,
      totalVoiceMinutes: 340,
    });
  });

  // ── Stage Channels State ──
  app.get('/colony/channels/:channelId/stage', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
      updatedAt: new Date().toISOString(),
    });
  });

  app.post('/colony/channels/:channelId/stage/start', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const updated = {
      ...current,
      status: 'live',
      topic: body.topic || current.topic || 'Stage Discussion',
      speakers: body.speakers || current.speakers || [],
      audience: body.audience || current.audience || [],
      startedAt: new Date().toISOString(),
    };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  app.post('/colony/channels/:channelId/stage/end', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const updated = {
      ...current,
      status: 'waiting',
      endedAt: new Date().toISOString(),
    };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  app.put('/colony/channels/:channelId/stage/topic', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const updated = {
      ...current,
      topic: body.topic || '',
    };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  app.post('/colony/channels/:channelId/stage/hand-raise', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const userId = body.userId;
    const isRaised = Boolean(body.isHandRaised);
    const updatedAudience = (current.audience || []).map((a: any) =>
      a.id === userId ? { ...a, isHandRaised: isRaised } : a,
    );
    const updated = { ...current, audience: updatedAudience };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  // ── Announcement Channels Follow & Crosspost ──
  app.get('/colony/channels/:channelId/followers', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`channel_followers_${channelId}`, []);
  });

  app.post('/colony/channels/:channelId/follow', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `channel_followers_${channelId}`;
    const followers = await communityService.get<any[]>(key, []);
    const newFollow = {
      id: `foll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceChannelId: channelId,
      targetColonyId: body.targetColonyId,
      targetColonyName: body.targetColonyName || 'Target Colony',
      targetChannelId: body.targetChannelId,
      targetChannelName: body.targetChannelName || 'general',
      createdAt: new Date().toISOString(),
    };
    const updated = [...followers, newFollow];
    await communityService.set(key, updated);
    return newFollow;
  });

  app.delete('/colony/channels/:channelId/followers/:followId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, followId } = (req.params as any) || {};
    const key = `channel_followers_${channelId}`;
    const followers = await communityService.get<any[]>(key, []);
    await communityService.set(key, followers.filter((f) => f.id !== followId));
    return { success: true, id: followId };
  });

  app.post('/colony/channels/:channelId/crosspost/:messageId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, messageId } = (req.params as any) || {};
    const followers = await communityService.get<any[]>(`channel_followers_${channelId}`, []);
    const msgsKey = `colony_msgs_${channelId}`;
    const messages = await communityService.get<any[]>(msgsKey, []);
    const targetMsg = messages.find((m) => m.id === messageId);
    
    if (targetMsg && followers.length > 0) {
      for (const f of followers) {
        if (f.targetChannelId) {
          const targetKey = `colony_msgs_${f.targetChannelId}`;
          const destMsgs = await communityService.get<any[]>(targetKey, []);
          const crosspostMsg = {
            ...targetMsg,
            id: `msg_cross_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            channelId: f.targetChannelId,
            content: `📢 **[Dipublikasikan dari #${channelId}]**\n${targetMsg.content}`,
            createdAt: new Date().toISOString(),
          };
          await communityService.set(targetKey, [...destMsgs, crosspostMsg]);
        }
      }
    }
    return { success: true, messageId, publishedTo: followers.length };
  });

  // ── Family Center ──
  app.get('/users/me/family-center', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_family_center_me', {
      connectedTeens: [],
      enableFamilyTab: true,
      receiveSummaryEmails: true,
    });
  });

  app.put('/users/me/family-center', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    await communityService.set('user_family_center_me', body);
    return body;
  });

  // ── Colony Onboarding ──
  app.get('/colony/colonies/:colonyId/onboarding', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get(`colony_onboarding_${colonyId}`, {
      colonyId,
      enabled: true,
      welcomeMessage: 'Selamat datang di komunitas kami!',
      defaultChannels: ['general', 'pengumuman'],
    });
  });

  app.post('/colony/colonies/:colonyId/onboarding', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    await communityService.set(`colony_onboarding_${colonyId}`, { ...body, colonyId, updatedAt: new Date().toISOString() });
    return { success: true, colonyId };
  });

  // ── 9. Realtime Voice Call Signaling Socket Relay ──
  if ((app as any).io) {
    const callRooms = new Map<string, Map<string, any>>();

    (app as any).io.on('connection', (socket: any) => {
      // 1. Join Call Channel
      socket.on('COMMUNITY_CALL_JOIN', (payload: any, callback?: any) => {
        try {
          const { channelId, user, hasVideo, hasAudio, isScreenSharing, plan } = payload || {};
          if (!channelId) return;

          const roomKey = `call_${channelId}`;
          socket.join(roomKey);

          if (!callRooms.has(channelId)) {
            callRooms.set(channelId, new Map());
          }
          const room = callRooms.get(channelId)!;

          // Collect current participants (excluding joining socket)
          const existingParticipants = Array.from(room.values()).filter((p: any) => p.socketId !== socket.id);

          const participantData = {
            socketId: socket.id,
            userId: user?.id,
            userName: user?.name,
            userAvatar: user?.avatar,
            hasVideo: Boolean(hasVideo),
            hasAudio: hasAudio !== undefined ? Boolean(hasAudio) : true,
            isScreenSharing: Boolean(isScreenSharing),
            plan: plan || 'free',
          };
          room.set(socket.id, participantData);

          if (typeof callback === 'function') {
            callback({
              success: true,
              participants: existingParticipants,
            });
          }

          // Notify all other members in this call channel
          socket.to(roomKey).emit('COMMUNITY_CALL_USER_JOINED', {
            ...participantData,
            roomSize: room.size,
          });
        } catch (err) {
          console.error('[COMMUNITY_CALL_JOIN Error]', err);
        }
      });

      // 2. WebRTC Peer Signaling (targeted to specific socket if specified)
      socket.on('COMMUNITY_CALL_SIGNAL', (payload: any) => {
        try {
          const enrichedPayload = {
            ...payload,
            fromSocketId: socket.id,
          };
          if (payload?.targetSocketId) {
            (app as any).io.to(payload.targetSocketId).emit('COMMUNITY_CALL_SIGNAL', enrichedPayload);
          } else if (payload?.channelId) {
            socket.to(`call_${payload.channelId}`).emit('COMMUNITY_CALL_SIGNAL', enrichedPayload);
          } else {
            socket.broadcast.emit('COMMUNITY_CALL_SIGNAL', enrichedPayload);
          }
        } catch (err) {
          console.error('[COMMUNITY_CALL_SIGNAL Error]', err);
        }
      });

      // 3. Media Toggle (Camera / Mic / Screen Share)
      socket.on('COMMUNITY_CALL_TOGGLE_MEDIA', (payload: any) => {
        try {
          const { channelId, hasVideo, hasAudio, isScreenSharing } = payload || {};
          if (!channelId) return;

          const room = callRooms.get(channelId);
          if (room && room.has(socket.id)) {
            const current = room.get(socket.id);
            if (hasVideo !== undefined) current.hasVideo = hasVideo;
            if (hasAudio !== undefined) current.hasAudio = hasAudio;
            if (isScreenSharing !== undefined) current.isScreenSharing = isScreenSharing;
            room.set(socket.id, current);
          }

          socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_PEER_MEDIA_UPDATED', {
            socketId: socket.id,
            hasVideo,
            hasAudio,
            isScreenSharing,
          });
        } catch (err) {
          console.error('[COMMUNITY_CALL_TOGGLE_MEDIA Error]', err);
        }
      });

      // 4. Leave Call
      socket.on('COMMUNITY_CALL_LEAVE', (payload: any) => {
        try {
          const { channelId } = payload || {};
          if (channelId) {
            const roomKey = `call_${channelId}`;
            socket.leave(roomKey);
            const room = callRooms.get(channelId);
            if (room) {
              room.delete(socket.id);
              if (room.size === 0) callRooms.delete(channelId);
            }
            socket.to(roomKey).emit('COMMUNITY_CALL_USER_LEFT', { socketId: socket.id });
          } else {
            socket.broadcast.emit('COMMUNITY_CALL_USER_LEFT', { socketId: socket.id });
          }
        } catch (err) {
          console.error('[COMMUNITY_CALL_LEAVE Error]', err);
        }
      });

      // 5. Cleanup on disconnect
      socket.on('disconnect', () => {
        try {
          callRooms.forEach((room, channelId) => {
            if (room.has(socket.id)) {
              room.delete(socket.id);
              if (room.size === 0) callRooms.delete(channelId);
              socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_USER_LEFT', { socketId: socket.id });
            }
          });
        } catch {}
      });

      socket.on('COMMUNITY_CALL_ACTIVITY_EVENT', (payload: any) => {
        if (payload?.channelId) {
          socket.to(`call_${payload.channelId}`).emit('COMMUNITY_CALL_ACTIVITY_EVENT', payload);
        } else {
          socket.broadcast.emit('COMMUNITY_CALL_ACTIVITY_EVENT', payload);
        }
      });

      socket.on('COMMUNITY_STAGE_EVENT', (payload: any) => {
        if (payload?.channelId) {
          socket.to(`call_${payload.channelId}`).emit('COMMUNITY_STAGE_EVENT', payload);
        } else {
          socket.broadcast.emit('COMMUNITY_STAGE_EVENT', payload);
        }
      });
    });
  }
};
