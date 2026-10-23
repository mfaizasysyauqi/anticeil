import { CommunityChannel, CommunityMember, CommunityMessage } from './community-types';

export const DEFAULT_CHANNELS: CommunityChannel[] = [
  {
    id: 'umum',
    name: 'umum-general',
    description: 'Ruang obrolan umum seputar otomatisasi, AI, dan inovasi platform Anticeil.',
    category: 'CHANNELS',
  },
  {
    id: 'showcase-template',
    name: 'showcase-template',
    description: 'Pamerkan alur otomatisasi buatanmu, dapatkan feedback, dan bagikan template gratis.',
    category: 'CHANNELS',
  },
  {
    id: 'jual-beli-template',
    name: 'jual-beli-template',
    description: 'Marketplace komunitas: jual atau beli workflow premium dan request otomasi custom.',
    category: 'CHANNELS',
  },
  {
    id: 'tanya-jawab-support',
    name: 'tanya-jawab-support',
    description: 'Tanya jawab seputar webhook, API keys, error workflow, dan integrasi pieces.',
    category: 'CHANNELS',
  },
];

export const DEFAULT_MEMBERS: CommunityMember[] = [
  {
    id: 'user-admin-1',
    name: 'Faiz Asy-Syauqi',
    email: 'faiz@anticeil.com',
    role: 'admin',
    status: 'online',
    customStatus: 'Building Anticeil Cloud 🚀',
  },
  {
    id: 'user-creator-1',
    name: 'Budi Pratama',
    email: 'budi.automates@gmail.com',
    role: 'creator',
    status: 'online',
    customStatus: 'Bikin template WhatsApp CRM',
  },
  {
    id: 'user-pro-1',
    name: 'Devi Amanda',
    email: 'devi.tech@perusahaan.co.id',
    role: 'pro',
    status: 'online',
    customStatus: 'Automating Lead Gen',
  },
  {
    id: 'user-member-1',
    name: 'Rizky Fauzi',
    email: 'rizky.fauzi@outlook.com',
    role: 'member',
    status: 'idle',
    customStatus: 'Exploring AI Agents',
  },
  {
    id: 'user-member-2',
    name: 'Siti Rahmawati',
    email: 'siti.rahma@startup.id',
    role: 'member',
    status: 'offline',
  },
];

