import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Hash,
  MessageSquare,
  Users,
  Search,
  Plus,
  Send,
  Sparkles,
  Layers,
  ChevronDown,
  ExternalLink,
  Shield,
  Crown,
  Paperclip,
  X,
  Trash2,
  Edit2,
  Compass,
  Bot,
  Terminal,
  Settings,
  Mic,
  MicOff,
  Headphones,
  Smile,
  Check,
  Share2,
  UserPlus,
  Copy,
  AlertCircle,
  Clock,
  AtSign,
  UserCheck,
  UserX,
  Inbox,
  Webhook,
  Bell,
  Lock,
  KeyRound,
  Zap,
  ChevronRight,
  Globe,
  BarChart3,
  ScrollText,
  Ban,
  Tag,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Activity,
  Award,
  Flame,
  ShieldAlert,
  Video,
  PhoneCall,
  PhoneOff,
  Radio,
  Signal,
  Rocket,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useSocket } from '@/components/providers/socket-provider';
import { CommunityCallStage } from './community-call-stage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LockedFeatureGuard } from '@/app/components/locked-feature-guard';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks, userMutations } from '@/hooks/user-hooks';
import { queryClient } from '@/app/query-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { authenticationSession } from '@/lib/authentication-session';
import { PlatformRole } from '@activepieces/shared';

import { messagesApi, communityApi } from './messages-api';
import { CommunityAvatar } from './messages-avatar';
import {
  DEFAULT_CHANNELS,
  DEFAULT_HUBS,
  loadStoredHubs,
  saveStoredHubs,
} from './messages-data';
import {
  CommunityAttachment,
  CommunityChannel,
  CommunityHub,
  CommunityHubId,
  CommunityMember,
  CommunityMessage,
  CommunityRole,
  CommunityAuditEntry,
  CommunityInvite,
  CommunityBan,
  CommunityCustomRole,
  CommunityHubStats,
  CommunityCustomEmoji,
} from './messages-types';

// Preset realistic templates for sharing
const SHAREABLE_TEMPLATES = [
  {
    name: 'AI Lead Qualification & WhatsApp Follow-Up',
    description: 'Trigger Google Sheets -> AI Agent filtering -> WhatsApp Notification otomatis dalam 5 detik.',
    pieceCount: 4,
    price: 'Free',
    tags: ['Google Sheets', 'WhatsApp', 'OpenAI'],
  },
  {
    name: 'Enterprise Invoice OCR & Midtrans Sync',
    description: 'Otomatis ekstrak PDF tagihan via OCR dan rekonsiliasi status pembayaran Midtrans ke ERP.',
    pieceCount: 6,
    price: 'Free',
    tags: ['OCR', 'Midtrans', 'Gmail'],
  },
  {
    name: 'Social Media Multi-Platform Auto Publisher',
    description: 'Satu draft content otomatis publish serentak ke Instagram, Telegram Channel, dan LinkedIn.',
    pieceCount: 5,
    price: 'Free',
    tags: ['Groq AI', 'Telegram', 'Twitter'],
  },
];

