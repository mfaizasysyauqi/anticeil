import { createAction, Property } from '@activepieces/pieces-framework';
import {
  HttpRequest,
  HttpMethod,
  httpClient,
} from '@activepieces/pieces-common';

export const sendChannelMessage = createAction({
  name: 'send_channel_message',
  displayName: 'Kirim Pesan ke Channel',
  description: 'Kirim pesan bot otomatis dengan format Markdown ke saluran obrolan Anticeil Chat.',
  requireAuth: false,
  props: {
    channel: Property.ShortText({
      displayName: 'Channel',
      description: 'Nama channel (contoh: general, alerts, dev) atau ID channel. Jika belum ada, channel akan dibuat otomatis.',
      required: true,
      defaultValue: 'general',
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
    webhookUrl: Property.ShortText({
      displayName: 'Custom Webhook URL',
      description: 'Opsional: Tentukan URL endpoint jika workflow berjalan di luar instance lokal. Default: http://127.0.0.1:3000/api/v1/community/webhook',
      required: false,
      advanced: true,
    }),
  },
  async run(context) {
    const channel = context.propsValue.channel || 'general';
    const content = context.propsValue.content;
    const botName = context.propsValue.botName || 'Anticeil Bot';
    const botAvatar = context.propsValue.botAvatar || undefined;

    const baseUrl =
      context.propsValue.webhookUrl ||
      process.env['AP_FRONTEND_URL'] ||
      process.env['FRONTEND_URL'] ||
      'http://127.0.0.1:3000';

    const targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/community/webhook`;

    const request: HttpRequest<{
      channel: string;
      content: string;
      botName: string;
      botAvatar?: string;
    }> = {
      method: HttpMethod.POST,
      url: targetUrl,
      body: {
        channel,
        content,
        botName,
        botAvatar,
      },
    };

    return await httpClient.sendRequest(request);
  },
});
