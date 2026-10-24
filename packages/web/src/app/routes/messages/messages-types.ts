export type CommunityRole =
  | 'platform_admin'
  | 'platform_operator'
  | 'project_admin'
  | 'project_editor'
  | 'project_viewer'
  | 'member'
  | 'admin'
  | 'creator'
  | 'pro';

export type CommunityHubId = 'anticeil' | 'direct-messages' | string;

export type CommunityHub = {
  id: CommunityHubId;
  name: string;
  iconType: 'logo' | 'spark' | 'bot' | 'templates' | 'code' | 'dm';
  initials: string;
  description?: string;
  unreadCount?: number;
  inviteCode?: string;
  membersCount?: number;
  color?: string;
  role?: 'owner' | 'admin' | 'member';
};

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