// Rich message parser (supports **bold**, `code`, @mentions, and links)
function renderFormattedMessage(content: string) {
  if (!content) return null;
  const lines = content.split('\n');

  return lines.map((line, lineIdx) => {
    const tokens: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`|@[\w\.-]+|https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(line.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        tokens.push(
          <strong key={`${lineIdx}-${match.index}`} className="font-semibold text-foreground">
            {token.slice(2, -2)}
          </strong>,
        );
      } else if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
        tokens.push(
          <code
            key={`${lineIdx}-${match.index}`}
            className="px-1.5 py-0.5 rounded bg-muted/80 font-mono text-[11px] text-primary border border-border/40 inline-block align-baseline"
          >
            {token.slice(1, -1)}
          </code>,
        );
      } else if (token.startsWith('@')) {
        tokens.push(
          <span
            key={`${lineIdx}-${match.index}`}
            className="px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary font-medium hover:underline cursor-pointer inline-block"
          >
            {token}
          </span>,
        );
      } else if (token.startsWith('http')) {
        tokens.push(
          <a
            key={`${lineIdx}-${match.index}`}
            href={token}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {token}
          </a>,
        );
      } else {
        tokens.push(token);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push(line.substring(lastIndex));
    }

    return (
      <React.Fragment key={lineIdx}>
        {tokens}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export function CommunityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: currentUser } = userHooks.useCurrentUser();
  const { platform } = platformHooks.useCurrentPlatform();
  const socket = useSocket();

  const planName = (platform?.plan?.plan || 'free').toLowerCase();
  const isTeamOrEnterprise = planName.includes('team') || planName.includes('enterprise');
  const isPlusOrAbove = planName.includes('plus') || isTeamOrEnterprise;

  // Discord Voice & Video Call State (Anticeil Call & Activity)
  const [activeCallChannelId, setActiveCallChannelId] = useState<string | null>(null);
  const [isCallPiP, setIsCallPiP] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activeCallCounts, setActiveCallCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!socket) return;
    const handleCallState = (data: { channelId: string; active: boolean; participantCount: number }) => {
      if (data?.channelId) {
        setActiveCallCounts((prev) => ({
          ...prev,
          [data.channelId]: data.active ? data.participantCount : 0,
        }));
      }
    };
    socket.on('COMMUNITY_CALL_STATE', handleCallState);
    return () => {
      socket.off('COMMUNITY_CALL_STATE', handleCallState);
    };
  }, [socket]);

  // Discord Hubs & Channels state
  const [hubs, setHubs] = useState<CommunityHub[]>(() => loadStoredHubs());
  const [activeHubId, setActiveHubId] = useState<CommunityHubId>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('hub');
    return fromUrl || 'anticeil';
  });

  // Server / Hub Creation & Join Modal state (ala Discord "Tambah Server")
  const [isCreateHubOpen, setIsCreateHubOpen] = useState(false);
  const [newHubName, setNewHubName] = useState('');
  const [newHubDesc, setNewHubDesc] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [isJoiningHub, setIsJoiningHub] = useState(false);

  // Server Edit & Delete state
  const [hubToEdit, setHubToEdit] = useState<CommunityHub | null>(null);
  const [editHubName, setEditHubName] = useState('');
  const [editHubDesc, setEditHubDesc] = useState('');
  const [hubToDelete, setHubToDelete] = useState<CommunityHub | null>(null);

  const [channels, setChannels] = useState<CommunityChannel[]>(DEFAULT_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messagesMap, setMessagesMap] = useState<Record<string, CommunityMessage[]>>({});
  const [members, setMembers] = useState<CommunityMember[]>([]);

  const activeHub = useMemo(() => {
    return hubs.find((h) => h.id === activeHubId) || hubs[0];
  }, [hubs, activeHubId]);

  // Listen to switch_hub and open_create_hub events from the Unified Mini Rail
  useEffect(() => {
    const handleSwitchHub = (e: any) => {
      const hubId = e.detail;
      if (hubId) {
        setActiveHubId(hubId);
        if (hubId === 'anticeil') {
          setActiveChannelId('');
        } else {
          const firstCh = channels.find(
            (c) => (c.hubId || 'anticeil') === hubId && c.category === 'CHANNELS',
          );
          if (firstCh) setActiveChannelId(firstCh.id);
        }
      }
    };
    const handleOpenCreateHub = () => {
      setIsCreateHubOpen(true);
    };
    window.addEventListener('anticeil_switch_hub', handleSwitchHub as EventListener);
    window.addEventListener('anticeil_open_create_hub', handleOpenCreateHub);
    return () => {
      window.removeEventListener('anticeil_switch_hub', handleSwitchHub as EventListener);
      window.removeEventListener('anticeil_open_create_hub', handleOpenCreateHub);
    };
  }, [channels]);

  // Broadcast activeHubId to Unified Mini Rail
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('anticeil_active_hub_changed', { detail: activeHubId }));
  }, [activeHubId]);

  const [inputText, setInputText] = useState('');
  const [stagedAttachment, setStagedAttachment] = useState<CommunityAttachment | null>(null);
  const [showMemberList, setShowMemberList] = useState(false);

  // Friends panel state (Discord-style, shown when isHome)
  type FriendsTab = 'online' | 'all' | 'pending' | 'add';
  const [friendsTab, setFriendsTab] = useState<FriendsTab>('online');
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  type FriendRequest = {
    id: string;
    name: string;
    username: string | null;
    avatar: string | null;
    direction: 'incoming' | 'outgoing';
    status: 'pending';
  };
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState(false);

  // Audio / mic dummy state for Discord user footer
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Channel CRUD Modals
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState<'CHANNELS' | 'DIRECT MESSAGES'>('CHANNELS');

  const [channelToEdit, setChannelToEdit] = useState<CommunityChannel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelDesc, setEditChannelDesc] = useState('');

  const [channelToDelete, setChannelToDelete] = useState<CommunityChannel | null>(null);

  // Responsive state for Mobile/Tablet sheets
  const [isMobileChannelsOpen, setIsMobileChannelsOpen] = useState(false);
  const [isMobileMembersOpen, setIsMobileMembersOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [isInvitingUsername, setIsInvitingUsername] = useState(false);
  const [userNotFound, setUserNotFound] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit Profile dialog state (Display Name & Username with 14-day cooldown)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editDisplayNameInput, setEditDisplayNameInput] = useState('');
  const [editUsernameInput, setEditUsernameInput] = useState('');

  // DM Search Dialog (Discord-style "Find or start a conversation")
  const [isDmSearchOpen, setIsDmSearchOpen] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  // Webhook Integration Dialog (Discord-style incoming webhooks & IDs)
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState<boolean>(false);
  const [isCopiedWebhook, setIsCopiedWebhook] = useState<boolean>(false);
  const [isCopiedChannelId, setIsCopiedChannelId] = useState<boolean>(false);
  const [isCopiedHubId, setIsCopiedHubId] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);

  // Server Settings full-page modal (Discord-style)
  type ServerSettingsSection =
    | 'profile'
    | 'server-tag'
    | 'engagement'
    | 'boost'
    | 'emoji'
    | 'members'
    | 'roles'
    | 'invites'
    | 'integrations'
    | 'audit-log'
    | 'bans'
    | 'delete';
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [serverSettingsSection, setServerSettingsSection] = useState<ServerSettingsSection>('profile');
  const [serverSettingsEditName, setServerSettingsEditName] = useState('');
  const [serverSettingsEditDesc, setServerSettingsEditDesc] = useState('');
  const [serverSettingsEditColor, setServerSettingsEditColor] = useState('bg-indigo-600');
  const [serverSettingsEditIconUrl, setServerSettingsEditIconUrl] = useState('');
  const [serverTags, setServerTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [serverEmojis, setServerEmojis] = useState<CommunityCustomEmoji[]>([]);
  const [newEmojiName, setNewEmojiName] = useState('');
  const [newEmojiChar, setNewEmojiChar] = useState('');
  const [serverStats, setServerStats] = useState<CommunityHubStats | null>(null);
  const [serverInvites, setServerInvites] = useState<CommunityInvite[]>([]);
  const [newInviteMaxUses, setNewInviteMaxUses] = useState(0);
  const [newInviteExpiry, setNewInviteExpiry] = useState<'never' | '1d' | '7d' | '30d'>('7d');
  const [serverBans, setServerBans] = useState<CommunityBan[]>([]);
  const [serverRoles, setServerRoles] = useState<CommunityCustomRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');
  const [serverAuditLogs, setServerAuditLogs] = useState<CommunityAuditEntry[]>([]);
  const [auditLogFilter, setAuditLogFilter] = useState<string>('ALL');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isBoostingServer, setIsBoostingServer] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isBanningUser, setIsBanningUser] = useState(false);
  const [banTargetMember, setBanTargetMember] = useState<CommunityMember | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');

  // Load Server Settings dynamic sub-data whenever modal opens
  useEffect(() => {
    if (!isServerSettingsOpen || !activeHub) return;
    setServerSettingsEditName(activeHub.name || '');
    setServerSettingsEditDesc(activeHub.description || '');
    setServerSettingsEditColor(activeHub.color || 'bg-indigo-600');
    setServerSettingsEditIconUrl(activeHub.iconUrl || '');
    setServerTags(activeHub.tags || ['komunitas', 'anticeil']);
    setServerEmojis(
      activeHub.emojis || [
        { id: '1', name: 'rocket', char: '🚀' },
        { id: '2', name: 'fire', char: '🔥' },
        { id: '3', name: 'robot', char: '🤖' },
      ],
    );

    const loadServerSettingsData = async () => {
      try {
        const [rolesRes, invitesRes, bansRes, auditRes, statsRes] = await Promise.all([
          communityApi.getRoles(activeHub.id),
          communityApi.getInvites(activeHub.id),
          communityApi.getBans(activeHub.id),
          communityApi.getAuditLog(activeHub.id),
          communityApi.getHubStats(activeHub.id),
        ]);
        setServerRoles(rolesRes || []);
        setServerInvites(invitesRes || []);
        setServerBans(bansRes || []);
        setServerAuditLogs(auditRes || []);
        setServerStats(statsRes || null);
      } catch (err) {
        console.error('Failed to load server settings data', err);
      }
    };
    loadServerSettingsData();
  }, [isServerSettingsOpen, activeHub?.id]);

  // Listen to burger menu clicks from top app bar on mobile/tablet
  useEffect(() => {
    const handleToggleMobileChannels = () => {
      setIsMobileChannelsOpen((prev) => !prev);
    };
    window.addEventListener('anticeil_toggle_mobile_channels', handleToggleMobileChannels);
    return () => {
      window.removeEventListener('anticeil_toggle_mobile_channels', handleToggleMobileChannels);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load from Backend API
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const currentProjectId = authenticationSession.getProjectId();
        const [channelsRes, membersRes, hubsRes] = await Promise.all([
          communityApi.getChannels(),
          communityApi.getMembers(currentProjectId || undefined),
          communityApi.getHubs(),
        ]);
        if (mounted) {
          if (Array.isArray(channelsRes)) {
            setChannels(channelsRes);
            if (channelsRes.length > 0 && activeHubId !== 'anticeil') {
              setActiveChannelId((curr) => curr || channelsRes[0].id);
            }
          }
          if (Array.isArray(membersRes)) {
            setMembers(membersRes);
          }
          if (Array.isArray(hubsRes) && hubsRes.length > 0) {
            setHubs((prev) => {
              const home = prev.find((h) => h.id === 'anticeil') || DEFAULT_HUBS[0];
              const merged = [home, ...hubsRes.filter((s) => s.id !== 'anticeil')];
              saveStoredHubs(merged);
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Initial community load fallback', err);
      }
    };
    loadData();

    // Check if user came from an invite link: /messages?invite=xyz
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    if (inviteParam) {
      handleJoinHub(inviteParam);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load Messages when Active Channel Changes
  useEffect(() => {
    if (!activeChannelId) return;
    let mounted = true;
    const loadChannelMessages = async () => {
      try {
        const msgs = await communityApi.getMessages(activeChannelId);
        if (mounted && msgs) {
          setMessagesMap((prev) => ({
            ...prev,
            [activeChannelId]: msgs,
          }));
        }
      } catch (err) {
        console.warn('Failed to load messages for channel', activeChannelId, err);
      }
    };
    loadChannelMessages();
    return () => {
      mounted = false;
    };
  }, [activeChannelId]);

  // 3. WebSocket Realtime Listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (newMsg: CommunityMessage) => {
      setMessagesMap((prev) => {
        const list = prev[newMsg.channelId] || [];
        if (list.some((m) => m.id === newMsg.id)) return prev;
        return {
          ...prev,
          [newMsg.channelId]: [...list, newMsg],
        };
      });
    };

    const handleMessageDeleted = ({ id, channelId }: { id: string; channelId?: string }) => {
      setMessagesMap((prev) => {
        const ch = channelId || activeChannelId;
        const list = prev[ch] || [];
        return {
          ...prev,
          [ch]: list.filter((m) => m.id !== id),
        };
      });
    };

    const handleReactionUpdated = ({
      id,
      channelId,
      reactions,
    }: {
      id: string;
      channelId?: string;
      reactions: Record<string, string[]>;
    }) => {
      setMessagesMap((prev) => {
        const ch = channelId || activeChannelId;
        const list = prev[ch] || [];
        return {
          ...prev,
          [ch]: list.map((m) => (m.id === id ? { ...m, reactions } : m)),
        };
      });
    };

    const handleChannelCreated = (newCh: CommunityChannel) => {
      setChannels((prev) => {
        if (prev.some((c) => c.id === newCh.id)) return prev;
        return [...prev, newCh];
      });
    };

    const handleChannelUpdated = (updatedCh: CommunityChannel) => {
      setChannels((prev) => prev.map((c) => (c.id === updatedCh.id ? { ...c, ...updatedCh } : c)));
    };

    const handleChannelDeleted = ({ id }: { id: string }) => {
      setChannels((prev) => prev.filter((c) => c.id !== id));
      setActiveChannelId((current) => (current === id ? '' : current));
    };

    socket.on('COMMUNITY_CHAT_MESSAGE', handleIncomingMessage);
    socket.on('COMMUNITY_MESSAGE_DELETED', handleMessageDeleted);
    socket.on('COMMUNITY_REACTION_UPDATED', handleReactionUpdated);
    socket.on('COMMUNITY_CHANNEL_CREATED', handleChannelCreated);
    socket.on('COMMUNITY_CHANNEL_UPDATED', handleChannelUpdated);
    socket.on('COMMUNITY_CHANNEL_DELETED', handleChannelDeleted);

    return () => {
      socket.off('COMMUNITY_CHAT_MESSAGE', handleIncomingMessage);
      socket.off('COMMUNITY_MESSAGE_DELETED', handleMessageDeleted);
      socket.off('COMMUNITY_REACTION_UPDATED', handleReactionUpdated);
      socket.off('COMMUNITY_CHANNEL_CREATED', handleChannelCreated);
      socket.off('COMMUNITY_CHANNEL_UPDATED', handleChannelUpdated);
      socket.off('COMMUNITY_CHANNEL_DELETED', handleChannelDeleted);
    };
  }, [socket, activeChannelId]);

  // Channels filtered by selected Hub
  const hubChannels = useMemo(() => {
    return channels.filter(
      (c) => (c.hubId || 'anticeil') === (activeHubId || 'anticeil') && c.category === 'CHANNELS',
    );
  }, [channels, activeHubId]);

  const dmChannels = useMemo(() => {
    return channels.filter((c) => c.category === 'DIRECT MESSAGES');
  }, [channels]);

  const isHome = activeHubId === 'anticeil';

  // Active channel resolution: Home prefers explicit activeChannelId (DM chat) or null (Friends page).
  // Servers MUST strictly isolate channels to the active server!
  const activeChannel = useMemo(() => {
    if (isHome) {
      if (!activeChannelId) return null;
      return dmChannels.find((c) => c.id === activeChannelId) || null;
    }
    if (hubChannels.length === 0) return null;
    if (activeChannelId) {
      const current = hubChannels.find((c) => c.id === activeChannelId);
      if (current) return current;
    }
    return hubChannels[0] || null;
  }, [isHome, activeChannelId, dmChannels, hubChannels]);

  // Auto-fetch and sync channels when switching to a server
  useEffect(() => {
    if (!activeHubId || activeHubId === 'anticeil') return;
    let mounted = true;
    const loadHubChannels = async () => {
      try {
        const res = await communityApi.getChannels(activeHubId);
        if (mounted && Array.isArray(res)) {
          setChannels((prev) => {
            const others = prev.filter((c) => (c.hubId || 'anticeil') !== activeHubId);
            return [...others, ...res];
          });
          setActiveChannelId((curr) => {
            const exists = res.some((c) => c.id === curr);
            return exists ? curr : (res[0]?.id || '');
          });
        }
      } catch (err) {
        console.warn('Failed to load channels for hub', activeHubId, err);
      }
    };
    loadHubChannels();
    return () => {
      mounted = false;
    };
  }, [activeHubId]);

  const isFriendsView = isHome && !activeChannel;

  // Active messages & filter
  const currentMessages = activeChannel ? messagesMap[activeChannel.id] || [] : [];
  const filteredMessages = searchQuery.trim()
    ? currentMessages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.senderName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : currentMessages;

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChannelId, currentMessages.length]);

  // Send message
  const handleSendMessage = async () => {
    if (!activeChannel) return;
    if (!inputText.trim() && !stagedAttachment) return;

    const currentUserId = currentUser?.id || 'anon-user';
    const currentUserName =
      `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
      currentUser?.email?.split('@')[0] ||
      'Pengguna Anticeil';

    const myMemberInfo = members.find((m) => m.id === currentUserId || m.email === currentUser?.email);
    let myRole: CommunityRole = myMemberInfo?.role || 'member';
    if (activeHub?.role === 'owner') {
      myRole = 'owner';
    } else if (activeHub?.role === 'admin') {
      myRole = 'admin';
    }

    const payload: Partial<CommunityMessage> = {
      channelId: activeChannel.id,
      senderId: currentUserId,
      senderName: currentUserName,
      senderEmail: currentUser?.email || 'user@anticeil.com',
      senderAvatar: currentUser?.imageUrl ?? null,
      senderRole: myRole,
      content: inputText.trim(),
      attachments: stagedAttachment ? [stagedAttachment] : undefined,
    };

    setInputText('');
    setStagedAttachment(null);

    try {
      const saved = await communityApi.sendMessage(activeChannel.id, payload);
      setMessagesMap((prev) => {
        const list = prev[activeChannel.id] || [];
        if (list.some((m) => m.id === saved.id)) return prev;
        return {
          ...prev,
          [activeChannel.id]: [...list, saved],
        };
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Delete message (Message CRUD)
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChannel) return;
    setMessagesMap((prev) => {
      const list = prev[activeChannel.id] || [];
      return {
        ...prev,
        [activeChannel.id]: list.filter((m) => m.id !== msgId),
      };
    });
    try {
      await communityApi.deleteMessage(msgId);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!activeChannel) return;
    const currentUserId = currentUser?.id || 'me';

    setMessagesMap((prev) => {
      const list = prev[activeChannel.id] || [];
      const updatedList = list.map((msg) => {
        if (msg.id !== msgId) return msg;
        const reactions = { ...(msg.reactions || {}) };
        const userList = reactions[emoji] || [];
        if (userList.includes(currentUserId)) {
          reactions[emoji] = userList.filter((id) => id !== currentUserId);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...userList, currentUserId];
        }
        return { ...msg, reactions };
      });
      return {
        ...prev,
        [activeChannel.id]: updatedList,
      };
    });

    try {
      await communityApi.toggleReaction(msgId, emoji, currentUserId);
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    }
  };

  // Join Server via Invite Code/Link
  const handleJoinHub = async (codeToJoin?: string) => {
    const rawCode = (codeToJoin || joinInviteCode).trim();
    if (!rawCode) {
      toast.error(t('Masukkan kode atau link undangan yang valid.'));
      return;
    }

    let code = rawCode;
    if (rawCode.includes('invite=')) {
      code = rawCode.split('invite=')[1].split('&')[0];
    } else if (rawCode.includes('/')) {
      code = rawCode.split('/').pop() || rawCode;
    }

    try {
      setIsJoiningHub(true);
      const joinedHub = await communityApi.joinHub(code);
      setHubs((prev) => {
        const next = [...prev.filter((h) => h.id !== joinedHub.id), joinedHub];
        saveStoredHubs(next);
        return next;
      });
      setActiveHubId(joinedHub.id);

      // fetch channels for joined server
      const hubChannels = await communityApi.getChannels(joinedHub.id);
      if (hubChannels && hubChannels.length > 0) {
        setChannels((prev) => [...prev.filter((c) => c.hubId !== joinedHub.id), ...hubChannels]);
        setActiveChannelId(hubChannels[0].id);
      }

      setIsCreateHubOpen(false);
      setJoinInviteCode('');
      toast.success(t(`Berhasil bergabung ke server ${joinedHub.name}! 🎉`));

      // Clear ?invite= from URL so page reloads don't re-trigger auto-join
      const url = new URL(window.location.href);
      if (url.searchParams.has('invite')) {
        url.searchParams.delete('invite');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    } catch {
      toast.error(t('Kode undangan tidak valid atau server tidak ditemukan.'));
    } finally {
      setIsJoiningHub(false);
    }
  };

  // Invite by Username
  const handleInviteByUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawUser = inviteUsername.trim().replace(/^@/, '');
    if (!rawUser) {
      toast.error(t('Masukkan username yang ingin diundang'));
      return;
    }

    const currentHubId = activeHub?.id;
    if (!currentHubId) {
      toast.error(t('Server tidak valid.'));
      return;
    }

    try {
      setIsInvitingUsername(true);
      setUserNotFound(null);
      const res = await communityApi.inviteMemberByUsername(currentHubId, rawUser);
      if (res.found && res.user) {
        if (res.alreadyMember) {
          toast.info(t(`@${res.user.username || rawUser} sudah menjadi anggota server ini.`));
        } else {
          toast.success(t(`Berhasil menambahkan @${res.user.username || rawUser} ke server! 🎉`));
          setMembers((prev) => {
            if (prev.some((m) => m.id === res.user!.id)) return prev;
            return [...prev, res.user!];
          });
        }
        setInviteUsername('');
        setUserNotFound(null);
      } else {
        setUserNotFound(rawUser);
      }
    } catch (err) {
      console.error('Invite by username failed', err);
      toast.error(t('Gagal mengundang pengguna. Silakan coba lagi.'));
    } finally {
      setIsInvitingUsername(false);
    }
  };

  // Cooldown calculation for username change (14 days / 2 weeks)
  const usernameCooldownDays = 14;
  const usernameLastUpdated = currentUser?.usernameUpdatedAt ? new Date(currentUser.usernameUpdatedAt) : null;
  const usernameCooldownEnd = usernameLastUpdated
    ? new Date(usernameLastUpdated.getTime() + usernameCooldownDays * 24 * 60 * 60 * 1000)
    : null;
  const isUsernameCooldownActive = usernameCooldownEnd ? new Date() < usernameCooldownEnd : false;

  const updateNameMutation = userMutations.useUpdateName({
    onSuccess: (data: any) => {
      userHooks.invalidateCurrentUser(queryClient);
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email;
      toast.success(t(`Nama tampilan berhasil diperbarui menjadi ${fullName}! 🎉`));
      setMembers((prev) =>
        prev.map((m) =>
          m.id === currentUser?.id || m.email === currentUser?.email
            ? { ...m, name: fullName }
            : m,
        ),
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || t('Gagal mengubah nama tampilan.');
      toast.error(msg);
    },
  });

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = editDisplayNameInput.trim();
    if (!cleaned) {
      toast.error(t('Nama tampilan tidak boleh kosong.'));
      return;
    }
    updateNameMutation.mutate({ name: cleaned });
  };

  const updateUsernameMutation = userMutations.useUpdateUsername({
    onSuccess: (data) => {
      userHooks.invalidateCurrentUser(queryClient);
      toast.success(t(`Username berhasil diperbarui menjadi @${data.username}! 🎉`));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || t('Gagal mengubah username.');
      toast.error(msg);
    },
  });

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = editUsernameInput.trim().replace(/^@/, '').toLowerCase();
    if (cleaned.length < 3 || cleaned.length > 32) {
      toast.error(t('Username harus antara 3 hingga 32 karakter.'));
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleaned)) {
      toast.error(t('Username hanya boleh menggunakan huruf kecil, angka, dan garis bawah (_).'));
      return;
    }
    updateUsernameMutation.mutate(cleaned);
  };

  // Create Server / Hub (Discord style Server CRUD)
  const handleCreateHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHubName.trim()) return;

    try {
      const createdHub = await communityApi.createHub({
        name: newHubName.trim(),
        description: newHubDesc.trim() || undefined,
      });

      const updatedHubs = [...hubs.filter((h) => h.id !== createdHub.id), createdHub];
      setHubs(updatedHubs);
      saveStoredHubs(updatedHubs);
      setActiveHubId(createdHub.id);

      let hubChannels = await communityApi.getChannels(createdHub.id);
      if (!hubChannels || hubChannels.length === 0) {
        const defaultCh = await communityApi.createChannel({
          name: 'general',
          description: `Saluran obrolan umum untuk server ${createdHub.name}`,
          category: 'CHANNELS',
          hubId: createdHub.id,
        });
        hubChannels = [defaultCh];
      }
      setChannels((prev) => [...prev.filter((c) => c.hubId !== createdHub.id), ...hubChannels]);
      setActiveChannelId(hubChannels[0].id);

      setIsCreateHubOpen(false);
      setNewHubName('');
      setNewHubDesc('');
      toast.success(t('Server baru berhasil dibuat!'));
    } catch (err) {
      console.warn('API createHub fallback', err);
      const newId = `hub_${Date.now()}`;
      const newHub: CommunityHub = {
        id: newId,
        name: newHubName.trim(),
        iconType: undefined as any,
        initials: newHubName.trim().slice(0, 2).toUpperCase() || 'SV',
        description: newHubDesc.trim() || '',
      };

      const defaultCh: CommunityChannel = {
        id: `ch_${Date.now()}_gen`,
        name: 'general',
        description: `Saluran obrolan umum untuk server ${newHub.name}`,
        category: 'CHANNELS',
        hubId: newId,
      };

      const updatedHubs = [...hubs, newHub];
      setHubs(updatedHubs);
      saveStoredHubs(updatedHubs);
      setChannels((prev) => [...prev, defaultCh]);
      setActiveHubId(newId);
      setActiveChannelId(defaultCh.id);

      setIsCreateHubOpen(false);
      setNewHubName('');
      setNewHubDesc('');
      toast.success(t('Server baru berhasil dibuat!'));
    }
  };

  // Edit / Rename Server (Hub CRUD: Update)
  const handleOpenEditHub = (hub: CommunityHub) => {
    setHubToEdit(hub);
    setEditHubName(hub.name);
    setEditHubDesc(hub.description || '');
  };

  const handleEditHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubToEdit || !editHubName.trim()) return;

    const newName = editHubName.trim();
    try {
      const updated = await communityApi.updateHub(hubToEdit.id, {
        name: newName,
        description: editHubDesc.trim() || undefined,
      });
      const updatedHubs = hubs.map((h) => (h.id === updated.id ? { ...h, ...updated } : h));
      setHubs(updatedHubs);
      saveStoredHubs(updatedHubs);
      setHubToEdit(null);
      toast.success(t('Nama server berhasil diperbarui!'));
    } catch {
      const updatedHubs: CommunityHub[] = hubs.map((h) => {
        if (h.id === hubToEdit.id) {
          return {
            ...h,
            name: newName,
            initials: newName.slice(0, 2).toUpperCase() || 'SV',
            description: editHubDesc.trim() || undefined,
          };
        }
        return h;
      });

      setHubs(updatedHubs);
      saveStoredHubs(updatedHubs);
      setHubToEdit(null);
      toast.success(t('Nama server berhasil diperbarui!'));
    }
  };

  // Delete Server (Hub CRUD: Delete)
  const handleDeleteHubConfirm = async () => {
    if (!hubToDelete) return;
    if (hubToDelete.id === 'anticeil') {
      toast.error(t('Server default tidak dapat dihapus.'));
      setHubToDelete(null);
      return;
    }

    try {
      await communityApi.deleteHub(hubToDelete.id);
    } catch (err) {
      console.warn('API deleteHub error', err);
    }

    const updatedHubs = hubs.filter((h) => h.id !== hubToDelete.id);
    setHubs(updatedHubs);
    saveStoredHubs(updatedHubs);

    // Filter out channels that belonged to this deleted hub
    setChannels((prev) => prev.filter((c) => c.hubId !== hubToDelete.id));

    // Switch active hub to default 'anticeil'
    setActiveHubId('anticeil');

    // Home hub = DMs, switch to first DM
    const firstDm = channels.find((c) => c.category === 'DIRECT MESSAGES');
    setActiveChannelId(firstDm?.id || '');

    setHubToDelete(null);
    toast.success(t('Server berhasil dihapus!'));
  };

  // Create Channel (Channel CRUD)
  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const created = await communityApi.createChannel({
        name: newChannelName.trim(),
        description: newChannelDesc.trim(),
        category: newChannelCategory,
        hubId: activeHubId === 'direct-messages' ? 'anticeil' : activeHubId,
      });

      setChannels((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [...prev, created];
      });
      setActiveChannelId(created.id);
      setIsCreateChannelOpen(false);
      setNewChannelName('');
      setNewChannelDesc('');
    } catch (err) {
      console.error('Failed to create channel', err);
    }
  };

  // Edit Channel (Channel CRUD)
  const handleOpenEditChannel = (channel: CommunityChannel, e: React.MouseEvent) => {
    e.stopPropagation();
    setChannelToEdit(channel);
    setEditChannelName(channel.name);
    setEditChannelDesc(channel.description || '');
  };

  const handleEditChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelToEdit || !editChannelName.trim()) return;

    try {
      const updated = await communityApi.updateChannel(channelToEdit.id, {
        name: editChannelName.trim(),
        description: editChannelDesc.trim(),
      });
      setChannels((prev) =>
        prev.map((c) => (c.id === channelToEdit.id ? { ...c, ...updated } : c)),
      );
      setChannelToEdit(null);
    } catch (err) {
      console.error('Failed to edit channel', err);
    }
  };

  // Delete Channel (Channel CRUD)
  const handleOpenDeleteChannel = (channel: CommunityChannel, e: React.MouseEvent) => {
    e.stopPropagation();
    setChannelToDelete(channel);
  };

  const handleDeleteChannelConfirm = async () => {
    if (!channelToDelete) return;
    const id = channelToDelete.id;
    setChannels((prev) => prev.filter((c) => c.id !== id));
    if (activeChannelId === id) {
      setActiveChannelId('');
    }
    setChannelToDelete(null);

    try {
      await communityApi.deleteChannel(id);
    } catch (err) {
      console.error('Failed to delete channel', err);
    }
  };

  // Start DM
  const handleStartDM = (member: CommunityMember) => {
    const dmId = `dm-${member.id}`;
    const existing = channels.find((c) => c.id === dmId);
    if (!existing) {
      const newDMChannel: CommunityChannel = {
        id: dmId,
        name: member.name,
        description: `Percakapan langsung dengan ${member.name} (${member.customStatus || member.role})`,
        category: 'DIRECT MESSAGES',
        hubId: 'anticeil',
        isDirectMessage: true,
        dmUserId: member.id,
      };
      setChannels((prev) => [...prev, newDMChannel]);
    }
    // DMs live in Home hub, auto-switch
    setActiveHubId('anticeil');
    setActiveChannelId(dmId);
    setIsMobileChannelsOpen(false);
    setIsMobileMembersOpen(false);
  };

  // File Select with Strict Limit: Max 5MB, Images & Documents only (Videos banned to save storage)
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so user can re-select same file if needed
    e.target.value = '';

    // 1. Strict Size Check (5MB max)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Ukuran file maksimal 5 MB untuk menjaga efisiensi storage.');
      return;
    }

    // 2. Reject Video and Audio formats
    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      toast.error('Format video dan audio tidak diizinkan. Harap unggah gambar atau dokumen.');
      return;
    }

    // 3. Allowed MIME types: images and documents (PDF, CSV, JSON, TXT, DOCX)
    const isImage = file.type.startsWith('image/');
    const isDocument =
      file.type === 'application/pdf' ||
      file.type === 'text/plain' ||
      file.type === 'text/csv' ||
      file.type === 'application/json' ||
      file.type.includes('wordprocessingml') ||
      file.type.includes('spreadsheetml') ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.xlsx');

    if (!isImage && !isDocument) {
      toast.error('Format file tidak didukung. Harap unggah gambar atau dokumen (PDF, TXT, CSV, JSON, DOCX).');
      return;
    }

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setStagedAttachment({
          type: 'image',
          url: reader.result as string,
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setStagedAttachment({
        type: 'file',
        url: '#',
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
      });
    }
  };

  // Render Hub Icon Helper (Discord style)
  const renderHubIcon = (hub: CommunityHub) => {
    switch (hub.iconType) {
      case 'logo':
        return (
          <img
            src="/logo.png"
            alt="Anticeil"
            className="size-5 object-contain pointer-events-none drop-shadow-xs"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/favicon.ico';
            }}
          />
        );
      case 'spark':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'bot':
        return <Bot className="w-4 h-4 text-emerald-400" />;
      case 'templates':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'code':
        return <Terminal className="w-4 h-4 text-blue-400" />;
      case 'dm':
        return <MessageSquare className="w-4 h-4 text-rose-400" />;
      default:
        return <span className="font-bold text-xs">{hub.initials}</span>;
    }
  };

  // Role Badge Helper (Discord Server Roles: Pemilik, Admin, Bot)
  const renderRoleBadge = (role: CommunityRole, roleLabel?: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-amber-500/20 text-[10px] px-1.5 py-0 uppercase font-semibold gap-1 shrink-0">
            <Crown className="w-2.5 h-2.5" /> {roleLabel || t('Pemilik')}
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border-rose-500/20 text-[10px] px-1.5 py-0 uppercase font-semibold gap-1 shrink-0">
            <Shield className="w-2.5 h-2.5" /> {roleLabel || t('Admin')}
          </Badge>
        );
      case 'bot':
        return (
          <Badge className="bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border-indigo-500/20 text-[10px] px-1.5 py-0 uppercase font-semibold gap-1 shrink-0">
            <Bot className="w-2.5 h-2.5" /> {roleLabel || t('Bot')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const currentUserName =
    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
    currentUser?.email?.split('@')[0] ||
    'Pengguna Anticeil';

  const displayMembers: CommunityMember[] = useMemo(() => {
    const isOwner = activeHub?.role === 'owner';
    const isAdmin = activeHub?.role === 'admin';
    const list = members.map((m) => {
      if (m.id === currentUser?.id || m.email === currentUser?.email) {
        return {
          ...m,
          username: m.username || currentUser?.username || null,
          role: isOwner ? ('owner' as CommunityRole) : isAdmin ? ('admin' as CommunityRole) : (m.role || 'member'),
          roleLabel: isOwner ? 'Pemilik' : isAdmin ? 'Admin' : undefined,
        };
      }
      return m;
    });

    if (currentUser && !list.some((m) => m.id === currentUser.id || m.email === currentUser.email)) {
      const currentRole: CommunityRole = isOwner ? 'owner' : isAdmin ? 'admin' : 'member';
      const currentLabel = isOwner ? 'Pemilik' : isAdmin ? 'Admin' : undefined;
      list.unshift({
        id: currentUser.id,
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        email: currentUser.email,
        username: currentUser.username || null,
        avatar: currentUser.imageUrl ?? null,
        role: currentRole,
        roleLabel: currentLabel,
        platformRole: currentUser.platformRole,
        status: 'online',
        customStatus: undefined,
      });
    }
    return list;
  }, [members, currentUser, activeHub]);

  // Component: Discord Mini Server/Hub Rail (compact, theme-consistent & non-overflowing)
  const renderDiscordHubRail = () => {
    const mainHub = hubs[0];
    const otherHubs = hubs.slice(1);

    return (
      <div className="w-12 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col items-center select-none z-10 h-full overflow-hidden">
        {/* Top Hub (Workspace / Home) - Exactly h-12 (48px) to match App Bar height */}
        {mainHub && (
          <div className="h-12 w-12 shrink-0 flex items-center justify-center relative group">
            {/* Discord signature left pill indicator */}
            <span
              className={cn(
                'absolute left-0 w-[3px] bg-foreground rounded-r-full transition-all duration-200',
                activeHubId === mainHub.id
                  ? 'h-6'
                  : 'h-0 group-hover:h-3.5 opacity-80',
              )}
            />

            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setActiveHubId(mainHub.id);
                    // Home hub (Discord Home): switch to Friends main page
                    setActiveChannelId('');
                  }}
                  className={cn(
                    'relative size-9 flex items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer shrink-0 rounded-[14px]',
                    activeHubId === mainHub.id
                      ? 'bg-primary/20 text-primary border border-primary/40 shadow-xs shadow-primary/10'
                      : 'bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80',
                  )}
                >
                  {renderHubIcon(mainHub)}

                  {/* Unread badge pill */}
                  {mainHub.unreadCount && mainHub.unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-sidebar">
                      {mainHub.unreadCount}
                    </span>
                  ) : null}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                {platform?.name ? `${platform.name} (${mainHub.name})` : `${mainHub.name} Workspace`}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Discord separator bar - Symmetrically aligned with the bottom border of the h-12 App Bar */}
        <div className="w-full flex items-center justify-center h-0 relative shrink-0 z-20">
          <div className="w-6 h-[2px] bg-sidebar-border rounded-full" />
        </div>

        {/* Scrollable lower hub rail: other hubs (if any), plus buttons */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center gap-2 pt-2.5 pb-2">
          {otherHubs.map((hub) => {
            const isActive = activeHubId === hub.id;
            return (
              <div key={hub.id} className="relative group w-full flex items-center justify-center">
                <span
                  className={cn(
                    'absolute left-0 w-[3px] bg-foreground rounded-r-full transition-all duration-200',
                    isActive ? 'h-6' : 'h-0 group-hover:h-3.5 opacity-80',
                  )}
                />

                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveHubId(hub.id);
                        const firstCh = channels.find(
                          (c) => (c.hubId || 'anticeil') === hub.id && c.category === 'CHANNELS',
                        );
                        setActiveChannelId(firstCh?.id || '');
                      }}
                      className={cn(
                        'relative size-9 flex items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer shrink-0 rounded-[14px]',
                        isActive
                          ? 'bg-primary/20 text-primary border border-primary/40 shadow-xs shadow-primary/10'
                          : 'bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80',
                      )}
                    >
                      {renderHubIcon(hub)}

                      {hub.unreadCount && hub.unreadCount > 0 ? (
                        <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-sidebar">
                          {hub.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                    {hub.name}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}

          {/* Add Server (+) Button - Ala Discord */}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsCreateHubOpen(true)}
                className="group relative size-9 rounded-[14px] bg-sidebar-accent text-emerald-500 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
              {t('Buat Server Baru')}
            </TooltipContent>
          </Tooltip>

          {/* Discover / Templates Compass */}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Link
                to="/templates"
                className="group relative size-9 rounded-[14px] bg-sidebar-accent text-muted-foreground hover:bg-primary hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
              >
                <Compass className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
              {t('Jelajahi Template Otomasi')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  };

  // Component: Channels Sidebar Content (reusable for desktop & mobile drawer)
  const renderChannelsSidebarContent = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full bg-sidebar select-none flex-1 min-w-0 overflow-hidden">
      {/* Header: Different for Home (DMs) vs Server (Channels) */}
      <div className="h-12 border-b border-sidebar-border px-2.5 flex items-center font-semibold shadow-2xs shrink-0 bg-sidebar z-10">
        {isHome ? (
          /* Home: Discord-style search bar "Find or start a conversation" */
          <button
            onClick={() => { setIsDmSearchOpen(true); setDmSearchQuery(''); }}
            className="w-full h-7 px-2 flex items-center gap-1.5 rounded-[4px] bg-sidebar-accent/80 hover:bg-sidebar-accent text-muted-foreground text-[11px] transition-colors cursor-pointer"
          >
            <Search className="w-3 h-3 shrink-0 opacity-60" />
            <span className="truncate">{t('Cari atau mulai percakapan...')}</span>
          </button>
        ) : (
          /* Server: Title + dropdown with channel/server actions */
          <div className="flex items-center justify-between w-full px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate tracking-tight text-foreground">
                {activeHub?.name || t('Server')}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {/* Boost */}
                <DropdownMenuItem
                  onClick={() => {
                    setServerSettingsSection('boost');
                    setIsServerSettingsOpen(true);
                  }}
                  className="text-purple-400 focus:text-purple-400 focus:bg-purple-500/10 cursor-pointer font-medium"
                >
                  <Zap className="w-4 h-4 mr-2" /> {t('Server Boost')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Invite & Settings */}
                <DropdownMenuItem
                  onClick={() => {
                    const code = activeHub?.inviteCode || activeHub?.id;
                    const url = `${window.location.origin}/messages?invite=${code}`;
                    navigator.clipboard.writeText(url);
                    toast.success(t('Link undangan berhasil disalin! 📋'));
                  }}
                  className="cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> {t('Undang ke Server')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setServerSettingsEditName(activeHub?.name || '');
                    setServerSettingsEditDesc(activeHub?.description || '');
                    setServerSettingsSection('profile');
                    setIsServerSettingsOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Settings className="w-4 h-4 mr-2" /> {t('Pengaturan Server')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Channel & Category */}
                <DropdownMenuItem onClick={() => setIsCreateChannelOpen(true)} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" /> {t('Buat Channel')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateHubOpen(true)} className="cursor-pointer">
                  <Layers className="w-4 h-4 mr-2" /> {t('Buat Server Baru')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Notification & Privacy */}
                <DropdownMenuItem
                  onClick={() => {
                    setServerSettingsSection('audit-log');
                    setIsServerSettingsOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <ScrollText className="w-4 h-4 mr-2" /> {t('Log Audit Server')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setServerSettingsSection('integrations');
                    setIsServerSettingsOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Webhook className="w-4 h-4 mr-2" /> {t('Integrasi & Bot')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Per-server profile */}
                <DropdownMenuItem
                  onClick={() => {
                    setServerSettingsSection('profile');
                    setIsServerSettingsOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> {t('Edit Profil Server')}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/templates" className="flex items-center">
                    <ExternalLink className="w-4 h-4 mr-2" /> {t('Jelajahi Marketplace')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Scroll Area: Home=DMs only, Server=Channels only */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 pb-16 [scrollbar-width:thin]">
        {isHome ? (
          /* ===== HOME: DIRECT MESSAGES & FRIENDS NAVIGATION ===== */
          <div>
            {/* Discord-style Friends button at top of Direct Messages column */}
            <button
              onClick={() => {
                setActiveChannelId('');
                onItemClick?.();
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all text-left mb-3 cursor-pointer group',
                isFriendsView
                  ? 'bg-accent text-accent-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Users className={cn('w-4 h-4 shrink-0 transition-colors', isFriendsView ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <span className="flex-1 font-medium">{t('Teman')}</span>
              {friendRequests.length > 0 && (
                <span className="size-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>

            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground/80 tracking-wider uppercase">
              <span>{t('Pesan Langsung')}</span>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setIsDmSearchOpen(true);
                      setDmSearchQuery('');
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4} className="font-semibold text-xs">
                  {t('Mulai DM Baru')}
                </TooltipContent>
              </Tooltip>
            </div>

            {dmChannels.length === 0 ? (
              <div className="px-2.5 py-3 text-[11px] text-muted-foreground/60 leading-relaxed text-center">
                <p>{t('Belum ada pesan langsung.')}</p>
                <button
                  onClick={() => {
                    setActiveChannelId('');
                    setFriendsTab('all');
                  }}
                  className="mt-1.5 text-primary hover:underline font-semibold cursor-pointer block mx-auto text-[11px]"
                >
                  {t('Buka Halaman Teman →')}
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {dmChannels.map((dm) => {
                  const isActiveDm = activeChannelId === dm.id;
                  const member = members.find((m) => `dm-${m.id}` === dm.id);
                  return (
                    <button
                      key={dm.id}
                      onClick={() => {
                        setActiveChannelId(dm.id);
                        onItemClick?.();
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left group',
                        isActiveDm
                          ? 'bg-accent text-accent-foreground font-semibold shadow-2xs'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      {member ? (
                        <CommunityAvatar
                          name={member.name}
                          imageUrl={member.avatar}
                          size={18}
                          status={member.status}
                          showStatus
                        />
                      ) : (
                        <MessageSquare
                          className={cn(
                            'w-3.5 h-3.5 shrink-0 transition-colors',
                            isActiveDm ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground',
                          )}
                        />
                      )}
                      <span className="truncate flex-1">{dm.name}</span>
                      {activeCallCounts[dm.id] && activeCallCounts[dm.id] > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1 shrink-0 animate-pulse">
                          <Radio className="w-2.5 h-2.5" />
                          {activeCallCounts[dm.id]}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ===== SERVER: CHANNELS ONLY ===== */
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground/80 tracking-wider uppercase">
              <div className="flex items-center gap-1">
                <span>{t('Channels')}</span>
                <span className="text-[10px] text-muted-foreground/60">({hubChannels.length})</span>
              </div>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setNewChannelCategory('CHANNELS');
                      setIsCreateChannelOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4} className="font-semibold text-xs">
                  {t('Buat Channel Baru')}
                </TooltipContent>
              </Tooltip>
            </div>

            {hubChannels.length === 0 ? (
              <div className="px-2.5 py-4 text-center">
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed mb-2">
                  {t('Belum ada channel')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="h-7 text-xs px-2.5 gap-1 w-full"
                >
                  <Plus className="w-3 h-3" />
                  {t('Buat Channel')}
                </Button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {hubChannels.map((ch) => {
                  const isActiveCh = activeChannelId === ch.id;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        onItemClick?.();
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left group cursor-pointer relative',
                        isActiveCh
                          ? 'bg-accent text-accent-foreground font-semibold shadow-2xs'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <Hash
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActiveCh ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground',
                        )}
                      />
                      <span className="truncate flex-1">{ch.name}</span>
                      {activeCallCounts[ch.id] && activeCallCounts[ch.id] > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1 shrink-0 animate-pulse">
                          <Radio className="w-2.5 h-2.5" />
                          {activeCallCounts[ch.id]}
                        </span>
                      ) : null}

                      {/* Channel action buttons (Webhook, Copy ID, Edit & Delete) */}
                      <div className="hidden group-hover:flex items-center gap-0.5 ml-auto shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChannelId(ch.id);
                            setIsWebhookDialogOpen(true);
                          }}
                          title="Integrasi Webhook"
                          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted"
                        >
                          <Webhook className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(ch.id);
                            toast.success(t(`ID Channel disalin: ${ch.id} 📋`));
                          }}
                          title="Salin ID Channel"
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleOpenEditChannel(ch, e)}
                          title="Edit Channel"
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleOpenDeleteChannel(ch, e)}
                          title="Hapus Channel"
                          className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Component: User Footer Profile Dock across the entire left rail area (Discord-style overlay card)
  const renderUserBottomDock = (isOverlay = true) => {
    const dockNode = (
      <>
      {/* Gradient scrim behind the card — masks server list & vertical borders like Discord */}
      {isOverlay && (
        <div
          aria-hidden
          className="hidden lg:block fixed bottom-0 left-0 pointer-events-none z-40"
          style={{
            width: '298px',
            height: activeCallChannelId ? '150px' : '100px',
            background: activeCallChannelId
              ? 'linear-gradient(to top, var(--sidebar-background, #141414) 0px, var(--sidebar-background, #141414) 106px, color-mix(in srgb, var(--sidebar-background, #141414) 75%, transparent) 128px, transparent 150px)'
              : 'linear-gradient(to top, var(--sidebar-background, #141414) 0px, var(--sidebar-background, #141414) 58px, color-mix(in srgb, var(--sidebar-background, #141414) 75%, transparent) 76px, transparent 100px)',
          }}
        />
      )}
      <div
        className={cn(
          'select-none pointer-events-auto',
          isOverlay
            ? 'hidden lg:flex flex-col fixed bottom-2 left-2 z-50 w-[280px]'
            : 'lg:hidden flex flex-col shrink-0 z-10 w-full bg-sidebar p-2 border-t border-sidebar-border',
        )}
      >
        {activeCallChannelId && (
          <div className="mb-1.5 px-3 py-1.5 rounded-[10px] bg-[#111214] border border-sidebar-border shadow-2xl backdrop-blur-md flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-emerald-400 leading-tight">
                  Voice Terhubung
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {channels.find((c) => c.id === activeCallChannelId)?.name || 'Panggilan'} / {activeHub?.name || 'Workspace'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setActiveChannelId(activeCallChannelId);
                  setIsCallPiP(false);
                }}
                className="h-6 w-6 text-muted-foreground hover:text-white"
                title="Kembali ke Layar Panggilan"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveCallChannelId(null)}
                className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                title="Putus Panggilan"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
        <div className="w-full h-[52px] px-2 py-1.5 rounded-[12px] bg-[#111214] border border-white/10 shadow-2xl backdrop-blur-md flex items-center justify-between">
          <div
            onClick={() => {
              const fallback = currentUser?.email ? currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
              setEditDisplayNameInput(currentUserName);
              setEditUsernameInput(currentUser?.username || fallback);
              setIsEditProfileOpen(true);
            }}
            className="flex items-center gap-2 min-w-0 flex-1 mr-1 px-1.5 py-1 rounded-md hover:bg-white/5 cursor-pointer transition-colors group/user"
            title={t('Ubah nama tampilan atau username')}
          >
            <CommunityAvatar
              name={currentUserName}
              email={currentUser?.email}
              imageUrl={currentUser?.imageUrl}
              size={32}
              status="online"
              showStatus
              className="shrink-0"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold truncate leading-tight text-foreground group-hover/user:text-primary transition-colors">
                {currentUserName}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5 truncate">
                {currentUser?.username
                  ? `@${currentUser.username}`
                  : currentUser?.email
                    ? `@${currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`
                    : t('@atur_username')}
              </span>
            </div>
          </div>

          {/* Discord Mic, Headphones & Settings */}
          <div className="flex items-center gap-0.5 text-muted-foreground shrink-0">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="h-7 px-1 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-md cursor-pointer flex items-center gap-0.5 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5" />}
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => setIsDeafened(!isDeafened)}
              className="h-7 px-1 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-md cursor-pointer flex items-center gap-0.5 transition-colors"
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones className={cn('w-3.5 h-3.5', isDeafened && 'text-red-400')} />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => {
                const fallback = currentUser?.email ? currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
                setEditDisplayNameInput(currentUserName);
                setEditUsernameInput(currentUser?.username || fallback);
                setIsEditProfileOpen(true);
              }}
              className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-md cursor-pointer transition-colors"
              title={t('Pengaturan Akun')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      </>
    );

    if (isOverlay) {
      if (typeof document !== 'undefined') {
        return createPortal(dockNode, document.body);
      }
      return null;
    }
    return dockNode;
  };

  // Friends Page helpers and state
  const onlineFriends = useMemo(() => {
    return displayMembers.filter(
      (m) => m.id !== currentUser?.id && m.email !== currentUser?.email && m.status !== 'offline',
    );
  }, [displayMembers, currentUser]);

  const allFriends = useMemo(() => {
    return displayMembers.filter(
      (m) => m.id !== currentUser?.id && m.email !== currentUser?.email,
    );
  }, [displayMembers, currentUser]);

  const filteredFriends = useMemo(() => {
    const list = friendsTab === 'online' ? onlineFriends : allFriends;
    if (!friendsSearchQuery.trim()) return list;
    const q = friendsSearchQuery.toLowerCase();
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.username && f.username.toLowerCase().includes(q)),
    );
  }, [friendsTab, onlineFriends, allFriends, friendsSearchQuery]);

  const handleAddFriend = async () => {
    if (!addFriendInput.trim()) return;
    setIsAddingFriend(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const cleanInput = addFriendInput.trim().replace(/^@/, '').toLowerCase();
      const found = members.find(
        (m) =>
          (m.username && m.username.toLowerCase() === cleanInput) ||
          m.name.toLowerCase() === cleanInput,
      );
      if (found) {
        if (found.id === currentUser?.id || found.email === currentUser?.email) {
          toast.error(t('Kamu tidak bisa menambahkan diri sendiri sebagai teman.'));
          return;
        }
        setFriendRequests((prev) => [
          ...prev.filter((r) => r.id !== found.id),
          {
            id: found.id,
            name: found.name,
            username: found.username || null,
            avatar: found.avatar || null,
            direction: 'outgoing' as const,
            status: 'pending' as const,
          },
        ]);
        toast.success(t('Permintaan pertemanan terkirim ke') + ` ${found.name}!`);
        setAddFriendInput('');
      } else {
        toast.error(t('Pengguna tidak ditemukan. Periksa username dan coba lagi.'));
      }
    } catch {
      toast.error(t('Gagal mengirim permintaan pertemanan.'));
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleAcceptRequest = (req: FriendRequest) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
    toast.success(t('Permintaan pertemanan dari') + ` ${req.name} ` + t('diterima!'));
  };

  const handleRejectRequest = (req: FriendRequest) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
    toast(t('Permintaan pertemanan ditolak.'));
  };

  // Component: Discord-Style Friends Main Page (rendered in the primary content area)
  const renderFriendsMainPage = () => {
    return (
      <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 bg-background/50 overflow-hidden">
        {/* Top Header: Discord Friends Bar */}
        <div className="h-12 border-b border-sidebar-border px-4 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3 min-w-0 overflow-x-auto [scrollbar-width:none]">
            <div className="flex items-center gap-2 shrink-0">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{t('Teman')}</span>
            </div>

            <Separator orientation="vertical" className="h-4 mx-1 shrink-0" />

            {/* Tabs: Online, Semua, Tertunda, Tambah Teman */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setFriendsTab('online')}
                className={cn(
                  'px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  friendsTab === 'online'
                    ? 'bg-accent text-accent-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                )}
              >
                <span>{t('Online')}</span>
                {onlineFriends.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/70">({onlineFriends.length})</span>
                )}
              </button>

              <button
                onClick={() => setFriendsTab('all')}
                className={cn(
                  'px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  friendsTab === 'all'
                    ? 'bg-accent text-accent-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                )}
              >
                <span>{t('Semua')}</span>
                {allFriends.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/70">({allFriends.length})</span>
                )}
              </button>

              <button
                onClick={() => setFriendsTab('pending')}
                className={cn(
                  'px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  friendsTab === 'pending'
                    ? 'bg-accent text-accent-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                )}
              >
                <span>{t('Tertunda')}</span>
                {friendRequests.length > 0 && (
                  <span className="size-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFriendsTab('add')}
                className={cn(
                  'px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ml-1',
                  friendsTab === 'add'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-600/90 hover:bg-emerald-600 text-white',
                )}
              >
                {t('Tambah Teman')}
              </button>
            </div>
          </div>

          {/* Right Top Header Actions */}
          <div className="flex items-center gap-2">
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setIsDmSearchOpen(true);
                    setDmSearchQuery('');
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="font-semibold text-xs">
                {t('Mulai DM Baru')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main Friends Column */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
            {friendsTab === 'add' ? (
              /* ===== TAMBAH TEMAN TAB ===== */
              <div className="max-w-xl">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">
                  {t('Tambah Teman')}
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {t('Kamu bisa menambahkan teman menggunakan nama pengguna mereka.')}
                </p>

                <div className="relative flex items-center rounded-lg bg-sidebar-accent/50 border border-border/80 focus-within:border-emerald-500 transition-colors p-2 shadow-2xs">
                  <Input
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    placeholder={t('Kamu bisa menambahkan teman menggunakan nama pengguna mereka')}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-xs px-2 h-8 placeholder:text-muted-foreground/60 flex-1"
                  />
                  <Button
                    onClick={handleAddFriend}
                    disabled={!addFriendInput.trim() || isAddingFriend}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-4 shrink-0 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAddingFriend ? t('Mengirim...') : t('Kirim Permintaan Pertemanan')}
                  </Button>
                </div>

                <Separator className="my-8" />

                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {t('Wumpus menunggu teman!')}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {t('Bagikan username Anda kepada teman atau masukkan username mereka di atas untuk mulai mengobrol dan berkolaborasi.')}
                  </p>
                </div>
              </div>
            ) : friendsTab === 'pending' ? (
              /* ===== TERTUNDA TAB ===== */
              <div className="max-w-3xl">
                <div className="text-[11px] font-bold text-muted-foreground/80 tracking-wider uppercase mb-3">
                  {t('Tertunda')} — {friendRequests.length}
                </div>

                {friendRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground/40 mb-3">
                      <Inbox className="w-8 h-8" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {t('Tidak ada permintaan pertemanan yang tertunda.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {friendRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-sidebar-accent/60 border-t border-border/40 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CommunityAvatar name={req.name} imageUrl={req.avatar} size={40} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {req.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {req.username ? `@${req.username} • ` : ''}
                              {req.direction === 'incoming' ? t('Permintaan Pertemanan Masuk') : t('Permintaan Pertemanan Keluar')}
                            </span>
                          </div>
                        </div>

                        {req.direction === 'incoming' ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <Tooltip delayDuration={150}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleAcceptRequest(req)}
                                  className="size-9 rounded-full bg-emerald-500/10 hover:bg-emerald-600 text-emerald-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={4} className="font-semibold text-xs">
                                {t('Terima')}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip delayDuration={150}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleRejectRequest(req)}
                                  className="size-9 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={4} className="font-semibold text-xs">
                                {t('Tolak')}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <Tooltip delayDuration={150}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleRejectRequest(req)}
                                className="size-9 rounded-full bg-sidebar-accent hover:bg-red-500 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={4} className="font-semibold text-xs">
                              {t('Batalkan')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ===== ONLINE / SEMUA TAB ===== */
              <div className="max-w-3xl">
                {/* Search Bar */}
                <div className="relative mb-5">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    value={friendsSearchQuery}
                    onChange={(e) => setFriendsSearchQuery(e.target.value)}
                    placeholder={t('Cari...')}
                    className="pl-9 h-9 text-xs bg-sidebar-accent/50 border-sidebar-border rounded-md"
                  />
                  {friendsSearchQuery && (
                    <button
                      onClick={() => setFriendsSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-bold text-muted-foreground/80 tracking-wider uppercase mb-3">
                  {friendsTab === 'online' ? t('Online') : t('Semua Teman')} — {filteredFriends.length}
                </div>

                {filteredFriends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground/40 mb-3">
                      <Users className="w-8 h-8" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">
                      {friendsTab === 'online'
                        ? t('Tidak ada teman yang sedang online saat ini.')
                        : t('Belum ada teman. Tambahkan teman untuk memulai!')}
                    </p>
                    {friendsTab !== 'online' && (
                      <Button
                        size="sm"
                        onClick={() => setFriendsTab('add')}
                        className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-2xs cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        {t('Tambah Teman')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredFriends.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleStartDM(member)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-sidebar-accent/60 border-t border-border/40 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CommunityAvatar
                            name={member.name}
                            imageUrl={member.avatar}
                            size={40}
                            status={member.status}
                            showStatus
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {member.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {member.username ? `@${member.username}` : (member.customStatus || (member.status === 'online' ? t('Online') : t('Offline')))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Tooltip delayDuration={150}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleStartDM(member)}
                                className="size-9 rounded-full bg-sidebar-accent hover:bg-accent hover:text-foreground text-muted-foreground flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={4} className="font-semibold text-xs">
                              {t('Pesan')}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Discord Desktop "Sedang Aktif" (Active Now) */}
          <div className="hidden xl:flex flex-col w-80 border-l border-sidebar-border p-4 bg-background/30 shrink-0">
            <h3 className="text-sm font-bold text-foreground mb-3">{t('Sedang Aktif')}</h3>
            {onlineFriends.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border/60 text-center">
                <p className="text-xs font-semibold text-foreground mb-1">{t('Saat ini sepi...')}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('Saat teman Anda online atau berkolaborasi di proyek, status mereka akan muncul di sini!')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {onlineFriends.slice(0, 5).map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleStartDM(f)}
                    className="p-3 rounded-xl bg-sidebar-accent/40 hover:bg-sidebar-accent border border-border/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <CommunityAvatar name={f.name} imageUrl={f.avatar} size={32} status={f.status} showStatus />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                          {f.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {f.username ? `@${f.username}` : t('Online')}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0 inline-block" />
                      <span className="truncate">{t('Sedang aktif di workspace')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Component: Members Sidebar Content
  const renderMembersSidebarContent = () => {
    const roleGroups: {
      key: string;
      title: string;
      filter: (m: CommunityMember) => boolean;
    }[] = [
      {
        key: 'owner',
        title: t('Pemilik Server'),
        filter: (m) => m.role === 'owner',
      },
      {
        key: 'admin',
        title: t('Admin Server'),
        filter: (m) => m.role === 'admin',
      },
      {
        key: 'bot',
        title: t('Bot & Integrasi'),
        filter: (m) => m.role === 'bot',
      },
      {
        key: 'online',
        title: t('Online'),
        filter: (m) => m.role !== 'owner' && m.role !== 'admin' && m.role !== 'bot' && m.status !== 'offline',
      },
      {
        key: 'offline',
        title: t('Offline'),
        filter: (m) => m.role !== 'owner' && m.role !== 'admin' && m.role !== 'bot' && m.status === 'offline',
      },
    ];

    return (
      <div className="flex flex-col h-full bg-sidebar border-l border-sidebar-border select-none w-60 shrink-0 overflow-hidden">
        {/* Header: NON-SCROLLABLE APP BAR */}
        <div className="h-12 border-b border-sidebar-border px-4 flex items-center justify-between font-semibold text-xs text-muted-foreground uppercase tracking-wider shrink-0 bg-sidebar z-10">
          <span>{t('Anggota Server')} ({displayMembers.length})</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setIsInviteOpen(true)} title={t('Undang Anggota')}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Members List: SCROLLABLE DAFTAR ANGGOTA */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
          {displayMembers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground/60">{t('Belum ada anggota')}</p>
            </div>
          ) : (
            roleGroups.map((r) => {
              const matchedMembers = displayMembers.filter(r.filter);
              if (matchedMembers.length === 0) return null;

              return (
                <div key={r.key} className="mb-4">
                  <div className="px-2 mb-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center justify-between">
                    <span>{r.title}</span>
                    <span>{matchedMembers.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {matchedMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleStartDM(member)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-sidebar-accent group"
                      >
                        <CommunityAvatar
                          name={member.name}
                          imageUrl={member.avatar}
                          size={28}
                          status={member.status}
                          showStatus
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-xs font-medium truncate',
                                member.status === 'offline'
                                  ? 'text-muted-foreground/60'
                                  : 'text-foreground group-hover:text-primary',
                              )}
                            >
                              {member.name}
                            </span>
                            {renderRoleBadge(member.role, member.roleLabel)}
                          </div>
                          {member.username && (
                            <span className="text-[10px] text-muted-foreground/60 truncate font-mono leading-none mt-0.5">
                              @{member.username}
                            </span>
                          )}
                          {member.customStatus && (
                            <span className="text-[10px] text-muted-foreground/70 truncate">
                              {member.customStatus}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <LockedFeatureGuard
      locked={false}
      lockTier="Plus"
      lockTitle={t('Unlock Chat & Collaboration')}
      lockDescription={t(
        'Berkomunikasi secara real-time, berbagi template otomatisasi instan, dan kolaborasi terpadu dengan rekan tim kerja Anda. Buka fitur ini dengan upgrade ke paket Plus (hingga 5 pengguna) atau Team.',
      )}
    >
      <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full overflow-hidden bg-background">
        {/* DESKTOP CHANNELS SIDEBAR (Clean single sidebar directly beside the Unified Mini Rail) */}
        <div className="hidden lg:flex flex-col h-full shrink-0 border-r border-sidebar-border bg-sidebar select-none w-60 overflow-hidden">
          <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
            {renderChannelsSidebarContent()}
          </div>
        </div>

        {/* OVERLAY USER PROFILE DOCK (Discord-style: floating card stacking over rail + body container) */}
        {renderUserBottomDock(true)}

        {/* MOBILE CHANNELS DRAWER */}
        <Sheet open={isMobileChannelsOpen} onOpenChange={setIsMobileChannelsOpen}>
          <SheetContent side="left" className="p-0 w-[310px] flex flex-col h-full bg-sidebar">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('Navigasi Channel & Hub')}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 min-h-0 w-full overflow-hidden">
              {renderDiscordHubRail()}
              <div className="flex-1 flex flex-col h-full min-w-0">
                {renderChannelsSidebarContent(() => setIsMobileChannelsOpen(false))}
              </div>
            </div>
            {renderUserBottomDock(false)}
          </SheetContent>
        </Sheet>

        {/* MOBILE MEMBERS DRAWER (Server Context) */}
        <Sheet open={isMobileMembersOpen} onOpenChange={setIsMobileMembersOpen}>
          <SheetContent side="right" className="p-0 w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('Anggota Server')}</SheetTitle>
            </SheetHeader>
            {renderMembersSidebarContent()}
          </SheetContent>
        </Sheet>

        {/* MAIN CONTENT AREA: DISCORD-STYLE FRIENDS HUB OR CHANNEL CHAT */}
        {isFriendsView ? (
          renderFriendsMainPage()
        ) : (
          <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 bg-background/50 overflow-hidden">
          {/* Channel Top Header Bar: NON-SCROLLABLE APP BAR (Hidden during full stage call like Discord) */}
          {!(activeCallChannelId === activeChannel?.id && !isCallPiP) && (
          <div className="h-12 border-b border-sidebar-border px-4 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-xs z-10">
            <div className="flex items-center gap-2 min-w-0">
              {activeChannel?.category === 'DIRECT MESSAGES' || activeChannel?.isDirectMessage ? (
                <span className="text-muted-foreground font-bold text-base shrink-0 select-none">@</span>
              ) : (
                <Hash className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-semibold truncate text-foreground">
                {activeChannel ? activeChannel.name : t('Belum ada channel')}
              </span>

              {activeChannel?.description && (
                <>
                  <Separator orientation="vertical" className="h-4 hidden sm:block mx-1" />
                  <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[400px]">
                    {activeChannel.description}
                  </span>
                </>
              )}
            </div>

            {/* Top Bar Actions: Call Buttons, Webhook, Members Toggle & Search */}
            <div className="flex items-center gap-1">
              {/* Voice/Video Call & Activity Buttons */}
              {activeChannel && (
                <>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (activeCallChannelId === activeChannel.id) {
                            setIsCallPiP(false);
                          } else {
                            setActiveCallChannelId(activeChannel.id);
                            setIsCallPiP(false);
                          }
                        }}
                        className={cn(
                          'h-8 w-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
                          activeCallChannelId === activeChannel.id && 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 hover:text-emerald-300',
                        )}
                      >
                        <PhoneCall className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6} className="font-semibold text-xs">
                      {activeCallChannelId === activeChannel.id ? 'Kembali ke Panggilan' : 'Mulai Voice Call'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (activeCallChannelId === activeChannel.id) {
                            setIsCallPiP(false);
                          } else {
                            setActiveCallChannelId(activeChannel.id);
                            setIsCallPiP(false);
                          }
                        }}
                        className={cn(
                          'h-8 w-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
                          activeCallChannelId === activeChannel.id && 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 hover:text-emerald-300',
                        )}
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6} className="font-semibold text-xs">
                      {activeCallChannelId === activeChannel.id ? 'Kembali ke Video Call' : 'Mulai Video Call'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (activeCallChannelId !== activeChannel.id) {
                            setActiveCallChannelId(activeChannel.id);
                          }
                          setIsCallPiP(false);
                          setIsActivityOpen((prev) => !prev);
                        }}
                        className={cn(
                          'h-8 w-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
                          isActivityOpen && activeCallChannelId === activeChannel.id && 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary',
                        )}
                      >
                        <Rocket className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6} className="font-semibold text-xs">
                      {isActivityOpen && activeCallChannelId === activeChannel.id ? 'Tutup Anticeil Activity' : 'Mulai Anticeil Activity'}
                    </TooltipContent>
                  </Tooltip>
                  <div className="w-px h-5 bg-sidebar-border mx-0.5" />
                </>
              )}

              {/* Webhook & Integrations Button (Ala Discord Webhook) */}
              {activeChannel && (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsWebhookDialogOpen(true)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Integrasi Webhook & ID Saluran"
                    >
                      <Webhook className="w-4 h-4 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6} className="font-semibold text-xs">
                    {t('Integrasi Webhook Bot & ID')}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Members/Friends Toggle Button */}
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        setIsMobileMembersOpen(true);
                      } else {
                        setShowMemberList(!showMemberList);
                      }
                    }}
                    className={cn(
                      'h-8 w-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
                      showMemberList && 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary',
                    )}
                    title={isHome ? 'Teman' : 'Anggota Server'}
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="font-semibold text-xs">
                  {isHome
                    ? (showMemberList ? t('Sembunyikan Teman') : t('Tampilkan Teman'))
                    : (showMemberList ? t('Sembunyikan Anggota') : t('Tampilkan Anggota'))
                  }
                </TooltipContent>
              </Tooltip>

              {/* Search Form on the Right */}
              <div className="relative w-36 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Cari...')}
                  className="h-8 pl-8 text-xs bg-sidebar-accent/50 border-sidebar-border"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Call Stage (replaces messages when active on this channel and not PiP) */}
          {activeCallChannelId === activeChannel?.id && !isCallPiP ? (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-full h-full">
              <CommunityCallStage
                channel={activeChannel!}
                activeHub={activeHub}
                currentUser={currentUser}
                isPlusOrAbove={isPlusOrAbove}
                socket={socket}
                isCallActive={true}
                isPiP={false}
                isActivityOpen={isActivityOpen}
                onToggleActivity={(open) => setIsActivityOpen((prev) => (typeof open === 'boolean' ? open : !prev))}
                onTogglePiP={() => setIsCallPiP(true)}
                onEndCall={() => {
                  setActiveCallChannelId(null);
                  setIsActivityOpen(false);
                }}
                onNavigateToBilling={() => navigate('/platform/billing')}
              />
            </div>
          ) : (
          <>
          {/* Messages Feed (SCROLLABLE CONVERSATION) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:thin]">
            {!activeChannel ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground mb-4">
                  <Hash className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t('Belum Ada Channel')}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">
                  {t('Workspace ini belum memiliki channel. Buat channel pertama untuk mulai berkolaborasi dan berkomunikasi dengan tim.')}
                </p>
                <Button onClick={() => setIsCreateChannelOpen(true)} size="sm" className="gap-1.5 shadow-2xs">
                  <Plus className="w-4 h-4" />
                  {t('Buat Channel Baru')}
                </Button>
              </div>
            ) : (
              <>
                {/* Welcome banner at top of channel */}
                <div className="mb-6 pt-4 pb-2">
                  <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary mb-3">
                    <Hash className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Selamat datang di #{activeChannel.name}!
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                    {activeChannel.description ||
                      'Ruang obrolan tim Anticeil. Mulai percakapan, bagikan template otomatisasi, atau koordinasikan alur kerja tim.'}
                  </p>
                </div>

                <Separator className="my-4 bg-border/40" />

                {/* Message List */}
                {filteredMessages.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Belum ada pesan di channel ini. Jadilah yang pertama mengirim pesan!
                  </div>
                ) : (
                  filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="group relative flex gap-3 px-2 py-1.5 -mx-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  {/* Sender Avatar */}
                  <CommunityAvatar
                    name={msg.senderName}
                    email={msg.senderEmail}
                    imageUrl={msg.senderAvatar}
                    size={38}
                    className="shrink-0 mt-0.5"
                  />

                  {/* Message Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground hover:underline cursor-pointer">
                        {msg.senderName}
                      </span>
                      {renderRoleBadge(msg.senderRole)}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-xs leading-relaxed text-foreground/90 break-words">
                      {renderFormattedMessage(msg.content)}
                    </div>

                    {/* Attachments rendering */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((att, attIdx) => {
                          if (att.type === 'template' && att.templateData) {
                            return (
                              <Card
                                key={attIdx}
                                className="p-3 max-w-md bg-sidebar border-border/80 rounded-lg shadow-xs hover:border-primary/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                      <Layers className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-semibold">{att.templateData.name}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    {att.templateData.price || 'Free'}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                                  {att.templateData.description}
                                </p>
                                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/40">
                                  <span className="text-[10px] text-muted-foreground">
                                    {att.templateData.pieceCount} Langkah Alur
                                  </span>
                                  <Button size="sm" variant="default" className="h-7 text-xs px-2.5" asChild>
                                    <Link to="/templates">
                                      {t('Gunakan Template')}
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </Link>
                                  </Button>
                                </div>
                              </Card>
                            );
                          }
                          if (att.type === 'image') {
                            return (
                              <img
                                key={attIdx}
                                src={att.url}
                                alt={att.name}
                                className="max-h-60 rounded-md border border-border/60 object-cover"
                              />
                            );
                          }
                          return (
                            <div
                              key={attIdx}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 border border-border/40 text-xs"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="truncate">{att.name}</span>
                              {att.size && <span className="text-[10px] text-muted-foreground">({att.size})</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reactions Row */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                          const isReacted = userIds.includes(currentUser?.id || 'me');
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border transition-colors cursor-pointer',
                                isReacted
                                  ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                                  : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted',
                              )}
                            >
                              <span>{emoji}</span>
                              <span className="text-[11px] font-semibold">{userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Discord Hover Action Bar (Reactions & Delete CRUD) */}
                  <div className="absolute right-3 -top-3.5 hidden group-hover:flex items-center bg-background border border-border/80 shadow-md rounded-md p-0.5 gap-0.5 z-10">
                    <button
                      onClick={() => handleToggleReaction(msg.id, '👍')}
                      className="p-1 hover:bg-muted rounded text-xs transition-colors"
                      title="Like"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleToggleReaction(msg.id, '❤️')}
                      className="p-1 hover:bg-muted rounded text-xs transition-colors"
                      title="Love"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => handleToggleReaction(msg.id, '🔥')}
                      className="p-1 hover:bg-muted rounded text-xs transition-colors"
                      title="Fire"
                    >
                      🔥
                    </button>
                    <button
                      onClick={() => handleToggleReaction(msg.id, '🎉')}
                      className="p-1 hover:bg-muted rounded text-xs transition-colors"
                      title="Party"
                    >
                      🎉
                    </button>

                    <Separator orientation="vertical" className="h-4 mx-0.5" />

                    {/* Delete Message button (Message CRUD) */}
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded transition-colors"
                      title="Hapus Pesan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Staged Attachment Indicator */}
          {stagedAttachment && (
            <div className="mx-4 mb-2 p-2 rounded-md bg-sidebar border border-sidebar-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium truncate">{stagedAttachment.name}</span>
                {stagedAttachment.size && (
                  <span className="text-[10px] text-muted-foreground">({stagedAttachment.size})</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStagedAttachment(null)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Chat Input Bar (NON-SCROLLABLE FORM CHAT / BOTTOM BAR) */}
          <div className="h-16 border-t border-sidebar-border px-4 flex items-center shrink-0 bg-background/90 backdrop-blur-xs z-10">
            <div className="w-full h-11 flex items-center gap-1.5 bg-sidebar rounded-lg border border-sidebar-border px-2.5 focus-within:border-primary/50 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
                className="hidden"
              />

              {/* Upload file button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                title="Lampirkan Gambar atau Dokumen (Maks. 5 MB)"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Share Template Popover */}
              <Popover open={isTemplatePopoverOpen} onOpenChange={setIsTemplatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                    title="Bagikan Template Otomasi"
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-80 p-3">
                  <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Pilih Template untuk Dibagikan
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {SHAREABLE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setStagedAttachment({
                            type: 'template',
                            url: '/templates',
                            name: tmpl.name,
                            templateData: tmpl,
                          });
                          setIsTemplatePopoverOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border/60"
                      >
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="truncate">{tmpl.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{tmpl.price}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {tmpl.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Text Input */}
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!activeChannel}
                placeholder={activeChannel ? `Pesan ke #${activeChannel.name}...` : t('Pilih atau buat channel terlebih dahulu...')}
                className="border-0 shadow-none focus-visible:ring-0 text-xs px-2 h-8 bg-transparent flex-1 disabled:opacity-50"
              />

              {/* Send Button */}
              <Button
                variant={inputText.trim() || stagedAttachment ? 'default' : 'ghost'}
                size="icon"
                onClick={handleSendMessage}
                disabled={!activeChannel || (!inputText.trim() && !stagedAttachment)}
                className="h-7 w-7 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          </>
          )}
        </div>
        )}

        {/* DESKTOP MEMBERS SIDEBAR (w-60) */}
        {showMemberList && !isFriendsView && (
          <div className="hidden lg:flex shrink-0">
            {renderMembersSidebarContent()}
          </div>
        )}

        {/* DIALOG: BUAT ATAU GABUNG SERVER (Ala Discord) */}
        <Dialog open={isCreateHubOpen} onOpenChange={setIsCreateHubOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <Tabs defaultValue="create" className="w-full">
              <DialogHeader className="pb-2">
                <DialogTitle>{t('Server Komunitas')}</DialogTitle>
                <DialogDescription>
                  {t('Buat server baru untuk proyek Anda atau gabung ke server lain menggunakan kode/link undangan.')}
                </DialogDescription>
                <TabsList className="grid w-full grid-cols-2 mt-2">
                  <TabsTrigger value="create">{t('Buat Server Baru')}</TabsTrigger>
                  <TabsTrigger value="join">{t('Gabung via Link/Kode')}</TabsTrigger>
                </TabsList>
              </DialogHeader>

              <TabsContent value="create">
                <form onSubmit={handleCreateHubSubmit}>
                  <div className="grid gap-3 py-3">
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold">{t('Nama Server')}</label>
                      <Input
                        value={newHubName}
                        onChange={(e) => setNewHubName(e.target.value)}
                        placeholder="contoh: Komunitas AI & Bot / Proyek Alpha"
                        className="text-xs"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold">{t('Deskripsi (Opsional)')}</label>
                      <Input
                        value={newHubDesc}
                        onChange={(e) => setNewHubDesc(e.target.value)}
                        placeholder="Ruang diskusi untuk alur kerja dan bot..."
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateHubOpen(false)}
                    >
                      {t('Batal')}
                    </Button>
                    <Button type="submit">
                      {t('Buat Server')}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="join">
                <div className="grid gap-3 py-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold">{t('Kode atau Link Undangan')}</label>
                    <Input
                      value={joinInviteCode}
                      onChange={(e) => setJoinInviteCode(e.target.value)}
                      placeholder="contoh: inv_9f2a1b atau https://.../messages?invite=..."
                      className="text-xs"
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t('Tempel link undangan dari pembuat server untuk langsung bergabung ke komunitas mereka.')}
                    </p>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateHubOpen(false)}
                  >
                    {t('Batal')}
                  </Button>
                  <Button
                    onClick={() => handleJoinHub()}
                    disabled={isJoiningHub || !joinInviteCode.trim()}
                  >
                    {isJoiningHub ? t('Bergabung...') : t('Gabung Server')}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* ===== SERVER SETTINGS FULL-PAGE MODAL (Discord-style) ===== */}
        <Dialog open={isServerSettingsOpen} onOpenChange={setIsServerSettingsOpen}>
          <DialogContent className="max-w-[900px] w-[calc(100vw-2rem)] h-[calc(100dvh-4rem)] max-h-[680px] gap-0 overflow-hidden p-0 flex">
            <DialogTitle className="sr-only">{t('Pengaturan Server')}</DialogTitle>
            {/* Left sidebar */}
            <aside className="w-56 shrink-0 flex flex-col border-r bg-muted/30 overflow-y-auto [scrollbar-width:thin]">
              <div className="px-3 pt-5 pb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-2 pb-1 truncate">
                  {activeHub?.name || 'Server'}
                </p>
              </div>
              <nav className="px-2 pb-3 space-y-0.5">
                {[
                  { id: 'profile', label: t('Profil Server'), icon: Globe },
                  { id: 'server-tag', label: t('Tag Server'), icon: Tag },
                  { id: 'engagement', label: t('Engagement'), icon: BarChart3 },
                  { id: 'boost', label: t('Boost Perks'), icon: Zap },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setServerSettingsSection(id as ServerSettingsSection)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                      serverSettingsSection === id
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}

                <div className="px-2 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">{t('Ekspresi')}</div>
                {[
                  { id: 'emoji', label: t('Emoji'), icon: Smile },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setServerSettingsSection(id as ServerSettingsSection)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                      serverSettingsSection === id
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}

                <div className="px-2 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">{t('Anggota')}</div>
                {[
                  { id: 'members', label: t('Anggota'), icon: Users },
                  { id: 'roles', label: t('Peran'), icon: KeyRound },
                  { id: 'invites', label: t('Undangan'), icon: UserPlus },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setServerSettingsSection(id as ServerSettingsSection)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                      serverSettingsSection === id
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}

                <div className="px-2 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">{t('Apps')}</div>
                {[
                  { id: 'integrations', label: t('Integrasi'), icon: Webhook },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setServerSettingsSection(id as ServerSettingsSection)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                      serverSettingsSection === id
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}

                <div className="px-2 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">{t('Moderasi')}</div>
                {[
                  { id: 'audit-log', label: t('Log Audit'), icon: ScrollText },
                  { id: 'bans', label: t('Ban'), icon: Ban },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setServerSettingsSection(id as ServerSettingsSection)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                      serverSettingsSection === id
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}

                <div className="my-2 border-t" />
                <button
                  type="button"
                  onClick={() => {
                    setIsServerSettingsOpen(false);
                    setHubToDelete(activeHub);
                  }}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  {t('Hapus Server')}
                </button>
              </nav>
            </aside>

            {/* Right content area */}
            <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
              {/* Close button */}
              <button
                onClick={() => setIsServerSettingsOpen(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-8 py-8 max-w-2xl">
                {/* 1. PROFIL SERVER */}
                {serverSettingsSection === 'profile' && (
                  <div>
                    <h2 className="text-xl font-bold mb-1">{t('Profil Server')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t('Atur bagaimana server Anda tampil di link undangan dan daftar server.')}
                    </p>

                    {/* Preview card */}
                    <div className="mb-6 rounded-xl overflow-hidden border bg-card/60 shadow-sm w-full max-w-sm">
                      <div className={cn("h-24 bg-gradient-to-br from-primary/30 to-purple-600/30", serverSettingsEditColor)} />
                      <div className="px-4 pb-4 -mt-8">
                        <div className="w-16 h-16 rounded-2xl bg-card border-4 border-card flex items-center justify-center text-xl font-bold text-primary shadow-sm overflow-hidden">
                          {serverSettingsEditIconUrl ? (
                            <img src={serverSettingsEditIconUrl} alt="Server icon" className="w-full h-full object-cover" />
                          ) : (
                            activeHub?.initials || activeHub?.name?.slice(0, 2) || 'SV'
                          )}
                        </div>
                        <p className="font-semibold mt-2 text-sm">{serverSettingsEditName || activeHub?.name || 'Server'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {members.length > 0 ? `${members.filter(m => m.status === 'online').length} Online • ${members.length} Anggota` : '1 Online • 1 Anggota'}
                        </p>
                        {(serverSettingsEditDesc || activeHub?.description) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{serverSettingsEditDesc || activeHub?.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {serverTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Nama Server')}</label>
                        <Input
                          value={serverSettingsEditName}
                          onChange={(e) => setServerSettingsEditName(e.target.value)}
                          className="mt-1.5"
                          placeholder="Nama server..."
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Deskripsi Server')}</label>
                        <Input
                          value={serverSettingsEditDesc}
                          onChange={(e) => setServerSettingsEditDesc(e.target.value)}
                          className="mt-1.5"
                          placeholder="Tuliskan deskripsi singkat mengenai server ini..."
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('URL Ikon Server (Opsional)')}</label>
                        <Input
                          value={serverSettingsEditIconUrl}
                          onChange={(e) => setServerSettingsEditIconUrl(e.target.value)}
                          className="mt-1.5 font-mono text-xs"
                          placeholder="https://example.com/icon.png"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">{t('Warna Aksen Banner')}</label>
                        <div className="flex gap-2">
                          {[
                            { name: 'Indigo', val: 'bg-indigo-600' },
                            { name: 'Purple', val: 'bg-purple-600' },
                            { name: 'Emerald', val: 'bg-emerald-600' },
                            { name: 'Blue', val: 'bg-blue-600' },
                            { name: 'Rose', val: 'bg-rose-600' },
                            { name: 'Amber', val: 'bg-amber-600' },
                          ].map((c) => (
                            <button
                              key={c.val}
                              type="button"
                              onClick={() => setServerSettingsEditColor(c.val)}
                              className={cn(
                                "w-7 h-7 rounded-full transition-all border-2",
                                c.val,
                                serverSettingsEditColor === c.val ? "ring-2 ring-primary ring-offset-2 border-white" : "border-transparent opacity-80 hover:opacity-100"
                              )}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                      <Button
                        onClick={async () => {
                          if (!activeHub) return;
                          const updated = {
                            ...activeHub,
                            name: serverSettingsEditName,
                            description: serverSettingsEditDesc,
                            color: serverSettingsEditColor,
                            iconUrl: serverSettingsEditIconUrl || undefined,
                          };
                          setHubs((prev) => prev.map((h) => (h.id === activeHub.id ? updated : h)));
                          try {
                            await communityApi.updateHub(activeHub.id, {
                              name: serverSettingsEditName,
                              description: serverSettingsEditDesc,
                              color: serverSettingsEditColor,
                              iconUrl: serverSettingsEditIconUrl || undefined,
                            });
                          } catch {}
                          toast.success(t('Profil server berhasil diperbarui! ✅'));
                          setIsServerSettingsOpen(false);
                        }}
                      >
                        {t('Simpan Perubahan')}
                      </Button>
                      <Button variant="outline" onClick={() => setIsServerSettingsOpen(false)}>
                        {t('Batal')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2. TAG SERVER */}
                {serverSettingsSection === 'server-tag' && (
                  <div>
                    <h2 className="text-xl font-bold mb-1">{t('Tag Server')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t('Tambahkan tag untuk memudahkan anggota menemukan topik dan kategori server Anda.')}
                    </p>

                    <div className="space-y-6">
                      <div className="rounded-lg border bg-card/40 p-4">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                          {t('Tag Server Saat Ini')} ({serverTags.length})
                        </label>
                        <div className="flex flex-wrap gap-2 min-h-10 items-center">
                          {serverTags.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">{t('Belum ada tag yang ditambahkan.')}</p>
                          ) : (
                            serverTags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs">
                                <span>#{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => setServerTags((prev) => prev.filter((t) => t !== tag))}
                                  className="text-muted-foreground hover:text-foreground rounded-full"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Tambah Tag Baru')}</label>
                        <div className="flex gap-2 mt-1.5">
                          <Input
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const clean = newTagInput.trim().replace(/^#/, '').toLowerCase();
                                if (clean && !serverTags.includes(clean)) {
                                  setServerTags((prev) => [...prev, clean]);
                                  setNewTagInput('');
                                }
                              }
                            }}
                            placeholder="cth: automasi, devops, ai-agent..."
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              const clean = newTagInput.trim().replace(/^#/, '').toLowerCase();
                              if (clean && !serverTags.includes(clean)) {
                                setServerTags((prev) => [...prev, clean]);
                                setNewTagInput('');
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            {t('Tambah')}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                          {t('Rekomendasi Tag Populer')}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {['automasi', 'workflow', 'devops', 'support', 'ai-agents', 'community', 'integrasi', 'activepieces'].map((tName) => (
                            <button
                              key={tName}
                              type="button"
                              onClick={() => {
                                if (!serverTags.includes(tName)) {
                                  setServerTags((prev) => [...prev, tName]);
                                }
                              }}
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-full border transition-all text-left",
                                serverTags.includes(tName)
                                  ? "bg-primary/10 border-primary text-primary font-medium"
                                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
                              )}
                            >
                              #{tName}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          onClick={async () => {
                            if (!activeHub) return;
                            const updated = { ...activeHub, tags: serverTags };
                            setHubs((prev) => prev.map((h) => (h.id === activeHub.id ? updated : h)));
                            try {
                              await communityApi.updateHub(activeHub.id, { tags: serverTags });
                            } catch {}
                            toast.success(t('Tag server berhasil disimpan! 🏷️'));
                          }}
                        >
                          {t('Simpan Tag')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ENGAGEMENT */}
                {serverSettingsSection === 'engagement' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold">{t('Engagement & Analitik')}</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!activeHub) return;
                          const stats = await communityApi.getHubStats(activeHub.id);
                          setServerStats(stats);
                          toast.success(t('Data analitik diperbarui! 📊'));
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {t('Segarkan')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t('Analisis aktivitas saluran, keaktifan anggota, dan volume pesan otomatis di server ini.')}
                    </p>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Card className="p-4 bg-card/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{t('Total Pesan')}</span>
                          <MessageSquare className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{serverStats?.totalMessages || 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t('Pesan di seluruh saluran')}</p>
                      </Card>

                      <Card className="p-4 bg-card/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{t('Saluran Aktif')}</span>
                          <Hash className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-bold mt-2">
                          {serverStats?.totalChannels || channels.filter((c) => (c.hubId || 'anticeil') === activeHub?.id).length}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t('Saluran teks & DM')}</p>
                      </Card>

                      <Card className="p-4 bg-card/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{t('Anggota Server')}</span>
                          <Users className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{members.length}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {members.filter((m) => m.status === 'online').length} {t('sedang online')}
                        </p>
                      </Card>

                      <Card className="p-4 bg-card/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{t('Pesan Bot')}</span>
                          <Bot className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{serverStats?.botMessages || 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t('Dipicu otomatis oleh webhook')}</p>
                      </Card>
                    </div>

                    {/* Health Status */}
                    <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-3.5 mb-6 flex items-center gap-3">
                      <Activity className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('Status Komunitas: Sangat Sehat & Aktif 🚀')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('Interaksi real-time berjalan normal dengan webhook automasi aktif.')}
                        </p>
                      </div>
                    </div>

                    {/* Channel Activity */}
                    <div className="rounded-lg border bg-card/40 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('Peringkat Aktivitas Saluran')}</p>
                      {serverStats?.channelActivity && serverStats.channelActivity.length > 0 ? (
                        <div className="space-y-2.5">
                          {serverStats.channelActivity.map((ch, idx) => (
                            <div key={ch.channelId || idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium flex items-center gap-1.5">
                                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                                  {ch.channelName}
                                </span>
                                <span className="text-muted-foreground">{ch.messageCount} {t('pesan')}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-primary h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, Math.max(10, (ch.messageCount / (serverStats.totalMessages || 1)) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('Belum ada data aktivitas saluran.')}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. BOOST PERKS */}
                {serverSettingsSection === 'boost' && (
                  <div>
                    <h2 className="text-xl font-bold mb-1">{t('Server Boost Perks')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t('Tingkatkan performa server Anda untuk membuka batas kapasitas, audio HD, dan kustomisasi ekstra.')}
                    </p>

                    {/* Hero Boost Banner */}
                    <div className="rounded-xl border bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-card p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{t('Tingkat')} {activeHub?.boostTier || 0}</h3>
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                                {activeHub?.boostsCount || 0} {t('Boost Aktif')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(activeHub?.boostTier || 0) >= 3
                                ? t('Tingkat Maksimal Tercapai!')
                                : `${(activeHub?.boostTier || 0) === 2 ? 14 - (activeHub?.boostsCount || 0) : (activeHub?.boostTier || 0) === 1 ? 7 - (activeHub?.boostsCount || 0) : 2 - (activeHub?.boostsCount || 0)} boost lagi menuju Tingkat ${(activeHub?.boostTier || 0) + 1}`}
                            </p>
                          </div>
                        </div>

                        <Button
                          disabled={isBoostingServer}
                          onClick={async () => {
                            if (!activeHub) return;
                            setIsBoostingServer(true);
                            try {
                              const res = await communityApi.boostHub(activeHub.id);
                              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                              setHubs((prev) =>
                                prev.map((h) =>
                                  h.id === activeHub.id
                                    ? { ...h, boostsCount: res.boostsCount, boostTier: res.boostTier }
                                    : h,
                                ),
                              );
                              toast.success(t(`Server berhasil di-boost! Sekarang di Tingkat ${res.boostTier} ⚡🎉`));
                            } catch {
                              toast.error(t('Gagal melakukan boost server.'));
                            } finally {
                              setIsBoostingServer(false);
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          {isBoostingServer ? t('Memproses...') : t('Boost Server Ini (+1 Boost)')}
                        </Button>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>{t('Kemajuan Boost')}</span>
                          <span>{activeHub?.boostsCount || 0} / 14</span>
                        </div>
                        <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(5, ((activeHub?.boostsCount || 0) / 14) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Perks per tier */}
                    <div className="space-y-3">
                      {[
                        {
                          tier: 1,
                          boostsRequired: 2,
                          title: t('Tingkat 1 — Dasar Komunitas'),
                          perks: [t('+50 Slot Emoji Kustom Server'), t('Kualitas Audio Suara 128 Kbps'), t('Banner Server Kustom')],
                        },
                        {
                          tier: 2,
                          boostsRequired: 7,
                          title: t('Tingkat 2 — Performa Tinggi'),
                          perks: [t('+100 Slot Emoji Kustom Server'), t('Batas Upload File 50 MB'), t('Saluran Automasi Bot Khusus')],
                        },
                        {
                          tier: 3,
                          boostsRequired: 14,
                          title: t('Tingkat 3 — Eksklusif & Vanity'),
                          perks: [t('+250 Slot Emoji Kustom Server'), t('Batas Upload File 100 MB'), t('Link Undangan Vanity Kustom')],
                        },
                      ].map((tInfo) => {
                        const isUnlocked = (activeHub?.boostTier || 0) >= tInfo.tier;
                        return (
                          <div
                            key={tInfo.tier}
                            className={cn(
                              "rounded-lg border p-4 transition-colors",
                              isUnlocked ? "bg-purple-500/5 border-purple-500/20" : "bg-card/40 opacity-70"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm flex items-center gap-2">
                                <Award className={cn("w-4 h-4", isUnlocked ? "text-purple-400" : "text-muted-foreground")} />
                                {tInfo.title}
                              </span>
                              <Badge variant={isUnlocked ? "default" : "outline"} className={isUnlocked ? "bg-purple-600 text-[10px]" : "text-[10px]"}>
                                {isUnlocked ? t('Terbuka ✅') : `${tInfo.boostsRequired} Boost`}
                              </Badge>
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                              {tInfo.perks.map((p, idx) => (
                                <li key={idx}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. EMOJI */}
                {serverSettingsSection === 'emoji' && (
                  <div>
                    <h2 className="text-xl font-bold mb-1">{t('Emoji Kustom')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t('Tambahkan emoji kustom yang dapat digunakan oleh semua anggota di server ini.')}
                    </p>

                    <div className="space-y-6">
                      {/* Grid of emojis */}
                      <div className="rounded-lg border bg-card/40 p-4">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
                          {t('Daftar Emoji Server')} ({serverEmojis.length})
                        </label>
                        {serverEmojis.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-3">{t('Belum ada emoji kustom.')}</p>
                        ) : (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                            {serverEmojis.map((em) => (
                              <div
                                key={em.id}
                                className="group relative rounded-lg border bg-background/60 p-2.5 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors"
                              >
                                <span className="text-2xl mb-1">{em.char || '✨'}</span>
                                <span className="text-[10px] font-mono text-muted-foreground truncate w-full">:{em.name}:</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const next = serverEmojis.filter((e) => e.id !== em.id);
                                    setServerEmojis(next);
                                    if (activeHub) {
                                      await communityApi.updateHub(activeHub.id, { emojis: next });
                                    }
                                    toast.success(t(`Emoji :${em.name}: dihapus`));
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Emoji Card */}
                      <div className="rounded-lg border bg-card/40 p-4 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Tambah Emoji Baru')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">{t('Nama Emoji')}</label>
                            <Input
                              value={newEmojiName}
                              onChange={(e) => setNewEmojiName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                              placeholder="cth: api_anticeil"
                              className="text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">{t('Karakter Emoji')}</label>
                            <Input
                              value={newEmojiChar}
                              onChange={(e) => setNewEmojiChar(e.target.value)}
                              placeholder="cth: 🚀 atau 🔥"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        {/* Quick pick emoji */}
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1.5 block">{t('Pilih Cepat')}</label>
                          <div className="flex gap-2">
                            {['🚀', '🔥', '🤖', '⚡', '🎉', '💡', '🏆', '💎', '🎯'].map((sym) => (
                              <button
                                key={sym}
                                type="button"
                                onClick={() => setNewEmojiChar(sym)}
                                className="w-8 h-8 rounded-md border bg-muted/40 hover:bg-muted flex items-center justify-center text-sm"
                              >
                                {sym}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Button
                          type="button"
                          disabled={!newEmojiName.trim() || !newEmojiChar.trim()}
                          onClick={async () => {
                            if (!newEmojiName.trim() || !newEmojiChar.trim() || !activeHub) return;
                            const newEm: CommunityCustomEmoji = {
                              id: `emoji_${Date.now()}`,
                              name: newEmojiName.trim(),
                              char: newEmojiChar.trim(),
                            };
                            const next = [...serverEmojis, newEm];
                            setServerEmojis(next);
                            setNewEmojiName('');
                            setNewEmojiChar('');
                            await communityApi.updateHub(activeHub.id, { emojis: next });
                            toast.success(t(`Emoji :${newEm.name}: berhasil ditambahkan! ✨`));
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          {t('Tambah ke Server')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. ANGGOTA (MEMBERS) */}
                {serverSettingsSection === 'members' && (
                  <div>
                    <h2 className="text-xl font-bold mb-1">{t('Anggota Server')}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{t('Kelola hak akses peran, keluarkan, atau blokir anggota server.')}</p>

                    {/* Search & Filter */}
                    <div className="relative mb-4">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Cari nama atau email anggota..."
                        className="pl-9 text-xs"
                      />
                    </div>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {members.filter((m) =>
                        !memberSearchQuery ||
                        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                      ).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">{t('Tidak ada anggota yang cocok.')}</p>
                      ) : (
                        members
                          .filter((m) =>
                            !memberSearchQuery ||
                            m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                            m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                          )
                          .map((m) => {
                            const isMe = m.id === currentUser?.id || m.email === currentUser?.email;
                            return (
                              <div
                                key={m.id}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border bg-card/40 hover:bg-muted/40 transition-colors"
                              >
                                <CommunityAvatar name={m.name} imageUrl={m.avatar} size={32} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-medium truncate">{m.name}</p>
                                    {isMe && <Badge variant="secondary" className="text-[9px] py-0 px-1">{t('Anda')}</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                </div>

                                {/* Role dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs capitalize gap-1">
                                      {m.role}
                                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {(['owner', 'admin', 'moderator', 'member'] as const).map((r) => (
                                      <DropdownMenuItem
                                        key={r}
                                        onClick={async () => {
                                          if (!activeHub) return;
                                          setMembers((prev) => prev.map((item) => (item.id === m.id ? { ...item, role: r } : item)));
                                          await communityApi.updateMemberRole(activeHub.id, m.id, r);
                                          toast.success(t(`Peran ${m.name} diubah menjadi ${r}`));
                                        }}
                                        className="capitalize cursor-pointer"
                                      >
                                        {r}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Kick / Ban actions */}
                                {!isMe && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <X className="w-4 h-4 text-muted-foreground" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          if (!activeHub) return;
                                          setMembers((prev) => prev.filter((item) => item.id !== m.id));
                                          await communityApi.kickMember(activeHub.id, m.id);
                                          toast.success(t(`${m.name} dikeluarkan dari server`));
                                        }}
                                        className="text-red-500 cursor-pointer"
                                      >
                                        <UserX className="w-4 h-4 mr-2" />
                                        {t('Keluarkan (Kick)')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setBanTargetMember(m);
                                          setBanReasonInput('Melanggar aturan komunitas server');
                                          setIsBanningUser(true);
                                        }}
                                        className="text-red-600 cursor-pointer"
                                      >
                                        <Ban className="w-4 h-4 mr-2" />
                                        {t('Blokir (Ban)')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}

                {/* 7. PERAN (ROLES) */}
                {serverSettingsSection === 'roles' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold">{t('Peran & Izin')}</h2>
                      <Button
                        size="sm"
                        onClick={() => setIsCreatingRole(!isCreatingRole)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {isCreatingRole ? t('Batal') : t('Peran Baru')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">{t('Kelola peran dan hak akses anggota di server ini.')}</p>

                    {/* Create Role Form */}
                    {isCreatingRole && (
                      <div className="rounded-lg border bg-card/60 p-4 mb-6 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Buat Peran Baru')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">{t('Nama Peran')}</label>
                            <Input
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                              placeholder="cth: Moderator Utama, VIP..."
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1.5 block">{t('Warna Peran')}</label>
                            <div className="flex gap-2">
                              {['#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#64748b'].map((col) => (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => setNewRoleColor(col)}
                                  className={cn(
                                    "w-6 h-6 rounded-full border transition-transform",
                                    newRoleColor === col ? "scale-125 border-white ring-2 ring-primary" : "border-transparent"
                                  )}
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <Button
                          disabled={!newRoleName.trim()}
                          onClick={async () => {
                            if (!newRoleName.trim() || !activeHub) return;
                            const created = await communityApi.createRole(activeHub.id, {
                              name: newRoleName.trim(),
                              color: newRoleColor,
                            });
                            setServerRoles((prev) => [...prev, created]);
                            setNewRoleName('');
                            setIsCreatingRole(false);
                            toast.success(t(`Peran ${created.name} berhasil dibuat! 🛡️`));
                          }}
                          size="sm"
                        >
                          {t('Simpan Peran')}
                        </Button>
                      </div>
                    )}

                    {/* Roles List */}
                    <div className="space-y-2.5">
                      {serverRoles.map((role) => (
                        <div key={role.id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg border bg-card/40">
                          <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold capitalize">{role.name}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(role.permissions || ['SEND_MESSAGES']).map((perm) => (
                                <Badge key={perm} variant="outline" className="text-[9px] py-0 px-1 font-normal text-muted-foreground">
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {members.filter((m) => m.role === role.name.toLowerCase()).length} {t('anggota')}
                          </Badge>
                          {role.name.toLowerCase() !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                if (!activeHub) return;
                                setServerRoles((prev) => prev.filter((r) => r.id !== role.id));
                                await communityApi.deleteRole(activeHub.id, role.id);
                                toast.success(t(`Peran ${role.name} dihapus`));
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. UNDANGAN (INVITES) */}
                {serverSettingsSection === 'invites' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold">{t('Link Undangan')}</h2>
                      <Button size="sm" onClick={() => setIsCreatingInvite(!isCreatingInvite)}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {isCreatingInvite ? t('Batal') : t('Buat Link Baru')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">{t('Kelola semua tautan undangan ke server ini.')}</p>

                    {/* Active URL Card */}
                    <div className="rounded-lg border bg-card/40 p-4 mb-6">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('Link Undangan Utama')}</p>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`${window.location.origin}/messages?invite=${activeHub?.inviteCode || activeHub?.id}`}
                          className="text-xs font-mono"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/messages?invite=${activeHub?.inviteCode || activeHub?.id}`);
                            toast.success(t('Link undangan disalin! 📋'));
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Create New Invite Form */}
                    {isCreatingInvite && (
                      <div className="rounded-lg border bg-card/60 p-4 mb-6 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Buat Link Undangan Kustom')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">{t('Masa Berlaku')}</label>
                            <select
                              value={newInviteExpiry}
                              onChange={(e: any) => setNewInviteExpiry(e.target.value)}
                              className="w-full text-xs rounded-md border bg-background px-3 py-2"
                            >
                              <option value="1d">{t('24 Jam')}</option>
                              <option value="7d">{t('7 Hari')}</option>
                              <option value="30d">{t('30 Hari')}</option>
                              <option value="never">{t('Tanpa Batas Waktu')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">{t('Maksimal Penggunaan')}</label>
                            <select
                              value={newInviteMaxUses}
                              onChange={(e: any) => setNewInviteMaxUses(Number(e.target.value))}
                              className="w-full text-xs rounded-md border bg-background px-3 py-2"
                            >
                              <option value={0}>{t('Tanpa Batas Penggunaan')}</option>
                              <option value={1}>1 {t('Penggunaan')}</option>
                              <option value={5}>5 {t('Penggunaan')}</option>
                              <option value={25}>25 {t('Penggunaan')}</option>
                            </select>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!activeHub) return;
                            const expiryDate =
                              newInviteExpiry === 'never'
                                ? null
                                : new Date(Date.now() + (newInviteExpiry === '1d' ? 86400000 : newInviteExpiry === '7d' ? 7 * 86400000 : 30 * 86400000)).toISOString();
                            const inv = await communityApi.createInvite(activeHub.id, {
                              maxUses: newInviteMaxUses,
                              expiresAt: expiryDate,
                            });
                            setServerInvites((prev) => [inv, ...prev]);
                            setIsCreatingInvite(false);
                            toast.success(t(`Link undangan baru dibuat: ${inv.code} 🎉`));
                          }}
                        >
                          {t('Buat Tautan')}
                        </Button>
                      </div>
                    )}

                    {/* Invites list */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Daftar Tautan Undangan Aktif')}</p>
                      {serverInvites.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">{t('Belum ada tautan undangan kustom.')}</p>
                      ) : (
                        serverInvites.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/40 text-xs">
                            <div>
                              <p className="font-mono font-semibold text-primary">{inv.code}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {t('Dibuat oleh')} {inv.inviterName || 'Admin'} • {inv.uses} {t('digunakan')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/messages?invite=${inv.code}`);
                                  toast.success(t('Tautan undangan disalin! 📋'));
                                }}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                {t('Salin')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={async () => {
                                  if (!activeHub) return;
                                  setServerInvites((prev) => prev.filter((i) => i.id !== inv.id));
                                  await communityApi.revokeInvite(activeHub.id, inv.id);
                                  toast.success(t('Tautan undangan berhasil dibatalkan'));
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 9. INTEGRASI */}
                {serverSettingsSection === 'integrations' && (
                  <div>
                    <h2 className="text-xl font-bold mb-1">{t('Integrasi & Automasi')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t('Kelola bot, webhook, dan alur automasi Activepieces yang terhubung ke server ini.')}
                    </p>

                    <div className="space-y-4">
                      {/* Webhook Card */}
                      <div className="rounded-lg border bg-card/40 p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <Webhook className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{t('Incoming Webhooks')}</p>
                              <p className="text-xs text-muted-foreground">{t('Kirim pesan otomatis via HTTP POST dari automasi luar.')}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsServerSettingsOpen(false);
                              setIsWebhookDialogOpen(true);
                            }}
                          >
                            {t('Buka Panel Webhook')}
                          </Button>
                        </div>

                        <div className="rounded bg-muted/50 p-2.5 flex items-center justify-between text-xs font-mono">
                          <span className="truncate pr-2">{`${window.location.origin}/api/v1/community/webhook?hubId=${activeHub?.id}`}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/v1/community/webhook?hubId=${activeHub?.id}`);
                              toast.success(t('URL Webhook disalin! 📋'));
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            {t('Salin')}
                          </Button>
                        </div>
                      </div>

                      {/* Connected Bots */}
                      <div className="rounded-lg border bg-card/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-primary" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Bot & Aplikasi Terhubung')}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={async () => {
                              if (!activeHub) return;
                              await communityApi.testWebhook({
                                hubId: activeHub.id,
                                botName: 'Anticeil Integration Assistant',
                                content: `Halo! Integrasi automasi server #${activeHub.name} berjalan dengan normal. 🤖✨`,
                              });
                              toast.success(t('Pesan tes bot berhasil dikirim ke saluran! 🚀'));
                            }}
                          >
                            <Send className="w-3 h-3 mr-1.5" />
                            {t('Tes Bot')}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {[
                            { name: 'Anticeil Automation Bot', desc: 'Memproses triggers workflow Activepieces ke chat', status: 'Online', badge: 'bg-emerald-500' },
                            { name: 'Webhook Ingestion Assistant', desc: 'Menerima alert & webhook dari sistem eksternal', status: 'Aktif', badge: 'bg-blue-500' },
                          ].map((b, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-md border bg-background/50 text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                                  <Bot className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium">{b.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{b.desc}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className={cn("w-2 h-2 rounded-full", b.badge)} />
                                {b.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. LOG AUDIT */}
                {serverSettingsSection === 'audit-log' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold">{t('Log Audit')}</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!activeHub) return;
                          const logs = await communityApi.getAuditLog(activeHub.id);
                          setServerAuditLogs(logs);
                          toast.success(t('Log audit dimuat ulang! 📜'));
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {t('Segarkan')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{t('Riwayat tindakan administratif dan perubahan di server ini.')}</p>

                    {/* Filter tabs */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {['ALL', 'HUB', 'MEMBER', 'ROLE', 'INVITE'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setAuditLogFilter(f)}
                          className={cn(
                            "px-2.5 py-1 rounded text-xs transition-colors",
                            auditLogFilter === f
                              ? "bg-primary text-primary-foreground font-medium"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {f === 'ALL' ? t('Semua') : f === 'HUB' ? t('Server') : f === 'MEMBER' ? t('Anggota') : f === 'ROLE' ? t('Peran') : t('Undangan')}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {serverAuditLogs
                        .filter((log) => {
                          if (auditLogFilter === 'ALL') return true;
                          if (auditLogFilter === 'HUB') return log.action.includes('HUB') || log.action.includes('BOOST');
                          if (auditLogFilter === 'MEMBER') return log.action.includes('MEMBER');
                          if (auditLogFilter === 'ROLE') return log.action.includes('ROLE');
                          if (auditLogFilter === 'INVITE') return log.action.includes('INVITE');
                          return true;
                        })
                        .map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/40 text-xs">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              {log.action.includes('MEMBER') ? (
                                <Users className="w-3.5 h-3.5 text-blue-400" />
                              ) : log.action.includes('ROLE') ? (
                                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                              ) : log.action.includes('BOOST') ? (
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                              ) : log.action.includes('BAN') ? (
                                <Ban className="w-3.5 h-3.5 text-red-400" />
                              ) : (
                                <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground">
                                {log.actorName}{' '}
                                <span className="font-normal text-muted-foreground">
                                  {log.action === 'HUB_CREATED' ? t('membuat server') :
                                   log.action === 'HUB_UPDATED' ? t('memperbarui profil server') :
                                   log.action === 'SERVER_BOOST' ? t('melakukan server boost') :
                                   log.action === 'MEMBER_ROLE_CHANGE' ? t('mengubah peran anggota') :
                                   log.action === 'MEMBER_KICK' ? t('mengeluarkan anggota') :
                                   log.action === 'MEMBER_BAN' ? t('memblokir anggota') :
                                   log.action === 'MEMBER_UNBAN' ? t('membatalkan blokir') :
                                   log.action === 'ROLE_CREATED' ? t('membuat peran baru') :
                                   log.action === 'ROLE_DELETED' ? t('menghapus peran') :
                                   log.action === 'INVITE_CREATE' ? t('membuat link undangan') :
                                   log.action === 'INVITE_REVOKE' ? t('membatalkan link undangan') :
                                   log.action}
                                </span>{' '}
                                {log.targetName && <span className="font-semibold text-primary">{log.targetName}</span>}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {dayjs(log.createdAt).format('DD MMM YYYY, HH:mm')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-mono">
                              {log.action}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 11. BAN */}
                {serverSettingsSection === 'bans' && (
                  <div>
                    <h2 className="text-xl font-bold mb-1">{t('Pengguna Diblokir')}</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t('Daftar pengguna yang telah diblokir dari server ini. Pengguna diblokir tidak dapat melihat atau bergabung ke saluran.')}
                    </p>

                    <div className="space-y-2">
                      {serverBans.length === 0 ? (
                        <div className="rounded-lg border bg-card/40 p-8 text-center">
                          <Ban className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                          <p className="text-sm font-medium">{t('Tidak ada pengguna yang diblokir')}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t('Komunitas Anda bersih dan tertib! ✨')}</p>
                        </div>
                      ) : (
                        serverBans.map((ban) => (
                          <div key={ban.id} className="flex items-center justify-between p-3.5 rounded-lg border bg-card/40 text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                <Ban className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{ban.userName}</p>
                                <p className="text-muted-foreground text-[11px]">
                                  {t('Alasan')}: {ban.reason || t('Melanggar aturan')} • {dayjs(ban.createdAt).format('DD MMM YYYY')}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!activeHub) return;
                                setServerBans((prev) => prev.filter((b) => b.userId !== ban.userId));
                                await communityApi.unbanUser(activeHub.id, ban.userId);
                                toast.success(t(`Blokir untuk ${ban.userName} telah dibatalkan! ✅`));
                              }}
                            >
                              {t('Batal Blokir')}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: EDIT SERVER (Hub CRUD: Update) */}
        <Dialog open={!!hubToEdit} onOpenChange={(open) => !open && setHubToEdit(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleEditHubSubmit}>
              <DialogHeader>
                <DialogTitle>{t('Ganti Nama Server')}</DialogTitle>
                <DialogDescription>
                  {t('Perbarui nama dan deskripsi server atau workspace ini.')}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold">{t('Nama Server')}</label>
                  <Input
                    value={editHubName}
                    onChange={(e) => setEditHubName(e.target.value)}
                    placeholder="Nama server..."
                    className="text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold">{t('Deskripsi (Opsional)')}</label>
                  <Input
                    value={editHubDesc}
                    onChange={(e) => setEditHubDesc(e.target.value)}
                    placeholder="Deskripsi server..."
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHubToEdit(null)}
                >
                  {t('Batal')}
                </Button>
                <Button type="submit">
                  {t('Simpan Perubahan')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG: DELETE SERVER (Hub CRUD: Delete) */}
        <Dialog open={!!hubToDelete} onOpenChange={(open) => !open && setHubToDelete(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-red-500">{t('Hapus Server?')}</DialogTitle>
              <DialogDescription>
                {t(
                  'Apakah Anda yakin ingin menghapus server "{{name}}"? Semua channel dan riwayat pesan di server ini akan dihapus.',
                  { name: hubToDelete?.name },
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setHubToDelete(null)}
              >
                {t('Batal')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteHubConfirm}
              >
                {t('Hapus Server')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: BAN MEMBER */}
        <Dialog open={isBanningUser} onOpenChange={setIsBanningUser}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-500 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                {t('Blokir Anggota dari Server')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'Apakah Anda yakin ingin memblokir {{name}}? Pengguna ini akan dikeluarkan dan tidak dapat bergabung kembali menggunakan link undangan.',
                  { name: banTargetMember?.name },
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <label className="text-xs font-semibold text-muted-foreground">{t('Alasan Pemblokiran')}</label>
              <Input
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="cth: Melanggar aturan komunitas / spam..."
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsBanningUser(false);
                  setBanTargetMember(null);
                }}
              >
                {t('Batal')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!activeHub || !banTargetMember) return;
                  const banned = await communityApi.banUser(activeHub.id, {
                    userId: banTargetMember.id,
                    userName: banTargetMember.name,
                    userEmail: banTargetMember.email,
                    reason: banReasonInput,
                  });
                  setServerBans((prev) => [banned, ...prev]);
                  setMembers((prev) => prev.filter((m) => m.id !== banTargetMember.id));
                  setIsBanningUser(false);
                  setBanTargetMember(null);
                  toast.success(t(`${banTargetMember.name} telah diblokir dari server 🚫`));
                }}
              >
                {t('Blokir & Keluarkan')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: INTEGRASI WEBHOOK & ID SALURAN (Ala Discord) */}
        <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
          <DialogContent className="sm:max-w-[540px]">
            {(() => {
              const effectiveChannel = activeChannel || (hubChannels.length > 0 ? hubChannels[0] : null);
              const serverId = activeHub?.id || 'anticeil';
              const channelId = effectiveChannel?.id || '';
              const channelName = effectiveChannel?.name || 'saluran';
              const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://anticeil.com'}/api/v1/community/webhook?channelId=${channelId || 'general'}&hubId=${serverId}`;

              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Webhook className="w-4 h-4" />
                      </div>
                      <div>
                        <DialogTitle className="text-base flex items-center gap-1.5">
                          {t('Integrasi Webhook Bot')}
                          {effectiveChannel && (
                            <span className="text-muted-foreground font-normal text-xs">
                              #{channelName}
                            </span>
                          )}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Hubungkan automasi Flow Builder atau bot eksternal ke saluran Anticeil Chat ini.
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    {!effectiveChannel ? (
                      /* Empty state: No channel in server */
                      <div className="py-6 px-4 text-center rounded-lg border border-dashed border-border/80 bg-muted/20 space-y-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                          <Hash className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Belum Ada Saluran di Server Ini</h4>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            Webhook memerlukan channel target untuk menerima pesan. Buat saluran pertama Anda terlebih dahulu.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsWebhookDialogOpen(false);
                            setIsCreateChannelOpen(true);
                          }}
                          className="gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          Buat Saluran Pertama
                        </Button>

                        <div className="pt-2 text-left border-t border-border/40">
                          <label className="text-xs font-semibold text-muted-foreground block mb-1">
                            ID Server Saat Ini (Hub ID)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <Input
                              readOnly
                              value={serverId}
                              className="font-mono text-[11px] bg-muted/40 select-all h-8"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(serverId);
                                setIsCopiedHubId(true);
                                setTimeout(() => setIsCopiedHubId(false), 2000);
                              }}
                            >
                              {isCopiedHubId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Channel selector if server has multiple channels */}
                        {hubChannels.length > 1 && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Hash className="w-3.5 h-3.5" />
                              Pilih Saluran Target Webhook
                            </label>
                            <select
                              value={channelId}
                              onChange={(e) => setActiveChannelId(e.target.value)}
                              className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {hubChannels.map((c) => (
                                <option key={c.id} value={c.id}>
                                  #{c.name} {c.description ? `— ${c.description}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* 1. Full Webhook URL */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold flex items-center justify-between">
                            <span>URL Webhook Masuk</span>
                            <Badge variant="outline" className="text-[10px] text-primary bg-primary/5">
                              Otomatis
                            </Badge>
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={webhookUrl}
                              className="font-mono text-[11px] bg-muted/40 select-all"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant={isCopiedWebhook ? 'default' : 'outline'}
                              className="shrink-0 h-9 px-3 gap-1.5 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(webhookUrl);
                                setIsCopiedWebhook(true);
                                setTimeout(() => setIsCopiedWebhook(false), 2000);
                              }}
                            >
                              {isCopiedWebhook ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                  Tersalin
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Salin URL
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Tempel URL ini pada field <strong>Webhook URL</strong> di Flow Builder atau piece Anticeil Chat.
                          </p>
                        </div>

                        {/* 2. Direct IDs: Channel ID & Server/Hub ID */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">
                              ID Saluran (Channel ID)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <Input
                                readOnly
                                value={channelId}
                                className="font-mono text-[11px] bg-muted/40 select-all h-8"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 shrink-0"
                                onClick={() => {
                                  if (channelId) {
                                    navigator.clipboard.writeText(channelId);
                                    setIsCopiedChannelId(true);
                                    setTimeout(() => setIsCopiedChannelId(false), 2000);
                                  }
                                }}
                              >
                                {isCopiedChannelId ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">
                              ID Server (Hub ID)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <Input
                                readOnly
                                value={serverId}
                                className="font-mono text-[11px] bg-muted/40 select-all h-8"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 shrink-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(serverId);
                                  setIsCopiedHubId(true);
                                  setTimeout(() => setIsCopiedHubId(false), 2000);
                                }}
                              >
                                {isCopiedHubId ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* 3. Testing Section */}
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              <span>Uji Coba Pengiriman Bot</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isTestingWebhook}
                              onClick={async () => {
                                setIsTestingWebhook(true);
                                try {
                                  await communityApi.testWebhook({
                                    channelId,
                                    channel: channelName,
                                    hubId: serverId,
                                    botName: 'Anticeil Ping Bot',
                                    content: `👋 **Tes Webhook Berhasil!** Terkoneksi ke saluran **#${channelName}** (ID Server: \`${serverId}\`). Automasi Flow Builder Anda siap mengirim pesan ke sini! 🚀`,
                                  });
                                  toast.success(`Pesan tes bot berhasil dikirim ke #${channelName} 🚀`);
                                } catch (err) {
                                  console.error('Failed to test webhook', err);
                                  toast.error('Gagal mengirim pesan tes webhook');
                                } finally {
                                  setIsTestingWebhook(false);
                                }
                              }}
                              className="h-7 text-xs px-2.5 gap-1.5"
                            >
                              {isTestingWebhook ? (
                                <Clock className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              {isTestingWebhook ? 'Mengirim...' : 'Kirim Pesan Tes'}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Kirim pesan simulasi bot langsung ke saluran <strong>#{channelName}</strong> untuk memastikan webhook terhubung.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsWebhookDialogOpen(false)}
                    >
                      {t('Tutup')}
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* DIALOG: BUAT CHANNEL BARU (Channel CRUD: Create) */}
        <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateChannelSubmit}>
              <DialogHeader>
                <DialogTitle>{t('Buat Channel Baru')}</DialogTitle>
                <DialogDescription>
                  Tambahkan ruang diskusi baru untuk tim dan komunitas Anticeil.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold">Nama Channel</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="contoh: tips-otomasi"
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold">Deskripsi / Topik</label>
                  <Input
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    placeholder="Ruang diskusi untuk..."
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateChannelOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">
                  Buat Channel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG: EDIT CHANNEL (Channel CRUD: Update) */}
        <Dialog open={!!channelToEdit} onOpenChange={(open) => !open && setChannelToEdit(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleEditChannelSubmit}>
              <DialogHeader>
                <DialogTitle>{t('Edit Channel')}</DialogTitle>
                <DialogDescription>
                  Perbarui nama dan deskripsi topik channel.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold">Nama Channel</label>
                  <Input
                    value={editChannelName}
                    onChange={(e) => setEditChannelName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold">Deskripsi</label>
                  <Input
                    value={editChannelDesc}
                    onChange={(e) => setEditChannelDesc(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChannelToEdit(null)}
                >
                  Batal
                </Button>
                <Button type="submit">
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG: DELETE CHANNEL (Channel CRUD: Delete) */}
        <Dialog open={!!channelToDelete} onOpenChange={(open) => !open && setChannelToDelete(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-red-500">{t('Hapus Channel?')}</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus channel #{channelToDelete?.name}? Semua pesan di dalamnya akan terhapus permanen.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setChannelToDelete(null)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteChannelConfirm}
              >
                Hapus Channel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: DM SEARCH (Discord-style "Find or start a conversation") */}
        <Dialog open={isDmSearchOpen} onOpenChange={setIsDmSearchOpen}>
          <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('Cari atau mulai percakapan')}</DialogTitle>
              <DialogDescription>{t('Cari anggota atau channel untuk memulai percakapan.')}</DialogDescription>
            </DialogHeader>

            {/* Search Input */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={dmSearchQuery}
                  onChange={(e) => setDmSearchQuery(e.target.value)}
                  placeholder={t('Mau pergi ke mana?')}
                  className="pl-9 text-sm bg-transparent border-none shadow-none focus-visible:ring-0 h-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto [scrollbar-width:thin]">
              {(() => {
                const q = dmSearchQuery.trim().toLowerCase();

                // Existing DM channels
                const filteredDms = dmChannels.filter((dm) =>
                  !q || dm.name.toLowerCase().includes(q),
                );

                // Members not yet in DM (excluding self)
                const filteredMembers = members.filter((m) => {
                  if (m.id === currentUser?.id) return false;
                  const hasDm = dmChannels.some((dm) => dm.id === `dm-${m.id}`);
                  if (hasDm) return false;
                  return !q || m.name.toLowerCase().includes(q);
                });

                const hasResults = filteredDms.length > 0 || filteredMembers.length > 0;

                if (!hasResults) {
                  return (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {t('Tidak ada hasil ditemukan.')}
                    </div>
                  );
                }

                return (
                  <div className="py-1">
                    {/* Existing DM Channels */}
                    {filteredDms.length > 0 && (
                      <div>
                        <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                          {t('Percakapan Sebelumnya')}
                        </div>
                        {filteredDms.map((dm) => {
                          const member = members.find((m) => `dm-${m.id}` === dm.id);
                          return (
                            <button
                              key={dm.id}
                              onClick={() => {
                                setActiveHubId('anticeil');
                                setActiveChannelId(dm.id);
                                setIsDmSearchOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-accent transition-colors"
                            >
                              {member ? (
                                <CommunityAvatar
                                  name={member.name}
                                  imageUrl={member.avatar}
                                  size={28}
                                  status={member.status}
                                  showStatus
                                />
                              ) : (
                                <div className="size-7 rounded-full bg-muted flex items-center justify-center">
                                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium truncate text-foreground">{dm.name}</span>
                                {member?.customStatus && (
                                  <span className="text-[10px] text-muted-foreground truncate">{member.customStatus}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* New DM - members without existing conversation */}
                    {filteredMembers.length > 0 && (
                      <div>
                        <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                          {t('Mulai Percakapan Baru')}
                        </div>
                        {filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              handleStartDM(member);
                              setIsDmSearchOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-accent transition-colors"
                          >
                            <CommunityAvatar
                              name={member.name}
                              imageUrl={member.avatar}
                              size={28}
                              status={member.status}
                              showStatus
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium truncate text-foreground">{member.name}</span>
                              {member.customStatus && (
                                <span className="text-[10px] text-muted-foreground truncate">{member.customStatus}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer tip */}
            <div className="px-4 py-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                <span className="text-primary font-semibold">Tip:</span> {t('Ketik nama anggota untuk mencari dan memulai percakapan langsung.')}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
        {/* Hub Invite Dialog (Discord-Style: Search & Invite by Username + Share Link) */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <UserPlus className="w-5 h-5 text-primary" />
                {t('Undang Teman ke')} {activeHub?.name || 'Server'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('Undang langsung menggunakan username atau bagikan link undangan server.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Form 1: Invite by Username */}
              <form onSubmit={handleInviteByUsername} className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-primary" />
                    {t('Undang via Username')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t('Contoh: faiz, alex_99')}
                  </span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">@</span>
                    <Input
                      value={inviteUsername}
                      onChange={(e) => {
                        setInviteUsername(e.target.value);
                        if (userNotFound) setUserNotFound(null);
                      }}
                      placeholder="username"
                      className="pl-7 text-xs font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isInvitingUsername || !inviteUsername.trim()}
                    size="sm"
                    className="gap-1.5 shrink-0"
                  >
                    {isInvitingUsername ? (
                      <span className="text-xs">{t('Mencari...')}</span>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>{t('Undang')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Alert when username not found -> Immediate Share Link Callout */}
              {userNotFound && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-2 animate-in fade-in-50 duration-200">
                  <div className="flex items-start gap-2 text-amber-500 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{t('Pengguna')} @{userNotFound} {t('tidak ditemukan')}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    {t('Pengguna belum terdaftar di Anticeil. Bagikan link undangan di bawah ini langsung kepada mereka. Saat mereka mendaftar atau login via OAuth (Google / GitHub), sistem akan')} <strong className="text-foreground">{t('otomatis memasukkan mereka ke server ini')}</strong>!
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-xs gap-1.5 h-8 border-amber-500/40 hover:bg-amber-500/20 text-foreground"
                    onClick={() => {
                      const code = activeHub?.inviteCode || activeHub?.id;
                      const url = `${window.location.origin}/messages?invite=${code}`;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      toast.success(t('Link undangan berhasil disalin! 📋'));
                    }}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? t('Link Tersalin!') : t('Salin Link Undangan Otomatis')}</span>
                  </Button>
                </div>
              )}

              {/* Form 2: Share Link Undangan Server */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    {t('Tautan Undangan Server')}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {t('Tidak pernah kedaluwarsa')}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/messages?invite=${activeHub?.inviteCode || activeHub?.id}`}
                    className="text-xs font-mono bg-muted/40 select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => {
                      const code = activeHub?.inviteCode || activeHub?.id;
                      const url = `${window.location.origin}/messages?invite=${code}`;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      toast.success(t('Tautan undangan berhasil disalin! 📋'));
                    }}
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? t('Tersalin!') : t('Salin')}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {t('Kirim tautan ini ke calon anggota. Mereka yang login atau registrasi via tautan ini akan otomatis langsung bergabung.')}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsInviteOpen(false);
                  setUserNotFound(null);
                  setInviteUsername('');
                }}
              >
                {t('Selesai')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Profile & Identity Dialog (Display Name + Username with 14-day Cooldown) */}
        <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <AtSign className="w-5 h-5 text-primary" />
                {t('Profil & Identitas Akun')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('Kelola Nama Tampilan Anda dan Username unik untuk obrolan serta server.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Section 1: Display Name (Full Name) - Change anytime with rate limit */}
              <form onSubmit={handleSaveDisplayName} className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      {t('Nama Tampilan (Display Name)')}
                    </label>
                    <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {t('Bebas Diubah Kapan Saja')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Nama yang dilihat teman di server obrolan. Tidak perlu unik, bebas spasi & karakter.')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={editDisplayNameInput}
                    onChange={(e) => setEditDisplayNameInput(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    maxLength={100}
                    className="text-xs font-medium"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateNameMutation.isPending || !editDisplayNameInput.trim() || editDisplayNameInput.trim() === currentUserName}
                    className="shrink-0"
                  >
                    {updateNameMutation.isPending ? t('Menyimpan...') : t('Simpan')}
                  </Button>
                </div>
              </form>

              {/* Section 2: Unique Username (@handle) with 14-day Cooldown */}
              <form onSubmit={handleSaveUsername} className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{t('Username Unik')}</span>
                    </label>
                    <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {t('Cooldown 14 Hari')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Identifier unik sistem untuk mention (@username) dan undangan tanpa membocorkan email.')}
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">@</span>
                  <Input
                    value={editUsernameInput}
                    onChange={(e) => setEditUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username_anda"
                    disabled={isUsernameCooldownActive}
                    maxLength={32}
                    className="pl-7 text-xs font-mono"
                  />
                </div>

                {/* Cooldown Information / Warning Card */}
                {isUsernameCooldownActive ? (
                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-[11px]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('Cooldown Aktif')}</span>
                    </div>
                    <p className="text-muted-foreground text-[10px] leading-relaxed">
                      {t('Username dapat diubah kembali pada:')}{' '}
                      <strong className="text-foreground">
                        {dayjs(usernameCooldownEnd).format('DD MMMM YYYY, HH:mm')}
                      </strong>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {t('3-32 karakter: huruf kecil, angka, dan underscore (_).')}
                    </p>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        isUsernameCooldownActive ||
                        updateUsernameMutation.isPending ||
                        !editUsernameInput.trim() ||
                        editUsernameInput.trim() === currentUser?.username
                      }
                      className="shrink-0"
                    >
                      {updateUsernameMutation.isPending ? t('Menyimpan...') : t('Simpan Username')}
                    </Button>
                  </div>
                )}
              </form>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditProfileOpen(false)}
              >
                {t('Tutup')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Floating PiP Call Stage */}
        {activeCallChannelId && isCallPiP && (() => {
          const pipChannel = channels.find((c) => c.id === activeCallChannelId);
          if (!pipChannel) return null;
          return (
            <div className="fixed bottom-4 right-4 z-50 w-[380px] h-[260px] rounded-xl overflow-hidden shadow-2xl border border-border/80 bg-[#1e1f22] animate-in slide-in-from-bottom-4 fade-in">
              <CommunityCallStage
                channel={pipChannel}
                activeHub={activeHub}
                currentUser={currentUser}
                isPlusOrAbove={isPlusOrAbove}
                socket={socket}
                isCallActive={true}
                isPiP={true}
                isActivityOpen={isActivityOpen}
                onToggleActivity={(open) => setIsActivityOpen((prev) => (typeof open === 'boolean' ? open : !prev))}
                onTogglePiP={() => {
                  setActiveChannelId(activeCallChannelId);
                  setIsCallPiP(false);
                }}
                onEndCall={() => {
                  setActiveCallChannelId(null);
                  setIsActivityOpen(false);
                }}
                onNavigateToBilling={() => navigate('/platform/billing')}
              />
            </div>
          );
        })()}
    </LockedFeatureGuard>
  );
}
export { CommunityPage as MessagesPage };
export default CommunityPage;
