import { createPiece, PieceCategory } from '@activepieces/pieces-framework';
import { sendChannelMessage } from './lib/actions/send-channel-message';

export const anticeilChat = createPiece({
  displayName: 'Anticeil Chat',
  description: 'Kirim pesan, notifikasi, dan peringatan otomatis langsung ke saluran Anticeil Chat / Messages.',
  minimumSupportedRelease: '0.88.2',
  logoUrl: 'https://cdn.activepieces.com/pieces/discord.png',
  categories: [PieceCategory.COMMUNICATION],
  auth: undefined,
  actions: [
    sendChannelMessage,
  ],
  authors: ['Anticeil Team'],
  triggers: [],
});

export default anticeilChat;
