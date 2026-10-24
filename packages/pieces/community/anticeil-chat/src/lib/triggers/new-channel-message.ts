import { createTrigger, Property, TriggerStrategy } from '@activepieces/pieces-framework';

export const newChannelMessage = createTrigger({
  name: 'new_channel_message',
  displayName: 'Pesan Baru di Saluran',
  description: 'Memicu alur kerja ketika pesan baru dikirim atau diterima di saluran Anticeil Chat.',
  props: {
    channel: Property.ShortText({
      displayName: 'Filter Saluran / Channel (Opsional)',
      description: 'Nama atau ID saluran (contoh: halo atau ch-mvmmfi3o-halo). Kosongkan untuk menerima pesan dari semua saluran.',
      required: false,
    }),
    hubId: Property.ShortText({
      displayName: 'Filter ID Server / Hub ID (Opsional)',
      description: 'ID Server Anticeil Chat tempat saluran berada. Kosongkan untuk menerima dari semua server.',
      required: false,
    }),
  },
  type: TriggerStrategy.WEBHOOK,
  sampleData: {
    id: 'msg-example-1',
    content: 'Halo dari Anticeil Chat!',
    channel: 'general',
    channelId: 'general',
    hubId: 'anticeil',
    author: {
      id: 'usr-1',
      name: 'Faiz',
    },
    created_at: '2026-10-24T15:00:00.000Z',
  },
  async onEnable() {},
  async onDisable() {},
  async run(context) {
    const payload = context.payload.body as any;
    const filterChannel = context.propsValue.channel?.trim();
    const filterHubId = context.propsValue.hubId?.trim();
    if (
      filterChannel &&
      payload?.channel &&
      payload.channel !== filterChannel &&
      payload?.channelId !== filterChannel
    ) {
      return [];
    }
    if (
      filterHubId &&
      payload?.hubId &&
      payload.hubId !== filterHubId
    ) {
      return [];
    }
    return [payload];
  },
});
