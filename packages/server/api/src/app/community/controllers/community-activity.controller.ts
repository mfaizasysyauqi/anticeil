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

  // ── Activities & Applications Catalog (Fullstack Database) ──
  app.get('/community/activities/catalog', {
    config: { security: securityAccess.public() },
  }, async () => {
    const list = await communityService.get<any[]>('community_activities_catalog', []);
    if (!list || list.length === 0) {
      const defaultCatalog = [
        {
          id: 'anticeil-flow',
          title: 'Anticeil Flow',
          bannerTitle: 'ANTICEIL FLOW',
          developer: 'Anticeil Official',
          category: 'productivity',
          bannerGradient: 'from-blue-600 via-indigo-800 to-zinc-950',
          bannerImage: 'https://images.unsplash.com/photo-1644088379091-d574269d422f?auto=format&fit=crop&w=1200&q=80',
          iconBg: 'bg-primary/10 border border-primary/20',
          iconColor: 'text-primary',
          iconName: 'AnticeilLogo',
          tagline: 'Sistem otomasi alur kerja visual (n8n-style) & integrasi cerdas Anticeil...',
          description: 'Bangun dan orkestrasi otomasi alur kerja visual seperti n8n dengan trigger, action, dan webhook terintegrasi SSO Anticeil.',
          isRecent: true,
          isPromoted: true,
          badge: 'OFFICIAL',
          accentColor: '#2563eb',
          buttonClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-600/25 border-0',
          serverCount: 'Official Core',
          supportedLanguages: ['English, US', 'Bahasa Indonesia'],
          screenshots: [
            'https://images.unsplash.com/photo-1644088379091-d574269d422f?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80',
          ],
          overviewLong: 'Anticeil Flow adalah sistem orkestrasi alur kerja visual (workflow automation) mirip n8n. Hubungkan berbagai webhook, pemicu (trigger), API eksternal, dan aksi (actions) secara otomatis dalam diagram alur visual node-based tanpa koding rumit, terhubung langsung melalui Single Sign-On (SSO) akun Anticeil Anda.',
          howToPlay: 'Klik Luncurkan atau Buka Flow untuk masuk ke canvas otomasi. Tambahkan node trigger, hubungkan dengan node action atau webhook, lalu aktifkan flow untuk mengeksekusi otomasi secara real-time.',
        },
        {
          id: 'watch-together',
          title: 'Watch Together',
          bannerTitle: 'WATCH TOGETHER',
          developer: 'YouTube',
          category: 'entertainment',
          bannerGradient: 'from-red-600 via-rose-700 to-zinc-950',
          bannerImage: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=1200&q=80',
          iconBg: 'bg-red-500/10 border border-red-500/20',
          iconColor: 'text-[#ff0000]',
          iconName: 'YouTubeIcon',
          tagline: 'Tonton video YouTube bersama...',
          description: 'Nikmati video YouTube, playlist, musik, dan livestream bersama seluruh anggota panggilan secara sinkron tanpa jeda waktu.',
          isRecent: true,
          isPromoted: true,
          badge: 'POPULER',
          accentColor: '#ef4444',
          buttonClass: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md shadow-red-600/25 border-0',
          serverCount: 'In 787K colonies',
          supportedLanguages: ['English, US', 'Bahasa Indonesia'],
          screenshots: [
            'https://images.unsplash.com/photo-1540655037529-dec987208707?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=1200&q=80',
          ],
          overviewLong: 'Watch Together adalah sarana kolaboratif untuk menonton video dan livestream YouTube bersama orang lain secara real-time. Di Watch Together, semua peserta dapat berpartisipasi menyusun antrean playlist video bersama dengan sinkronisasi otomatis.',
          howToPlay: 'Cari judul video atau paste link YouTube di kolom pencarian. Tambahkan video ke antrean bersama, dan nikmati sinkronisasi pemutaran video secara instan.',
        },
        {
          id: 'tradingview',
          title: 'TradingView Charts',
          bannerTitle: 'TRADINGVIEW',
          developer: 'TradingView (Open Source)',
          category: 'productivity',
          bannerGradient: 'from-blue-600 via-indigo-700 to-zinc-950',
          bannerImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
          iconBg: 'bg-[#1e222d] border border-sky-500/30',
          iconColor: 'text-[#2962ff]',
          iconName: 'TradingViewIcon',
          tagline: 'Grafik pasar finansial & kripto realtime...',
          description: 'Analisis teknikal, candlestick chart, indikator MA & volume realtime untuk Crypto, Saham, dan Forex menggunakan TradingView Lightweight Charts resmi (Lisensi Open-Source Apache 2.0).',
          isRecent: true,
          isPromoted: true,
          badge: 'OPEN SOURCE',
          accentColor: '#2962ff',
          buttonClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-600/25 border-0',
          serverCount: 'In 142K colonies',
          supportedLanguages: ['English, US', 'Bahasa Indonesia'],
          screenshots: [
            'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=1200&q=80',
          ],
          overviewLong: 'Platform charting finansial interaktif yang ditenagai oleh TradingView Lightweight Charts. Analisis pergerakan pasar Kripto, Saham, dan Forex dengan candlestick multi-timeframe serta indikator teknikal (SMA, EMA, Volume).',
          howToPlay: 'Pilih pasangan aset pasar (BTC/USDT, ETH, Saham), ubah timeframe grafik, dan aktifkan indikator teknikal untuk analisis pergerakan harga.',
        },
        {
          id: 'chess',
          title: 'Anticeil Chess',
          bannerTitle: 'ANTICEIL CHESS',
          developer: 'Anticeil Native',
          category: 'game',
          bannerGradient: 'from-amber-700 via-stone-800 to-zinc-950',
          bannerImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1200&q=80',
          iconBg: 'bg-amber-500/10 border border-amber-500/20',
          iconColor: 'text-amber-400',
          iconName: 'Crown',
          tagline: 'Main catur bersama lawan Bot atau teman...',
          description: 'Bermain catur interaktif di voice channel. Tantang teman satu colony atau asah strategi melawan Bot AI cerdas.',
          isRecent: true,
          isPromoted: true,
          badge: 'OFFICIAL',
          accentColor: '#f59e0b',
          buttonClass: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-md shadow-amber-600/25 border-0',
          serverCount: 'In 310K colonies',
          supportedLanguages: ['English, US', 'Bahasa Indonesia'],
          screenshots: [
            'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&w=1200&q=80',
          ],
          overviewLong: 'Papan catur interaktif realtime yang dapat dimainkan baik di dalam voice channel bersama rekan tim maupun secara mandiri. Dilengkapi sistem validasi langkah akurat dan mode tanding bot cerdas.',
          howToPlay: 'Geser bidak catur di atas papan sesuai aturan legal. Aktifkan Mode Bot AI untuk bermain solo atau bertanding dengan teman dalam room suara.',
        },
        {
          id: 'whiteboard',
          title: 'Jamspace Whiteboard',
          bannerTitle: 'JAMSPACE',
          developer: 'Anticeil Native',
          category: 'productivity',
          bannerGradient: 'from-blue-600 via-indigo-700 to-slate-950',
          bannerImage: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=80',
          iconBg: 'bg-blue-500/10 border border-blue-500/20',
          iconColor: 'text-blue-400',
          iconName: 'Palette',
          tagline: 'Papan tulis kolaboratif realtime...',
          description: 'Papan kanvas interaktif realtime untuk coret-coret skema arsitektur, diagram alur, wireframe, atau ide proyek baru bersama tim.',
          isRecent: true,
          isPromoted: true,
          badge: 'OFFICIAL',
          accentColor: '#3b82f6',
          buttonClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-600/25 border-0',
          serverCount: 'In 520K colonies',
          supportedLanguages: ['English, US', 'Bahasa Indonesia'],
          screenshots: [
            'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
          ],
          overviewLong: 'Papan kanvas tanpa batas berkecepatan tinggi untuk sketsa konsep desain, diagram alur sistem, coret-coret kreatif, dan brainstorming ide proyek bersama tim secara realtime.',
          howToPlay: 'Pilih kuas, bangun bentuk persegi/lingkaran, tulis teks catatan, dan undang tim Anda untuk menggambar bersama di kanvas tak terbatas.',
        },
        {
          id: 'screenshare',
          title: 'Share Screen',
          bannerTitle: 'SHARE SCREEN',
          developer: 'Anticeil Native',
          category: 'productivity',
          bannerGradient: 'from-violet-600 via-purple-700 to-zinc-950',
          bannerImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
          iconBg: 'bg-violet-500/10 border border-violet-500/20',
          iconColor: 'text-violet-400',
          iconName: 'ScreenShare',
          tagline: 'Berbagi layar komputer & presentasi...',
          description: 'Bagikan jendela aplikasi, tab browser, atau seluruh layar Anda dengan audio jernih dan latensi ultra-rendah untuk presentasi atau co-working.',
          isRecent: true,
          isPromoted: true,
          badge: 'OFFICIAL',
          accentColor: '#8b5cf6',
          buttonClass: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-md shadow-violet-600/25 border-0',
          serverCount: 'In 950K colonies',
          supportedLanguages: ['English, US', 'Bahasa Indonesia'],
          screenshots: [
            'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          ],
          overviewLong: 'Fitur berbagi layar bawaan beresolusi tinggi dengan dukungan transmisi audio jernih dan frame rate lancar untuk demonstrasi produk, presentasi slide, atau kerja kolaboratif.',
          howToPlay: 'Pilih jendela atau layar yang ingin Anda presentasikan, atur resolusi dan frame rate, lalu mulai sesi siaran langsung kepada semua partisipan.',
        },
      ];
      await communityService.set('community_activities_catalog', defaultCatalog);
      return defaultCatalog;
    }
    return list;
  });

  app.get('/community/activities/catalog/:id', {
    config: { security: securityAccess.public() },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_activities_catalog', []);
    const item = list.find((a: any) => a.id === id);
    if (!item) {
      return reply.status(StatusCodes.NOT_FOUND).send({ error: 'Activity app not found' });
    }
    return item;
  });

  app.post('/community/activities/catalog', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_activities_catalog', []);
    const body = req.body as any;
    const newApp = {
      ...body,
      id: body.id || `app_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newApp, ...list.filter((a) => a.id !== newApp.id)];
    await communityService.set('community_activities_catalog', updated);
    return newApp;
  });

  app.put('/community/activities/catalog/:id', {
    config: { security: securityAccess.public() },
  }, async (req, reply) => {
    const body = (req.body as any) || {};
    const email = (body.userEmail || req.headers['x-user-email'] || (req as any).user?.email || '').toString().toLowerCase().trim();
    if (email !== 'anticeil.official@gmail.com') {
      return reply.status(StatusCodes.FORBIDDEN).send({
        error: 'Akses ditolak: Hanya akun resmi anticeil.official@gmail.com yang diizinkan mengedit metadata katalog aplikasi.',
      });
    }

    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_activities_catalog', []);
    const { userEmail: _, ...cleanBody } = body;
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) {
      const newApp = { ...cleanBody, id };
      const updated = [newApp, ...list];
      await communityService.set('community_activities_catalog', updated);
      return newApp;
    }
    const updatedApp = { ...list[index], ...cleanBody, id };
    list[index] = updatedApp;
    await communityService.set('community_activities_catalog', list);
    return updatedApp;
  });

  app.delete('/community/activities/catalog/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_activities_catalog', []);
    const updated = list.filter((a) => a.id !== id);
    await communityService.set('community_activities_catalog', updated);
    return { success: true, id };
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
    if (!userId || userId === 'me' || userId === 'undefined' || userId === 'null') {
      return [];
    }
    return communityService.get<any[]>(`community_friends_${userId}`, []);
  });

  app.get('/community/friends/requests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const userId = await extractUserIdFromReq(req);
    if (!userId || userId === 'me' || userId === 'undefined' || userId === 'null') {
      return [];
    }
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
