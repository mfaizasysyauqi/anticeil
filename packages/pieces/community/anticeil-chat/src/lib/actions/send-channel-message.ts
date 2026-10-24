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
      description: 'Salin Webhook URL dari Pengaturan Saluran Anticeil Chat (contoh: https://anticeil.com/api/v1/community/webhook?channelId=ch-...)',
      required: false,
      placeholder: 'https://anticeil.com/api/v1/community/webhook?channelId=ch-...',
    }),
    channel: Property.ShortText({
      displayName: 'Channel ID / Nama Saluran (Opsional)',
      description: 'Opsional jika Webhook URL sudah diisi. ID Saluran atau nama saluran jika ingin meng-override URL.',
      required: false,
    }),
    hubId: Property.ShortText({
      displayName: 'ID Server / Hub ID (Opsional)',
      description: 'Opsional jika Webhook URL sudah diisi. ID Server Anticeil Chat.',
      required: false,
      advanced: true,
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
    let channel = context.propsValue.channel?.trim();
    let hubId = context.propsValue.hubId?.trim();
    const content = context.propsValue.content;
    const botName = context.propsValue.botName || 'Anticeil Bot';
    const botAvatar = context.propsValue.botAvatar || undefined;

    // Auto-extract channelId and hubId from Webhook URL query parameters if not explicitly provided
    if (rawWebhook) {
      try {
        const parsed = new URL(rawWebhook);
        const urlChannel = parsed.searchParams.get('channelId') || parsed.searchParams.get('channel');
        const urlHubId = parsed.searchParams.get('hubId');
        if (!channel && urlChannel) {
          channel = urlChannel;
        }
        if (!hubId && urlHubId) {
          hubId = urlHubId;
        }
      } catch (e) {}
    }

    channel = channel || 'general';
    hubId = hubId || 'anticeil';

    let targetUrl: string;

    if (rawWebhook && (rawWebhook.startsWith('http://') || rawWebhook.startsWith('https://'))) {
      targetUrl = rawWebhook;
    } else {
      const baseUrl =
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

    // Candidate URLs: if inside Docker network on Oracle VM, prioritize direct local app container address
    const candidates: string[] = [];
    if (targetUrl.includes('anticeil.com')) {
      const parsedPath = targetUrl.replace(/https?:\/\/[^\/]+/, '');
      candidates.push(`http://app:80${parsedPath}`);
      candidates.push(`http://activepieces-app:80${parsedPath}`);
      candidates.push(`http://127.0.0.1:8080${parsedPath}`);
    }
    candidates.push(targetUrl);

    let lastError: any = null;
    for (const url of candidates) {
      try {
        const response = await httpClient.sendRequest<{ success: boolean; message?: any }>({
          method: HttpMethod.POST,
          url,
          body: payload,
          timeout: 4000,
        });
        return response.body || response;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Gagal mengirim webhook pesan');
  },
});
