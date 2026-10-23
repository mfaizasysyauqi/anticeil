export type CommunityRole = 'admin' | 'creator' | 'pro' | 'member';

export type CommunityChannel = {
  id: string;
  name: string;
  description: string;
  category: 'CHANNELS' | 'DIRECT MESSAGES';
  isDirectMessage?: boolean;
  dmUserId?: string;
  unreadCount?: number;
};

export type CommunityAttachment = {
  type: 'image' | 'file' | 'template';
  url: string;
  name: string;
  size?: string;
  templateData?: {
    name: string;
    description: string;
    pieceCount: number;
    price?: string;
    flowJson?: string;
  };
};

export type CommunityMessage = {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatar?: string | null;
  senderRole: CommunityRole;
  content: string;
  createdAt: string;
  attachments?: CommunityAttachment[];
  reactions?: Record<string, string[]>; // emoji: [userId, ...]
};

export type CommunityMember = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: CommunityRole;
  status: 'online' | 'idle' | 'offline';
  customStatus?: string;
};
