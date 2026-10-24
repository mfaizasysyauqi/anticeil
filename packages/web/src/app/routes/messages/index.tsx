import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Menu,
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';

import { useSocket } from '@/components/providers/socket-provider';
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
  const { data: currentUser } = userHooks.useCurrentUser();
  const { platform } = platformHooks.useCurrentPlatform();
  const socket = useSocket();

  const planName = (platform?.plan?.plan || 'free').toLowerCase();
  const isTeamOrEnterprise = planName.includes('team') || planName.includes('enterprise');
  const isPlusOrAbove = planName.includes('plus') || isTeamOrEnterprise;

  // Discord Hubs & Channels state
  const [hubs, setHubs] = useState<CommunityHub[]>(() => loadStoredHubs());
  const [activeHubId, setActiveHubId] = useState<CommunityHubId>('anticeil');

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

  const activeHub = useMemo(() => {
    return hubs.find((h) => h.id === activeHubId) || hubs[0];
  }, [hubs, activeHubId]);

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

  // Active channel resolution: Home prefers explicit activeChannelId (DM chat) or null (Friends page). Servers prefer activeChannelId or first hub channel.
  const activeChannel = useMemo(() => {
    if (channels.length === 0) return null;
    if (activeChannelId) {
      const current = channels.find((c) => c.id === activeChannelId);
      if (current) return current;
    }
    return isHome ? null : hubChannels[0] || null;
  }, [channels, activeChannelId, isHome, hubChannels]);

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

      const hubChannels = await communityApi.getChannels(createdHub.id);
      if (hubChannels && hubChannels.length > 0) {
        setChannels((prev) => [...prev.filter((c) => c.hubId !== createdHub.id), ...hubChannels]);
        setActiveChannelId(hubChannels[0].id);
      }

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

      const updatedHubs = [...hubs, newHub];
      setHubs(updatedHubs);
      saveStoredHubs(updatedHubs);
      setActiveHubId(newId);

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
                    'relative size-9 flex items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer shrink-0',
                    activeHubId === mainHub.id
                      ? 'rounded-[10px] bg-primary/20 text-primary border border-primary/40 shadow-xs shadow-primary/10'
                      : 'rounded-full bg-sidebar-accent text-sidebar-foreground hover:rounded-[10px] hover:bg-sidebar-accent/80',
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
                        if (firstCh && activeHubId !== hub.id) {
                          setActiveChannelId(firstCh.id);
                        }
                      }}
                      className={cn(
                        'relative size-9 flex items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer shrink-0',
                        isActive
                          ? 'rounded-[10px] bg-primary/20 text-primary border border-primary/40 shadow-xs shadow-primary/10'
                          : 'rounded-full bg-sidebar-accent text-sidebar-foreground hover:rounded-[10px] hover:bg-sidebar-accent/80',
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
                className="group relative size-9 rounded-full bg-sidebar-accent text-emerald-500 hover:rounded-[10px] hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
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
                className="group relative size-9 rounded-full bg-sidebar-accent text-muted-foreground hover:rounded-[10px] hover:bg-primary hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    const code = activeHub?.inviteCode || activeHub?.id;
                    const url = `${window.location.origin}/messages?invite=${code}`;
                    navigator.clipboard.writeText(url);
                    toast.success(t('Link undangan berhasil disalin! 📋'));
                  }}
                  className="text-primary font-medium focus:text-primary cursor-pointer"
                >
                  <Share2 className="w-4 h-4 mr-2" /> {t('Undang Orang (Salin Link)')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsCreateChannelOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> {t('Buat Channel Baru')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateHubOpen(true)}>
                  <Layers className="w-4 h-4 mr-2" /> {t('Buat Server Baru')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsWebhookDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <Webhook className="w-4 h-4 mr-2 text-primary" /> {t('Integrasi Webhook')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const serverId = activeHub?.id || 'anticeil';
                    navigator.clipboard.writeText(serverId);
                    toast.success(t(`ID Server disalin: ${serverId} 📋`));
                  }}
                  className="cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2" /> {t('Salin ID Server')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleOpenEditHub(activeHub)}>
                  <Edit2 className="w-4 h-4 mr-2" /> {t('Ganti Nama Server')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setHubToDelete(activeHub)}
                  className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> {t('Hapus Server')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/templates">
                    <ExternalLink className="w-4 h-4 mr-2" /> Jelajahi Marketplace
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Scroll Area: Home=DMs only, Server=Channels only */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 [scrollbar-width:thin]">
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

  // Component: User Footer Profile Dock across the entire left rail area (Discord layout)
  const renderUserBottomDock = () => (
    <div className="h-16 border-t border-sidebar-border px-2 flex items-center shrink-0 z-10 w-full select-none bg-sidebar">
      <div className="w-full h-11 px-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent/80 transition-colors flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1.5">
          <CommunityAvatar
            name={currentUserName}
            email={currentUser?.email}
            imageUrl={currentUser?.imageUrl}
            size={30}
            status="online"
            showStatus
            className="shrink-0"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                const fallback = currentUser?.email ? currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
                setEditDisplayNameInput(currentUserName);
                setEditUsernameInput(currentUser?.username || fallback);
                setIsEditProfileOpen(true);
              }}
              className="text-xs font-semibold truncate leading-tight text-foreground text-left hover:text-primary transition-colors flex items-center gap-1 group/name"
              title={t('Ubah nama tampilan atau username')}
            >
              <span className="truncate">{currentUserName}</span>
              <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/name:opacity-60 transition-opacity shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => {
                const fallback = currentUser?.email ? currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
                setEditDisplayNameInput(currentUserName);
                setEditUsernameInput(currentUser?.username || fallback);
                setIsEditProfileOpen(true);
              }}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono leading-none mt-0.5 truncate text-left flex items-center gap-1 group/user"
              title={t('Ubah nama tampilan atau username')}
            >
              <span className="truncate">
                {currentUser?.username || currentUser?.email
                  ? `@${currentUser?.username || currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`
                  : t('@atur_username')}
              </span>
              <Edit2 className="w-2 h-2 opacity-0 group-hover/user:opacity-60 transition-opacity shrink-0" />
            </button>
          </div>
        </div>

        {/* Discord Mic & Headphones */}
        <div className="flex items-center gap-0.5 text-muted-foreground shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="h-7 w-7 hover:text-foreground cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDeafened(!isDeafened)}
            className="h-7 w-7 hover:text-foreground cursor-pointer"
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <Headphones className={cn('w-3.5 h-3.5', isDeafened && 'text-red-400')} />
          </Button>
        </div>
      </div>
    </div>
  );

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
        <div className="h-12 border-b border-border/60 px-4 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3 min-w-0 overflow-x-auto [scrollbar-width:none]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileChannelsOpen(true)}
              className="lg:hidden h-8 w-8 -ml-1 text-muted-foreground shrink-0 cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

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
          <div className="hidden xl:flex flex-col w-80 border-l border-border/50 p-4 bg-background/30 shrink-0">
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
        {/* DESKTOP COMBINED LEFT SIDEBAR (Mini Hub Rail + Channels List + Full-width Bottom Dock) */}
        <div className="hidden lg:flex flex-col h-full shrink-0 border-r border-sidebar-border bg-sidebar select-none w-[284px] overflow-hidden">
          {/* Top section: Split Rail + Channels */}
          <div className="flex flex-1 min-h-0 w-full overflow-hidden">
            {renderDiscordHubRail()}
            <div className="flex-1 min-w-0 h-full flex flex-col">
              {renderChannelsSidebarContent()}
            </div>
          </div>
          {/* Bottom Dock: Spans across both Rail & Channels */}
          {renderUserBottomDock()}
        </div>

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
            {renderUserBottomDock()}
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
          {/* Channel Top Header Bar: NON-SCROLLABLE APP BAR */}
          <div className="h-12 border-b border-border/60 px-4 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-xs z-10">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileChannelsOpen(true)}
                className="lg:hidden h-8 w-8 -ml-1 text-muted-foreground mr-1"
                title="Buka Menu Channel"
              >
                <Menu className="w-5 h-5" />
              </Button>

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

            {/* Top Bar Actions: Webhook Integrations, Members Toggle & Search */}
            <div className="flex items-center gap-2">
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
          <div className="h-16 border-t border-border/40 px-4 flex items-center shrink-0 bg-background/90 backdrop-blur-xs z-10">
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
    </LockedFeatureGuard>
  );
}
export { CommunityPage as MessagesPage };
export default CommunityPage;
