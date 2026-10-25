export type CommunityRole =
  | 'owner'
  | 'admin'
  | 'moderator'
  | 'member'
  | 'bot'
  | 'platform_admin'
  | 'platform_operator'
  | 'project_admin'
  | 'project_editor'
  | 'project_viewer'
  | 'creator'
  | 'pro';

export type {
  CommunityHubId,
  CommunityCustomEmoji,
  CommunityHub,
} from '@/lib/community-hubs';

export type CommunityChannel = {
  id: string;
  name: string;
  description: string;
  category: 'CHANNELS' | 'DIRECT MESSAGES';
  hubId?: string;
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
  username?: string | null;
  avatar?: string | null;
  role: CommunityRole;
  roleLabel?: string;
  platformRole?: string;
  projectRole?: string | null;
  status: 'online' | 'idle' | 'offline';
  customStatus?: string;
};

export type CommunityAuditEntry = {
  id: string;
  hubId: string;
  action: string;
  actorName: string;
  targetName?: string;
  details?: Record<string, any> | string;
  createdAt: string;
};

export type CommunityInvite = {
  id: string;
  hubId: string;
  code: string;
  inviterName?: string;
  uses: number;
  maxUses?: number;
  expiresAt?: string | null;
  createdAt: string;
};

export type CommunityBan = {
  id: string;
  hubId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  reason: string;
  bannedByName?: string;
  createdAt: string;
};

export type CommunityCustomRole = {
  id: string;
  hubId: string;
  name: string;
  color: string;
  permissions: string[];
  memberCount?: number;
  position?: number;
};

export type CommunityHubStats = {
  totalMessages: number;
  totalChannels: number;
  totalMembers: number;
  totalBots: number;
  botMessages: number;
  channelActivity: Array<{ channelId: string; channelName: string; messageCount: number }>;
};
