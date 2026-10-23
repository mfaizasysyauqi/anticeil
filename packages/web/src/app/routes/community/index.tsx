import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useSocket } from '@/components/providers/socket-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { userHooks } from '@/hooks/user-hooks';
import { cn } from '@/lib/utils';

import { CommunityAvatar } from './community-avatar';
import {
  DEFAULT_CHANNELS,
  DEFAULT_MEMBERS,
  loadStoredChannels,
  loadStoredMessages,
  saveStoredMessages,
} from './community-data';
import {
  CommunityAttachment,
  CommunityChannel,
  CommunityMember,
  CommunityMessage,
  CommunityRole,
} from './community-types';

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
    price: 'Rp 299.000',
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
  const socket = useSocket();

  const [channels, setChannels] = useState<CommunityChannel[]>(() => loadStoredChannels());
  const [activeChannelId, setActiveChannelId] = useState<string>('umum');
  const [messagesMap, setMessagesMap] = useState<Record<string, CommunityMessage[]>>(() =>
    loadStoredMessages(),
  );
  const [inputText, setInputText] = useState('');
  const [stagedAttachment, setStagedAttachment] = useState<CommunityAttachment | null>(null);
  const [showMemberList, setShowMemberList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState(false);

  // Responsive state for Mobile/Tablet sheets
  const [isMobileChannelsOpen, setIsMobileChannelsOpen] = useState(false);
  const [isMobileMembersOpen, setIsMobileMembersOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active channel
  const activeChannel =
    channels.find((c) => c.id === activeChannelId) || channels[0] || DEFAULT_CHANNELS[0];

  // Active messages
  const currentMessages = messagesMap[activeChannel.id] || [];

  // Filtered messages
  const filteredMessages = searchQuery.trim()
    ? currentMessages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : currentMessages;

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChannelId, currentMessages.length]);

  // WebSocket realtime listener
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (newMsg: CommunityMessage) => {
      setMessagesMap((prev) => {
        const list = prev[newMsg.channelId] || [];
        if (list.some((m) => m.id === newMsg.id)) return prev;
        const updated = {
          ...prev,
          [newMsg.channelId]: [...list, newMsg],
        };
        saveStoredMessages(updated);
        return updated;
      });
    };

    socket.on('COMMUNITY_CHAT_MESSAGE', handleIncomingMessage);
    return () => {
      socket.off('COMMUNITY_CHAT_MESSAGE', handleIncomingMessage);
    };
  }, [socket]);

  // Send message
  const handleSendMessage = () => {
    if (!inputText.trim() && !stagedAttachment) return;

    const currentUserId = currentUser?.id || 'anon-user';
    const currentUserName =
      `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
      currentUser?.email?.split('@')[0] ||
      'Pengguna Anticeil';

    const newMessage: CommunityMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channelId: activeChannel.id,
      senderId: currentUserId,
      senderName: currentUserName,
      senderEmail: currentUser?.email || 'user@anticeil.com',
      senderAvatar: currentUser?.imageUrl ?? null,
      senderRole: (currentUser?.platformRole === 'ADMIN' ? 'admin' : 'creator') as CommunityRole,
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
      attachments: stagedAttachment ? [stagedAttachment] : undefined,
      reactions: {},
    };

    setMessagesMap((prev) => {
      const list = prev[activeChannel.id] || [];
      const updated = {
        ...prev,
        [activeChannel.id]: [...list, newMessage],
      };
      saveStoredMessages(updated);
      return updated;
    });

    // Broadcast through socket if available
    if (socket && socket.connected) {
      socket.emit('COMMUNITY_CHAT_MESSAGE', newMessage);
    }

    setInputText('');
    setStagedAttachment(null);
  };

  // Handle reaction
  const handleToggleReaction = (msgId: string, emoji: string) => {
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

      const updated = {
        ...prev,
        [activeChannel.id]: updatedList,
      };
      saveStoredMessages(updated);
      return updated;
    });
  };

  // Start DM with member
  const handleStartDM = (member: CommunityMember) => {
    const dmId = `dm-${member.id}`;
    const existing = channels.find((c) => c.id === dmId);
    if (!existing) {
      const newDMChannel: CommunityChannel = {
        id: dmId,
        name: member.name,
        description: `Percakapan langsung dengan ${member.name} (${member.customStatus || member.role})`,
        category: 'DIRECT MESSAGES',
        isDirectMessage: true,
        dmUserId: member.id,
      };
      const updatedChannels = [...channels, newDMChannel];
      setChannels(updatedChannels);
    }
    setActiveChannelId(dmId);
    setIsMobileChannelsOpen(false);
    setIsMobileMembersOpen(false);
  };

  // Handle file select simulation / staging
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
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

  // Role Badge Helper
  const renderRoleBadge = (role: CommunityRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border-red-500/20 text-[10px] px-1.5 py-0 uppercase font-semibold gap-1">
            <Shield className="w-2.5 h-2.5" /> Staff
          </Badge>
        );
      case 'creator':
        return (
          <Badge className="bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border-purple-500/20 text-[10px] px-1.5 py-0 uppercase font-semibold gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Creator
          </Badge>
        );
      case 'pro':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/20 text-[10px] px-1.5 py-0 uppercase font-semibold gap-1">
            <Crown className="w-2.5 h-2.5" /> Pro
          </Badge>
        );
      default:
        return null;
    }
  };

  const channelList = channels.filter((c) => c.category === 'CHANNELS');
  const dmList = channels.filter((c) => c.category === 'DIRECT MESSAGES');

  const currentUserName =
    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
    currentUser?.email?.split('@')[0] ||
    'Pengguna Anticeil';

  // Component: Channels Sidebar Content (reusable for desktop & mobile drawer)
  const renderChannelsSidebarContent = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full bg-sidebar select-none">
      {/* Server Header */}
      <div className="h-12 border-b border-sidebar-border px-3.5 flex items-center justify-between font-semibold shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            AC
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold truncate tracking-tight">Anticeil Hub</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Server Online" />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => {
                setActiveChannelId('umum');
                onItemClick?.();
              }}
            >
              <Hash className="w-4 h-4 mr-2" /> Channel Umum
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setActiveChannelId('showcase-template');
                onItemClick?.();
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" /> Showcase Template
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setActiveChannelId('jual-beli-template');
                onItemClick?.();
              }}
            >
              <Layers className="w-4 h-4 mr-2" /> Jual Beli Template
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/templates">
                <ExternalLink className="w-4 h-4 mr-2" /> Jelajahi Marketplace
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Channels & DMs Scroll Area */}
      <ScrollArea className="flex-1 px-2 py-3">
        {/* Section CHANNELS */}
        <div className="mb-4">
          <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground/80 tracking-wider uppercase">
            <span>{t('Channels Komunitas')}</span>
            <span className="text-[10px] text-muted-foreground/60">{channelList.length}</span>
          </div>

          <div className="space-y-0.5">
            {channelList.map((ch) => {
              const isActive = activeChannelId === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannelId(ch.id);
                    onItemClick?.();
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left group',
                    isActive
                      ? 'bg-accent text-accent-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Hash
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground',
                    )}
                  />
                  <span className="truncate flex-1">{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator className="my-2 bg-sidebar-border/60" />

        {/* Section DIRECT MESSAGES */}
        <div>
          <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground/80 tracking-wider uppercase">
            <span>{t('Direct Messages')}</span>
            <span className="text-[10px] text-muted-foreground/60">{dmList.length}</span>
          </div>

          {dmList.length === 0 ? (
            <div className="px-2.5 py-2 text-[11px] text-muted-foreground/60 leading-relaxed">
              Pilih anggota di panel kanan untuk memulai chat pribadi.
            </div>
          ) : (
            <div className="space-y-0.5">
              {dmList.map((dm) => {
                const isActive = activeChannelId === dm.id;
                const member = DEFAULT_MEMBERS.find((m) => `dm-${m.id}` === dm.id);
                return (
                  <button
                    key={dm.id}
                    onClick={() => {
                      setActiveChannelId(dm.id);
                      onItemClick?.();
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left group',
                      isActive
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
                          isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground',
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
      </ScrollArea>

      {/* User Footer Profile Dock */}
      <div className="h-14 border-t border-sidebar-border px-3 flex items-center justify-between bg-sidebar-accent/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <CommunityAvatar
            name={currentUserName}
            email={currentUser?.email}
            imageUrl={currentUser?.imageUrl}
            size={32}
            status="online"
            showStatus
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate leading-tight">
              {currentUserName}
            </span>
            <span className="text-[10px] text-emerald-500 font-medium truncate leading-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Component: Member List Content (reusable for desktop sidebar & tablet/mobile drawer)
  const renderMemberListContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-12 border-b border-sidebar-border px-4 flex items-center font-semibold text-xs tracking-wider uppercase text-muted-foreground shadow-2xs">
        {t('Daftar Anggota')} ({DEFAULT_MEMBERS.length})
      </div>

      <ScrollArea className="flex-1 p-3">
        {/* STAFF / ADMIN */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase px-2">
            Staff — {DEFAULT_MEMBERS.filter((m) => m.role === 'admin').length}
          </span>
          <div className="mt-1 space-y-0.5">
            {DEFAULT_MEMBERS.filter((m) => m.role === 'admin').map((member) => (
              <button
                key={member.id}
                onClick={() => handleStartDM(member)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left group"
              >
                <CommunityAvatar
                  name={member.name}
                  imageUrl={member.avatar}
                  size={32}
                  status={member.status}
                  showStatus
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {member.name}
                    </span>
                    <Shield className="w-2.5 h-2.5 text-red-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {member.customStatus || 'Administrator'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CREATORS */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase px-2">
            Kreator Template — {DEFAULT_MEMBERS.filter((m) => m.role === 'creator').length}
          </span>
          <div className="mt-1 space-y-0.5">
            {DEFAULT_MEMBERS.filter((m) => m.role === 'creator').map((member) => (
              <button
                key={member.id}
                onClick={() => handleStartDM(member)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left group"
              >
                <CommunityAvatar
                  name={member.name}
                  imageUrl={member.avatar}
                  size={32}
                  status={member.status}
                  showStatus
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {member.name}
                    </span>
                    <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {member.customStatus || 'Top Creator'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PRO MEMBERS */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase px-2">
            Pro Member — {DEFAULT_MEMBERS.filter((m) => m.role === 'pro').length}
          </span>
          <div className="mt-1 space-y-0.5">
            {DEFAULT_MEMBERS.filter((m) => m.role === 'pro').map((member) => (
              <button
                key={member.id}
                onClick={() => handleStartDM(member)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left group"
              >
                <CommunityAvatar
                  name={member.name}
                  imageUrl={member.avatar}
                  size={32}
                  status={member.status}
                  showStatus
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {member.name}
                    </span>
                    <Crown className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {member.customStatus || 'Active Member'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* OTHER MEMBERS */}
        <div>
          <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase px-2">
            Anggota Lainnya — {DEFAULT_MEMBERS.filter((m) => m.role === 'member').length}
          </span>
          <div className="mt-1 space-y-0.5">
            {DEFAULT_MEMBERS.filter((m) => m.role === 'member').map((member) => (
              <button
                key={member.id}
                onClick={() => handleStartDM(member)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left group opacity-85 hover:opacity-100"
              >
                <CommunityAvatar
                  name={member.name}
                  imageUrl={member.avatar}
                  size={32}
                  status={member.status}
                  showStatus
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-foreground truncate block">
                    {member.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {member.customStatus || 'Member'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground select-none">
      {/* 1. LEFT SIDEBAR (Desktop & Tablet): Channels & DMs */}
      <div className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-sidebar-border h-full">
        {renderChannelsSidebarContent()}
      </div>

      {/* MOBILE CHANNELS SHEET (Slide over from left) */}
      <Sheet open={isMobileChannelsOpen} onOpenChange={setIsMobileChannelsOpen}>
        <SheetContent side="left" className="p-0 w-72 sm:w-80">
          <SheetHeader className="sr-only">
            <SheetTitle>Channels & DMs</SheetTitle>
          </SheetHeader>
          {renderChannelsSidebarContent(() => setIsMobileChannelsOpen(false))}
        </SheetContent>
      </Sheet>

      {/* 2. CENTER: Discord Main Chat Feed */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background overflow-hidden">
        {/* Top Channel Bar */}
        <div className="h-12 border-b border-border px-3 md:px-4 flex items-center justify-between shadow-2xs shrink-0 gap-2">
          {/* Left: Mobile Drawer Trigger + Channel Info */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {/* Mobile Menu Button to open Channels */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 text-muted-foreground shrink-0"
              onClick={() => setIsMobileChannelsOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </Button>

            {activeChannel.isDirectMessage ? (
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
            ) : (
              <Hash className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs md:text-sm font-bold text-foreground shrink-0 truncate">
              {activeChannel.name}
            </span>
            <Separator orientation="vertical" className="h-4 mx-1 shrink-0 hidden sm:block" />
            <span className="text-xs text-muted-foreground truncate hidden md:inline">
              {activeChannel.description}
            </span>
          </div>

          {/* Right: Search + Members Trigger */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <div className="relative w-28 sm:w-40 md:w-52">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/40 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40"
              />
            </div>

            {/* Desktop Users Button (Toggles desktop sidebar) */}
            <div className="hidden lg:block">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-8 w-8', showMemberList && 'bg-accent text-accent-foreground')}
                      onClick={() => setShowMemberList(!showMemberList)}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Daftar Anggota</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Tablet & Mobile Users Button (Opens right Sheet) */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsMobileMembersOpen(true)}
              >
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Message Feed Scroll Area */}
        <ScrollArea className="flex-1 p-3 md:p-6">
          {/* Welcome Channel Banner */}
          <div className="mb-4 md:mb-6 pt-2 pb-4 md:pb-5 border-b border-border/40">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary mb-2.5 shadow-inner">
              {activeChannel.isDirectMessage ? (
                <MessageSquare className="w-6 h-6 md:w-7 md:h-7" />
              ) : (
                <Hash className="w-6 h-6 md:w-7 md:h-7" />
              )}
            </div>
            <h2 className="text-lg md:text-2xl font-bold tracking-tight text-foreground">
              {activeChannel.isDirectMessage ? activeChannel.name : `Selamat datang di #${activeChannel.name}!`}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
              {activeChannel.isDirectMessage
                ? `Ini adalah awal dari riwayat obrolan langsung Anda dengan ${activeChannel.name}.`
                : activeChannel.description || `Ini adalah awal dari channel #${activeChannel.name}.`}
            </p>
          </div>

          {/* Messages List (Discord Linear Layout) */}
          <div className="space-y-3.5 md:space-y-4">
            {filteredMessages.map((msg) => {
              return (
                <div
                  key={msg.id}
                  className="group relative flex gap-2.5 md:gap-3.5 pr-1 md:pr-2 py-1 rounded-lg hover:bg-muted/20 transition-colors"
                >
                  {/* Sender Avatar */}
                  <div className="shrink-0 pt-0.5">
                    <CommunityAvatar
                      name={msg.senderName}
                      email={msg.senderEmail}
                      imageUrl={msg.senderAvatar}
                      size={34}
                    />
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2 leading-none mb-1 flex-wrap">
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

                    {/* Content with rich markdown formatting */}
                    <div className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap select-text break-words">
                      {renderFormattedMessage(msg.content)}
                    </div>

                    {/* Template Card Attachment */}
                    {msg.attachments?.map((att, i) => {
                      if (att.type === 'template' && att.templateData) {
                        return (
                          <Card
                            key={i}
                            className="mt-2.5 p-3 md:p-3.5 max-w-full md:max-w-md bg-card/90 border-border/80 rounded-xl shadow-xs hover:border-primary/40 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-semibold leading-tight text-foreground truncate">
                                    {att.templateData.name}
                                  </h4>
                                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                    {att.templateData.pieceCount} Pieces •{' '}
                                    <span className="text-primary font-medium">
                                      {att.templateData.price || 'Free'}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <Button asChild size="sm" variant="default" className="h-7 text-xs px-2.5 shrink-0">
                                <Link to="/templates">
                                  Gunakan <ExternalLink className="w-3 h-3 ml-1" />
                                </Link>
                              </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                              {att.templateData.description}
                            </p>
                          </Card>
                        );
                      }

                      if (att.type === 'image') {
                        return (
                          <div key={i} className="mt-2 max-w-full md:max-w-sm rounded-lg overflow-hidden border border-border">
                            <img src={att.url} alt={att.name} className="w-full object-cover max-h-64" />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={i}
                          className="mt-2 flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border text-xs max-w-xs"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate flex-1">{att.name}</span>
                          <span className="text-[10px] text-muted-foreground">{att.size}</span>
                        </div>
                      );
                    })}

                    {/* Reactions Bar */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, users]) => {
                          const isReacted = users.includes(currentUser?.id || 'me');
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors',
                                isReacted
                                  ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                                  : 'bg-muted/40 border-border hover:bg-muted text-foreground',
                              )}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] font-semibold">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Hover Quick Reaction Bar */}
                  <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-background border border-border shadow-xs rounded-md p-0.5 z-10">
                    {['👍', '❤️', '🚀', '🔥', '💡'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-xs transition-transform active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Bottom Input Area (Discord Floating Input) */}
        <div className="p-3 md:p-4 pt-1 border-t border-border/40 shrink-0">
          {/* Staged Attachment Chip */}
          {stagedAttachment && (
            <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-muted/60 border border-border rounded-lg text-xs w-fit max-w-full">
              <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-medium truncate max-w-xs">{stagedAttachment.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">({stagedAttachment.size || 'Attachment'})</span>
              <button
                onClick={() => setStagedAttachment(null)}
                className="hover:text-destructive transition-colors ml-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 md:gap-2 bg-muted/30 border border-border/70 rounded-xl px-2.5 md:px-3 py-1.5 md:py-2 focus-within:border-primary/60 transition-colors">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.json,.pdf"
            />

            {/* Plus / Attachment Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kirim file atau gambar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Main Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Pesan ke #${activeChannel.name}...`}
              className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/60 min-w-0"
            />

            {/* Quick Template Share Popover */}
            <Popover open={isTemplatePopoverOpen} onOpenChange={setIsTemplatePopoverOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 text-muted-foreground hover:text-primary shrink-0',
                          isTemplatePopoverOpen && 'text-primary bg-primary/10',
                        )}
                      >
                        <Layers className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Bagikan Template Workflow</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <PopoverContent align="end" className="w-[calc(100vw-32px)] sm:w-80 p-3 bg-card border-border shadow-md">
                <div className="text-xs font-semibold mb-2 flex items-center justify-between">
                  <span>Pilih Template untuk Dibagikan</span>
                  <Badge variant="outline" className="text-[10px]">3 Pilihan</Badge>
                </div>
                <div className="space-y-2">
                  {SHAREABLE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      onClick={() => {
                        setStagedAttachment({
                          type: 'template',
                          url: '/templates',
                          name: tmpl.name,
                          templateData: {
                            name: tmpl.name,
                            description: tmpl.description,
                            pieceCount: tmpl.pieceCount,
                            price: tmpl.price,
                          },
                        });
                        setIsTemplatePopoverOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-muted/40 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold group-hover:text-primary transition-colors truncate">
                          {tmpl.name}
                        </span>
                        <span className="text-[10px] font-medium text-primary shrink-0 ml-1">
                          {tmpl.price}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {tmpl.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {tmpl.tags.map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Send Button */}
            <Button
              type="button"
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputText.trim() && !stagedAttachment}
              className="h-7 w-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 transition-opacity disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR (Desktop): Member List */}
      {showMemberList && (
        <div className="w-60 shrink-0 border-l border-sidebar-border hidden lg:flex flex-col h-full">
          {renderMemberListContent()}
        </div>
      )}

      {/* TABLET & MOBILE MEMBERS SHEET (Slide over from right) */}
      <Sheet open={isMobileMembersOpen} onOpenChange={setIsMobileMembersOpen}>
        <SheetContent side="right" className="p-0 w-72 sm:w-80">
          <SheetHeader className="sr-only">
            <SheetTitle>Daftar Anggota</SheetTitle>
          </SheetHeader>
          {renderMemberListContent()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default CommunityPage;
