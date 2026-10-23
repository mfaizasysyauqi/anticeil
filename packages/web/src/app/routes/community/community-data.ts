import { CommunityChannel, CommunityMember, CommunityMessage } from './community-types';

export const DEFAULT_CHANNELS: CommunityChannel[] = [
  {
    id: 'umum',
    name: 'umum',
    description: 'Ruang obrolan umum seputar otomatisasi, AI builder, dan inovasi platform Anticeil.',
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
    id: 'tanya-jawab',
    name: 'tanya-jawab',
    description: 'Tanya jawab seputar webhook, API keys, error workflow, dan integrasi 770+ pieces.',
    category: 'CHANNELS',
  },
];

export const DEFAULT_MEMBERS: CommunityMember[] = [
  {
    id: 'user-admin-1',
    name: 'Faiz Asy-Syauqi',
    email: 'faiz@anticeil.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    status: 'online',
    customStatus: 'Founder @ Anticeil Cloud 🚀',
  },
  {
    id: 'user-creator-1',
    name: 'Budi Pratama',
    email: 'budi.automates@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'creator',
    status: 'online',
    customStatus: 'Building WhatsApp CRM Template ✨',
  },
  {
    id: 'user-pro-1',
    name: 'Devi Amanda',
    email: 'devi.tech@perusahaan.co.id',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'pro',
    status: 'online',
    customStatus: 'Automating Growth & Lead Gen 📈',
  },
  {
    id: 'user-member-1',
    name: 'Rizky Fauzi',
    email: 'rizky.fauzi@outlook.com',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    role: 'member',
    status: 'idle',
    customStatus: 'Eksplorasi AI Agents & MCP 🤖',
  },
  {
    id: 'user-member-2',
    name: 'Siti Rahmawati',
    email: 'siti.rahma@startup.id',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    role: 'member',
    status: 'offline',
    customStatus: 'Product Manager @ FinTech',
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
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      senderRole: 'admin',
      content: 'Selamat datang di **Komunitas Resmi Anticeil**! 🎉\nDi sini rekan-rekan builder bisa berdiskusi seputar pembuatan workflow, saling tukar template alur kerja, hingga transaksi template otomatisasi siap pakai.',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      reactions: { '🎉': ['user-creator-1', 'user-pro-1'], '🔥': ['user-member-1'] },
    },
    {
      id: 'msg-u2',
      channelId: 'umum',
      senderId: 'user-creator-1',
      senderName: 'Budi Pratama',
      senderEmail: 'budi.automates@gmail.com',
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      senderRole: 'creator',
      content: 'Halo rekan-rekan! Keren banget sekarang builder Anticeil kolaborasi real-time nya makin kenceng tanpa delay. Multi-cursor realtime-nya mulus banget! 👏',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      reactions: { '❤️': ['user-admin-1'] },
    },
    {
      id: 'msg-u3',
      channelId: 'umum',
      senderId: 'user-pro-1',
      senderName: 'Devi Amanda',
      senderEmail: 'devi.tech@perusahaan.co.id',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      senderRole: 'pro',
      content: 'Iya bener! Kemarin tim kami coba live pair-editing di canvas yang sama, rasanya kayak pake Figma tapi langsung jalan jadi backend workflow beneran.',
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
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
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
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
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
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      senderRole: 'pro',
      content: 'Wah menarik mas Budi, aku barusan kirim pesan DM ya buat tanya kompatibilitas dengan webhook custom kami!',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ],
  'tanya-jawab': [
    {
      id: 'msg-t1',
      channelId: 'tanya-jawab',
      senderId: 'user-member-1',
      senderName: 'Rizky Fauzi',
      senderEmail: 'rizky.fauzi@outlook.com',
      senderAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      senderRole: 'member',
      content: 'Tanya dong mastah, kalau mau trigger alur saat ada file baru di Google Drive tapi cuma file `.pdf`, filternya lebih bagus ditaruh di trigger atau pakai step branch condition?',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'msg-t2',
      channelId: 'tanya-jawab',
      senderId: 'user-admin-1',
      senderName: 'Faiz Asy-Syauqi',
      senderEmail: 'faiz@anticeil.com',
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      senderRole: 'admin',
      content: 'Halo @Rizky! Paling efisien pakai step **Branch (Filter)** langsung setelah trigger, cek kondisi `{{ step_1.mimeType }} contains application/pdf`. Jadi alur file selain PDF langsung berhenti tanpa buang kuota eksekusi.',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      reactions: { '💡': ['user-member-1'], '👍': ['user-creator-1'] },
    },
  ],
};

const STORAGE_KEY_MESSAGES = 'anticeil_community_messages_v2';
const STORAGE_KEY_CHANNELS = 'anticeil_community_channels_v2';

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
