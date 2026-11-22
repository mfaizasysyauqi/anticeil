import fs from 'node:fs';
import path from 'node:path';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { securityAccess } from '../../core/security/authorization/fastify-security';
import { authenticateOrThrow } from '../../core/security/v2/authn/authenticate';
import { s3Helper } from '../../file/s3-helper';
import { system } from '../../helper/system/system';
import { AppSystemProp } from '../../helper/system/system-props';
import { communityService } from '../community.service';

export const communityActivityController: FastifyPluginAsyncZod = async (app) => {
  // Helper to extract effective authenticated or query user ID
  const extractUserIdFromReq = async (req: any): Promise<string> => {
    const query = (req.query as any) || {};
    const body = (req.body as any) || {};
    let userId = query.userId || body.userId;
    if (!userId) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const principal = await authenticateOrThrow(req.log, authHeader);
          if (principal && principal.id) userId = principal.id;
        } catch {}
      }
    }
    if (!userId) {
      const user = (req as any).user || {};
      userId = user.id || 'me';
    }
    return String(userId);
  };
  // ── Cloudflare R2 Media Upload & CDN Streaming (With Oracle VM Local Fallback) ──
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

      let url: string | null = null;
      // 1. Try upload directly to Cloudflare R2 via S3 API
      try {
        await s3Helper(app.log).uploadFile(s3Key, buffer, mimeType);
        const customCdn = system.get<string>('AP_S3_PUBLIC_URL' as any);
        const publicBase = system.get<string>(AppSystemProp.FRONTEND_URL) || '';
        url = customCdn
          ? `${customCdn.replace(/\/$/, '')}/${s3Key}`
          : `${publicBase.replace(/\/$/, '')}/api/v1/community/media/${encodeURIComponent(s3Key)}`;
      } catch (s3Err) {
        app.log.warn({ err: s3Err, s3Key }, 'Cloudflare R2 direct upload failed, saving to Oracle VM local storage');
      }

      // 2. Fallback to Oracle VM local storage if R2 was unreachable or not yet configured
      if (!url) {
        const mediaDir = path.resolve(process.cwd(), 'cache', 'media');
        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
        const localFileName = s3Key.replace(/[\/\\]/g, '_');
        fs.writeFileSync(path.join(mediaDir, localFileName), buffer);
        const publicBase = system.get<string>(AppSystemProp.FRONTEND_URL) || '';
        url = `${publicBase.replace(/\/$/, '')}/api/v1/community/media/${encodeURIComponent(s3Key)}`;
      }

      return {
        url,
        s3Key,
        filename,
        size: buffer.length,
      };
    } catch (err: any) {
      app.log.error(err, 'Failed to process media upload');
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

      let fileBuffer: Buffer | null = null;
      // 1. Try Cloudflare R2
      try {
        fileBuffer = await s3Helper(app.log).getFile(decodedKey);
      } catch {
        // 2. Try Oracle VM local disk storage
        const mediaDir = path.resolve(process.cwd(), 'cache', 'media');
        const localFileName = decodedKey.replace(/[\/\\]/g, '_');
        const localPath = path.join(mediaDir, localFileName);
        if (fs.existsSync(localPath)) {
          fileBuffer = fs.readFileSync(localPath);
        }
      }

      if (!fileBuffer) {
        return reply.status(StatusCodes.NOT_FOUND).send({ error: 'File not found in storage' });
      }

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
      return reply.status(StatusCodes.NOT_FOUND).send({ error: 'File not found' });
    }
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

  // ── In-App Notifications Endpoints ──
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

  // ── Friends & Friend Requests Endpoints ──
  app.get('/community/friends', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const userId = await extractUserIdFromReq(req);
    return communityService.get<any[]>(`community_friends_${userId}`, []);
  });

  app.get('/community/friends/requests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const userId = await extractUserIdFromReq(req);
    return communityService.get<any[]>(`community_friend_requests_${userId}`, []);
  });

  app.post('/community/friends/request', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = await extractUserIdFromReq(req);
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
    const userId = await extractUserIdFromReq(req);
    const { id } = (req.params as any) || {};

    const reqsKey = `community_friend_requests_${userId}`;
    const requests = await communityService.get<any[]>(reqsKey, []);
    const targetReq = requests.find((r) => r.id === id);

    if (targetReq) {
      // Remove from requests
      await communityService.set(reqsKey, requests.filter((r) => r.id !== id));

      // Add to recipient's friends
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

      // Reciprocal: Add recipient to sender's friends list
      if (targetReq.senderId && targetReq.senderId !== userId) {
        const senderFriendsKey = `community_friends_${targetReq.senderId}`;
        const senderFriends = await communityService.get<any[]>(senderFriendsKey, []);
        const recipientFriend = {
          id: userId,
          name: (req.body as any)?.userName || user.name || user.firstName || 'Teman Anticeil',
          username: (req.body as any)?.userUsername || user.username || user.email?.split('@')[0],
          avatar: (req.body as any)?.userAvatar || user.imageUrl || null,
          status: 'online',
          createdAt: new Date().toISOString(),
        };
        await communityService.set(senderFriendsKey, [recipientFriend, ...senderFriends.filter((f) => f.id !== recipientFriend.id)]);
      }

      return { success: true, friendId: newFriend.id };
    }

    return { success: true };
  });

  app.post('/community/friends/request/:id/ignore', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const userId = await extractUserIdFromReq(req);
    const { id } = (req.params as any) || {};
    const reqsKey = `community_friend_requests_${userId}`;
    const requests = await communityService.get<any[]>(reqsKey, []);
    await communityService.set(reqsKey, requests.filter((r) => r.id !== id));
    return { success: true };
  });

  app.delete('/community/friends/:friendId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const userId = await extractUserIdFromReq(req);
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
};