export const INITIAL_MESSAGES: Record<string, CommunityMessage[]> = {
  umum: [
    {
      id: 'msg-u1',
      channelId: 'umum',
      senderId: 'user-admin-1',
      senderName: 'Faiz Asy-Syauqi',
      senderEmail: 'faiz@anticeil.com',
      senderRole: 'admin',
      content: 'Selamat datang di **Komunitas Resmi Anticeil**! 🎉\nDi sini rekan-rekan bisa diskusi seputar workflow, bertukar template alur kerja, hingga transaksi template otomatisasi.',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      reactions: { '🎉': ['user-creator-1', 'user-pro-1'], '🔥': ['user-member-1'] },
    },
    {
      id: 'msg-u2',
      channelId: 'umum',
      senderId: 'user-creator-1',
      senderName: 'Budi Pratama',
      senderEmail: 'budi.automates@gmail.com',
      senderRole: 'creator',
      content: 'Halo semua! Keren banget sekarang builder Anticeil kolaborasi real-time nya makin kenceng tanpa delay. Cursors realtime-nya mulus banget! 👏',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      reactions: { '❤️': ['user-admin-1'] },
    },
    {
      id: 'msg-u3',
      channelId: 'umum',
      senderId: 'user-pro-1',
      senderName: 'Devi Amanda',
      senderEmail: 'devi.tech@perusahaan.co.id',
      senderRole: 'pro',
      content: 'Iya bener! Kemarin tim marketing kami coba live pair-editing di canvas yang sama, berasa pake Figma buat otomatisasi.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      reactions: { '🚀': ['user-creator-1'] },
    },
  ],
  'showcase-template': [
    {
      id: 'msg-s1',
      channelId: 'showcase-template',
      senderId: 'user-creator-1',
      senderName: 'Budi Pratama',
      senderEmail: 'budi.automates@gmail.com',
      senderRole: 'creator',
      content: 'Izin share template alur baru teman-teman! Alur ini otomatis membaca leads dari Google Sheets, validasi nomor WA, lalu kirim follow-up via AI Agent secara otomatis.',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      attachments: [
        {
          type: 'template',
          url: '/templates',
          name: 'AI Lead Qualification & WhatsApp Follow-Up',
          templateData: {
            name: 'AI Lead Qualification & WhatsApp Follow-Up',
            description: 'Trigger Google Sheets -> AI Agent filtering -> WhatsApp Notification otomatis dalam 5 detik.',
            pieceCount: 4,
            price: 'Free',
          },
        },
      ],
      reactions: { '🔥': ['user-admin-1', 'user-pro-1', 'user-member-1'] },
    },
  ],
  'jual-beli-template': [
    {
      id: 'msg-j1',
      channelId: 'jual-beli-template',
      senderId: 'user-creator-1',
      senderName: 'Budi Pratama',
      senderEmail: 'budi.automates@gmail.com',
      senderRole: 'creator',
      content: 'Ready stock template enterprise: **"Automated Accounting & Invoice OCR Sync to Midtrans + Accurate"**.\nCocok buat UMKM / agensi yang butuh otomatisasi finance invoice. Minat bisa langsung DM atau reply di sini ya!',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      attachments: [
        {
          type: 'template',
          url: '/templates',
          name: 'Automated Accounting & Invoice OCR Sync',
          templateData: {
            name: 'Enterprise Invoice OCR & Midtrans Sync',
            description: 'Otomatis ekstrak PDF tagihan dan rekonsiliasi status pembayaran Midtrans.',
            pieceCount: 6,
            price: 'Rp 299.000',
          },
        },
      ],
      reactions: { '💰': ['user-pro-1'], '👀': ['user-member-2'] },
    },
    {
      id: 'msg-j2',
      channelId: 'jual-beli-template',
      senderId: 'user-pro-1',
      senderName: 'Devi Amanda',
      senderEmail: 'devi.tech@perusahaan.co.id',
      senderRole: 'pro',
      content: 'Wah menarik mas Budi, aku barusan kirim pesan DM ya buat tanya kompatibilitas dengan webhook custom kami!',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ],
  'tanya-jawab-support': [
    {
      id: 'msg-t1',
      channelId: 'tanya-jawab-support',
      senderId: 'user-member-1',
      senderName: 'Rizky Fauzi',
      senderEmail: 'rizky.fauzi@outlook.com',
      senderRole: 'member',
      content: 'Tanya dong mastah, kalau mau trigger alur saat ada file baru di Google Drive tapi cuma file `.pdf`, filternya lebih bagus ditaruh di trigger atau pakai step branch condition?',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'msg-t2',
      channelId: 'tanya-jawab-support',
      senderId: 'user-admin-1',
      senderName: 'Faiz Asy-Syauqi',
      senderEmail: 'faiz@anticeil.com',
      senderRole: 'admin',
      content: 'Halo @Rizky! Paling efisien pakai step **Branch (Filter)** langsung setelah trigger, cek kondisi `{{ step_1.mimeType }} contains application/pdf`. Jadi alur file selain PDF langsung berhenti tanpa buang kuota eksekusi.',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      reactions: { '💡': ['user-member-1'], '👍': ['user-creator-1'] },
    },
  ],
};

const STORAGE_KEY_MESSAGES = 'anticeil_community_messages_v1';
const STORAGE_KEY_CHANNELS = 'anticeil_community_channels_v1';

export function loadStoredMessages(): Record<string, CommunityMessage[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!raw) return INITIAL_MESSAGES;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_MESSAGES, ...parsed };
  } catch {
    return INITIAL_MESSAGES;
  }
}

export function saveStoredMessages(messages: Record<string, CommunityMessage[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  } catch (err) {
    console.error('Failed to save community messages to storage', err);
  }
}

export function loadStoredChannels(): CommunityChannel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHANNELS);
    if (!raw) return DEFAULT_CHANNELS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CHANNELS;
  }
}

export function saveStoredChannels(channels: CommunityChannel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHANNELS, JSON.stringify(channels));
  } catch (err) {
    console.error('Failed to save community channels', err);
  }
}
