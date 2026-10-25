import { createAction, Property } from '@activepieces/pieces-framework';
import {
  HttpRequest,
  HttpMethod,
  httpClient,
} from '@activepieces/pieces-common';

export const sendChannelMessage = createAction({
  name: 'send_channel_message',
  displayName: 'Kirim Pesan ke Channel',
  description: 'Kirim pesan bot otomatis ke saluran Anticeil Chat melalui Webhook URL atau ID Saluran.',
  requireAuth: false,
  props: {
    webhookUrl: Property.ShortText({
      displayName: 'Webhook URL',
      description: 'Salin Webhook URL dari Pengaturan Saluran Anticeil Chat (contoh: https://anticeil.com/api/v1/community/webhook?channelId=ch-...&hubId=anticeil)',
      required: false,
      placeholder: 'https://anticeil.com/api/v1/community/webhook?channelId=ch-...',
    }),
    channel: Property.ShortText({
      displayName: 'ID Saluran / Nama Channel (Opsional)',
      description: 'Opsional jika Webhook URL sudah diisi. Masukkan nama channel (contoh: general) atau ID saluran (contoh: ch-...).',
      required: false,
    }),
    channelId: Property.ShortText({
      displayName: 'ID Saluran (Alias)',
      description: 'Opsional. Alias jika ingin mengisi parameter channelId secara spesifik.',
      required: false,
    }),
    hubId: Property.ShortText({
      displayName: 'ID Server / Hub ID (Opsional)',
      description: 'Opsional jika Webhook URL sudah diisi. ID Server Anticeil Chat (default: anticeil).',
      required: false,
    }),
    content: Property.LongText({
      displayName: 'Isi Pesan (Markdown)',
      description: 'Pesan yang ingin dikirim. Mendukung sintaks Markdown (bold, italic, list, link, code).',
      required: true,
    }),
    botName: Property.ShortText({
      displayName: 'Nama Bot',
      description: 'Nama bot pengirim yang akan ditampilkan dengan badge [BOT] ungu.',
      required: false,
      defaultValue: 'Anticeil Bot',
    }),
    botAvatar: Property.ShortText({
      displayName: 'Avatar URL',
      description: 'Opsional: URL gambar avatar bot.',
      required: false,
    }),
  },
  async run(context) {
    const rawWebhook = context.propsValue.webhookUrl?.trim();
    let channel = (context.propsValue.channel || context.propsValue.channelId || (context.propsValue as any).channel)?.trim();
    let hubId = context.propsValue.hubId?.trim();
    const content = context.propsValue.content;
    const botName = context.propsValue.botName || 'Anticeil Bot';
    const botAvatar = context.propsValue.botAvatar || undefined;

    console.log('[Anticeil Chat Piece] Action execution started');
    console.log('[Anticeil Chat Piece] Received props:', {
      hasWebhookUrl: Boolean(rawWebhook),
      webhookUrl: rawWebhook ? `${rawWebhook.substring(0, 45)}...` : null,
      channel,
      hubId,
      botName,
      contentLength: content?.length || 0,
    });

    // Auto-extract channelId and hubId from Webhook URL query parameters
    if (rawWebhook) {
      try {
        const parsed = new URL(rawWebhook);
        const urlChannel = parsed.searchParams.get('channelId') || parsed.searchParams.get('channel');
        const urlHubId = parsed.searchParams.get('hubId');
        if (urlChannel) {
          channel = urlChannel;
        }
        if (urlHubId) {
          hubId = urlHubId;
        }
        console.log('[Anticeil Chat Piece] Extracted from Webhook URL:', { channel, hubId });
      } catch (e: any) {
        console.warn('[Anticeil Chat Piece] Could not parse Webhook URL as URL object:', e?.message);
      }
    }

    channel = channel || 'general';
    hubId = hubId || 'anticeil';

    let targetUrl: string;

    if (rawWebhook && (rawWebhook.startsWith('http://') || rawWebhook.startsWith('https://'))) {
      targetUrl = rawWebhook;
    } else {
      const baseUrl =
        process.env['AP_INTERNAL_URL'] ||
        process.env['AP_FRONTEND_URL'] ||
        process.env['FRONTEND_URL'] ||
        'http://127.0.0.1:3000';
      targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/community/webhook`;
    }

    const payload = {
      channel,
      channelId: channel,
      hubId,
      content,
      botName,
      botAvatar,
    };

    // Candidate URLs for robust delivery inside Docker networks or direct HTTP
    const candidates: string[] = [];
    const internalUrl = process.env['AP_INTERNAL_URL']?.replace(/\/+$/, '');

    if (targetUrl.includes('anticeil.com') || targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) {
      const parsedPath = targetUrl.replace(/https?:\/\/[^\/]+/, '');
      if (internalUrl) {
        candidates.push(`${internalUrl}${parsedPath}`);
      }
      candidates.push(`http://app:80${parsedPath}`);
      candidates.push(`http://activepieces-app:80${parsedPath}`);
      candidates.push(`http://127.0.0.1:8080${parsedPath}`);
    }
    candidates.push(targetUrl);

    console.log('[Anticeil Chat Piece] Final target candidates:', candidates);
    console.log('[Anticeil Chat Piece] Sending payload:', JSON.stringify(payload));

    let lastError: any = null;
    for (const url of candidates) {
      try {
        console.log(`[Anticeil Chat Piece] Sending POST to: ${url}`);
        const response = await httpClient.sendRequest<{ success: boolean; message?: any }>({
          method: HttpMethod.POST,
          url,
          body: payload,
          timeout: 5000,
        });
        console.log(`[Anticeil Chat Piece] Success response from ${url}:`, response.status, response.body);
        return response.body || response;
      } catch (err: any) {
        console.warn(`[Anticeil Chat Piece] Attempt to ${url} failed:`, err?.message || err);
        lastError = err;
      }
    }

    console.error('[Anticeil Chat Piece] All candidate delivery attempts failed. Last error:', lastError?.message || lastError);
    throw lastError || new Error('Gagal mengirim webhook pesan ke Anticeil Chat');
  },
});
