import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Rocket,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Crown,
  Check,
  Signal,
  Users,
  Grid,
  FileCode,
  Workflow,
  X,
  Radio,
  ExternalLink,
  Copy,
  Share2,
  UserPlus,
  Play,
  RotateCcw,
  Plus,
  CheckCircle2,
  Terminal,
  Palette,
  Trash2,
  Zap,
  Bot,
  Database,
  ArrowRight,
  Loader2,
  Search,
  Fish,
  Tv,
  Gamepad2,
  Sprout,
  Trophy,
  Coins,
  Flame,
  HelpCircle,
  RefreshCw,
  Send,
  Sparkle,
  Compass,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CommunityAvatar } from './messages-avatar';
import { CommunityChannel, CommunityHub, CommunityMember } from './messages-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface CallParticipant {
  socketId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream;
}

interface CommunityCallStageProps {
  channel: CommunityChannel;
  activeHub?: CommunityHub | null;
  currentUser: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    imageUrl?: string | null;
  } | null | undefined;
  isPlusOrAbove: boolean;
  socket: Socket | null;
  isCallActive: boolean;
  isPiP: boolean;
  isActivityOpen?: boolean;
  onToggleActivity?: (open?: boolean) => void;
  onTogglePiP: () => void;
  onEndCall: () => void;
  onNavigateToBilling?: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ── Discord Activity App Definition ────────────────────────────────────
export interface DiscordAppDefinition {
  id: string;
  title: string;
  developer: string;
  category: 'game' | 'entertainment' | 'productivity' | 'dev';
  bannerGradient: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  isRecent?: boolean;
  isInServer?: boolean;
  isPromoted?: boolean;
  badge?: string;
  accentColor: string;
}

export const DISCORD_APPS: DiscordAppDefinition[] = [
  {
    id: 'watch-together',
    title: 'Watch Together',
    developer: 'YouTube',
    category: 'entertainment',
    bannerGradient: 'from-red-600 via-rose-700 to-zinc-950',
    iconBg: 'bg-red-600',
    iconColor: 'text-white',
    icon: Tv,
    tagline: 'Tonton video YouTube bersama rekan secara sinkron realtime.',
    description: 'Nikmati video YouTube, tutorial coding, dan lofi music bersama seluruh anggota panggilan secara sinkron tanpa delay.',
    isRecent: true,
    isPromoted: true,
    badge: 'POPULER',
    accentColor: '#ef4444',
  },
  {
    id: 'virtual-fisher',
    title: 'Virtual Fisher',
    developer: 'Fishing Club Inc.',
    category: 'game',
    bannerGradient: 'from-cyan-600 via-teal-700 to-slate-950',
    iconBg: 'bg-cyan-500',
    iconColor: 'text-white',
    icon: Fish,
    tagline: 'Minigame memancing kail bersama tim di server.',
    description: 'Virtual Fisher is a game you can play in your server focused on catching rare fish, leveling up, and competing on server leaderboards.',
    isRecent: true,
    isInServer: true,
    isPromoted: true,
    badge: 'GAME',
    accentColor: '#06b6d4',
  },
  {
    id: 'wordle',
    title: 'Wordle',
    developer: 'The New York Times Games',
    category: 'game',
    bannerGradient: 'from-emerald-700 via-teal-800 to-zinc-950',
    iconBg: 'bg-emerald-600',
    iconColor: 'text-white',
    icon: Grid,
    tagline: 'Tebak kata 5 huruf harian bersama rekan tim.',
    description: 'Play Wordle from New York Times Games together! Tebak 5 huruf tersembunyi dalam 6 kesempatan dengan bantuan ubin warna hijau dan kuning.',
    isRecent: true,
    isPromoted: true,
    badge: 'POPULER',
    accentColor: '#10b981',
  },
  {
    id: 'magic-garden',
    title: 'Magic Garden',
    developer: 'Bloom Studio',
    category: 'game',
    bannerGradient: 'from-amber-600 via-orange-700 to-indigo-950',
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
    icon: Sprout,
    tagline: 'Bercocok tanam buah-buahan ajaib bersama teman.',
    description: 'Garden with friends! Tanam labu ajaib, buah bintang, panen bersama dan kembangkan kebun komunitas server Anda.',
    isPromoted: true,
    badge: 'CO-OP',
    accentColor: '#f59e0b',
  },
  {
    id: 'flow-canvas',
    title: 'Anticeil Flow Builder',
    developer: 'Anticeil Native',
    category: 'productivity',
    bannerGradient: 'from-indigo-600 via-purple-700 to-zinc-950',
    iconBg: 'bg-primary',
    iconColor: 'text-white',
    icon: Workflow,
    tagline: 'Simulasikan alur webhook, workflow, dan AI agent realtime.',
    description: 'Rancang arsitektur otomasi, pantau eksekusi langkah AI & database, dan diskusikan bersama tim secara visual.',
    isRecent: true,
    isPromoted: true,
    badge: 'OFFICIAL',
    accentColor: '#6366f1',
  },
  {
    id: 'whiteboard',
    title: 'Jamspace Whiteboard',
    developer: 'Anticeil Native',
    category: 'productivity',
    bannerGradient: 'from-blue-600 via-indigo-700 to-slate-950',
    iconBg: 'bg-blue-600',
    iconColor: 'text-white',
    icon: Palette,
    tagline: 'Papan tulis kolaboratif untuk sketching arsitektur sistem.',
    description: 'Papan kanvas HTML5 realtime multi-color untuk coret-coret skema database, wireframe, atau ide proyek baru.',
    isPromoted: true,
    badge: 'OFFICIAL',
    accentColor: '#3b82f6',
  },
  {
    id: 'code-runner',
    title: 'Dev Scratchpad & Tester',
    developer: 'Anticeil DevTools',
    category: 'dev',
    bannerGradient: 'from-emerald-600 via-slate-800 to-black',
    iconBg: 'bg-zinc-800',
    iconColor: 'text-emerald-400',
    icon: Terminal,
    tagline: 'Editor script JS realtime dan JSON validator dengan live output.',
    description: 'Tulis dan uji script JavaScript langsung di dalam panggilan, jalankan pengujian payload API, dan diskusikan hasilnya.',
    isPromoted: true,
    badge: 'DEV',
    accentColor: '#10b981',
  },
];

export function CommunityCallStage({
  channel,
  activeHub,
  currentUser,
  isPlusOrAbove,
  socket,
  isCallActive,
  isPiP,
  isActivityOpen: propsIsActivityOpen,
  onToggleActivity,
  onTogglePiP,
  onEndCall,
  onNavigateToBilling,
}: CommunityCallStageProps) {
  // Local Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);

  // Remote Peers & WebRTC connections
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Upgrade modal state for Free Plan 2-person limit
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Discord App Launcher Modal & Active Activity
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [isFilmstripCollapsed, setIsFilmstripCollapsed] = useState(false);

  // Parent sync
  const internalActivityOpen = activeAppId !== null;
  const isActivityOpen = propsIsActivityOpen !== undefined ? propsIsActivityOpen : internalActivityOpen;

  const handleLaunchApp = (appId: string) => {
    setActiveAppId(appId);
    setIsAppLauncherOpen(false);
    onToggleActivity?.(true);

    const app = DISCORD_APPS.find((a) => a.id === appId);
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'ACTIVITY_LAUNCH',
      payload: { appId, appName: app?.title || appId },
    });
    toast.success(`Aktivitas ${app?.title || appId} diluncurkan di panggung panggilan!`);
  };

  const handleStopActivity = () => {
    setActiveAppId(null);
    setActiveVideoId(null); // reset to browse mode for next launch
    onToggleActivity?.(false);
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'ACTIVITY_STOP',
      payload: {},
    });
    toast.info('Aktivitas dihentikan, kembali ke tampilan kamera utama.');
  };

  // ── YouTube Watch Together State (100% Discord Design) ─────────────────
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null); // null = browse mode
  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytCategory, setYtCategory] = useState<string>('semua');
  const [isExpandedVideo, setIsExpandedVideo] = useState(false);
  const [ytVideos, setYtVideos] = useState<Array<{
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration: string;
    views?: string;
    uploadedAt?: string;
  }>>([]);
  const [ytPlaylist, setYtPlaylist] = useState<Array<{
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration: string;
    views?: string;
    uploadedAt?: string;
    addedBy: string;
  }>>([]);
  const [ytIsSearching, setYtIsSearching] = useState(false);
  const [ytSearchError, setYtSearchError] = useState<string | null>(null);
  const ytSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ytCacheRef = useRef<Map<string, Array<{ id: string; title: string; channel: string; thumbnail: string; duration: string; views?: string; uploadedAt?: string }>>>(new Map());

  // Category → YouTube videoCategoryId or keyword (100% live from YouTube API)
  const ytCategories = [
    { id: 'semua', label: '🔥 Trending', q: '', categoryId: '' },
    { id: 'music', label: '🎵 Musik', q: '', categoryId: '10' },
    { id: 'gaming', label: '🎮 Gaming', q: '', categoryId: '20' },
    { id: 'tech', label: '💻 Tech', q: 'programming tech coding tutorial', categoryId: '28' },
    { id: 'entertainment', label: '🎉 Hiburan', q: '', categoryId: '24' },
    { id: 'lofi', label: '☕ Lofi', q: 'lofi hip hop radio beats', categoryId: '' },
  ];

  // Helper to parse YouTube ISO 8601 duration (PT4M13S -> 4:13)
  const parseYtDuration = (duration?: string): string => {
    if (!duration) return '';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const h = match[1];
    const m = match[2] || '0';
    const s = match[3] || '0';
    if (h) {
      return `${h}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
    }
    return `${m}:${s.padStart(2, '0')}`;
  };

  const formatViews = (views?: string | number): string => {
    if (!views) return '';
    const num = typeof views === 'string' ? parseInt(views, 10) : views;
    if (isNaN(num)) return '';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K views`;
    return `${num} views`;
  };

  const formatTimeAgo = (dateStr?: string): string => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins || 1}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months ago`;
    return `${Math.floor(months / 12)} years ago`;
  };

  // Fetch YouTube Videos: Live Trending on initial open, Real Search on query (Debounced + In-Memory Cached)
  useEffect(() => {
    if (activeAppId !== 'watch-together') return;
    if (ytSearchDebounce.current) clearTimeout(ytSearchDebounce.current);

    const catObj = ytCategories.find((c) => c.id === ytCategory);
    const rawQ = ytSearchQuery.trim();

    // 1. Skip search if pasting a direct YouTube URL (user will click 'Putar' button)
    if (rawQ.includes('youtube.com') || rawQ.includes('youtu.be')) {
      return;
    }

    // 2. Don't waste quota on a single 1-letter typo
    if (rawQ.length === 1) {
      return;
    }

    const cacheKey = rawQ ? `search:${rawQ.toLowerCase()}` : `cat:${ytCategory}`;

    // 3. Cache hit -> Instant result without any API quota usage
    if (ytCacheRef.current.has(cacheKey)) {
      setYtVideos(ytCacheRef.current.get(cacheKey)!);
      setYtIsSearching(false);
      setYtSearchError(null);
      return;
    }

    ytSearchDebounce.current = setTimeout(async () => {
      setYtIsSearching(true);
      setYtSearchError(null);
      try {
        const key = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyBg-0HDXNw2occXp6_89D4dXxBW0gISbQ4';
        let items: Array<{ id: string; title: string; channel: string; thumbnail: string; duration: string; views?: string; uploadedAt?: string }> = [];

        if (rawQ) {
          // 1. User typed query -> Search API (debounced 500ms)
          const params = new URLSearchParams({
            part: 'snippet',
            q: rawQ,
            type: 'video',
            maxResults: '16',
            key,
          });
          const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
          if (!res.ok) throw new Error(`YouTube API (${res.status}): pastikan kuota API aktif`);
          const data = await res.json();
          items = (data.items ?? []).map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
            duration: '',
            uploadedAt: formatTimeAgo(item.snippet?.publishedAt),
          }));
        } else if (catObj?.categoryId) {
          // 2. Category Most Popular (Music, Gaming, Tech, Entertainment)
          const params = new URLSearchParams({
            part: 'snippet,contentDetails,statistics',
            chart: 'mostPopular',
            regionCode: 'ID',
            videoCategoryId: catObj.categoryId,
            maxResults: '16',
            key,
          });
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
          if (!res.ok) throw new Error(`YouTube API (${res.status}): pastikan kuota API aktif`);
          const data = await res.json();
          items = (data.items ?? []).map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.standard?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            duration: parseYtDuration(item.contentDetails?.duration),
            views: formatViews(item.statistics?.viewCount),
            uploadedAt: formatTimeAgo(item.snippet?.publishedAt),
          }));
        } else if (catObj?.q) {
          // 3. Keyword-based category (e.g. Lofi)
          const params = new URLSearchParams({
            part: 'snippet',
            q: catObj.q,
            type: 'video',
            maxResults: '16',
            key,
          });
          const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
          if (!res.ok) throw new Error(`YouTube API (${res.status}): pastikan kuota API aktif`);
          const data = await res.json();
          items = (data.items ?? []).map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
            duration: '',
            uploadedAt: formatTimeAgo(item.snippet?.publishedAt),
          }));
        } else {
          // 4. Default: Live Most Popular in Indonesia (Exactly like Discord initial screen!)
          const params = new URLSearchParams({
            part: 'snippet,contentDetails,statistics',
            chart: 'mostPopular',
            regionCode: 'ID',
            maxResults: '16',
            key,
          });
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
          if (!res.ok) throw new Error(`YouTube API (${res.status}): pastikan kuota API aktif`);
          const data = await res.json();
          items = (data.items ?? []).map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.standard?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            duration: parseYtDuration(item.contentDetails?.duration),
            views: formatViews(item.statistics?.viewCount),
            uploadedAt: formatTimeAgo(item.snippet?.publishedAt),
          }));
        }

        // Save to cache
        ytCacheRef.current.set(cacheKey, items);
        setYtVideos(items);
      } catch (e: any) {
        setYtSearchError(e.message ?? 'Gagal memuat video YouTube');
        setYtVideos([]);
      } finally {
        setYtIsSearching(false);
      }
    }, rawQ ? 500 : 0);

    return () => {
      if (ytSearchDebounce.current) clearTimeout(ytSearchDebounce.current);
    };
  }, [ytSearchQuery, ytCategory, activeAppId]);

  // Video grid items
  const ytDisplayVideos = ytVideos;

  // Handler select video -> play and add to playlist if not already there
  const handleSelectVideo = (video: {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration: string;
    views?: string;
    uploadedAt?: string;
  }) => {
    setActiveVideoId(video.id);
    setIsExpandedVideo(false);
    setYtPlaylist((prev) => {
      if (prev.some((item) => item.id === video.id)) return prev;
      return [
        ...prev,
        {
          ...video,
          addedBy: currentUserName || 'You',
        },
      ];
    });

    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'YOUTUBE_CHANGE_VIDEO',
      payload: { videoId: video.id },
    });
  };

  // Handler add to queue (+)
  const handleAddToQueue = (
    e: React.MouseEvent,
    video: {
      id: string;
      title: string;
      channel: string;
      thumbnail: string;
      duration: string;
      views?: string;
      uploadedAt?: string;
    }
  ) => {
    e.stopPropagation();
    setYtPlaylist((prev) => {
      if (prev.some((item) => item.id === video.id)) return prev;
      return [
        ...prev,
        {
          ...video,
          addedBy: currentUserName || 'You',
        },
      ];
    });
    if (!activeVideoId) {
      setActiveVideoId(video.id);
      setIsExpandedVideo(false);
    }
  };

  // Handler play URL or direct ID
  const handlePlayYouTubeUrl = (urlOrQuery: string) => {
    if (!urlOrQuery.trim()) return;
    const match = urlOrQuery.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : (urlOrQuery.trim().length === 11 && !urlOrQuery.includes(' ') ? urlOrQuery.trim() : null);

    if (videoId) {
      const existing = ytVideos.find((v) => v.id === videoId);
      const newVideo = existing || {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        channel: 'YouTube',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: '',
        uploadedAt: 'Baru saja',
      };
      handleSelectVideo(newVideo);
      setYtSearchQuery('');
    }
  };

  // ── Virtual Fisher State (Matching user screenshot) ────────────────────
  const [fisherStats, setFisherStats] = useState({
    fishCount: 8,
    xp: 64,
    level: 3,
    coins: 140,
    rod: 'Kail Bambu Halus',
    lastCatch: {
      amount: 8,
      type: 'Fish',
      icon: '🐟',
      xp: 8,
      boostBy: 'lawny 🐕',
    },
  });
  const [fisherCooldown, setFisherCooldown] = useState(0);
  const [fisherFeed, setFisherFeed] = useState<Array<{
    id: string;
    userName: string;
    message: string;
    timestamp: string;
  }>>([
    {
      id: 'f-1',
      userName: 'zmsta',
      message: 'menangkap 8 🐟 Fish (+8 XP)',
      timestamp: '11.22',
    },
    {
      id: 'f-2',
      userName: 'lawny',
      message: 'mengaktifkan Global 🐕 Boost (2x XP)',
      timestamp: '11.20',
    },
  ]);

  // ── Wordle State ───────────────────────────────────────────────────────
  const [wordleTarget] = useState('REACT');
  const [wordleGuesses, setWordleGuesses] = useState<string[]>(['VOICE', 'CLEAN']);
  const [wordleCurrentInput, setWordleCurrentInput] = useState('');
  const [wordleStatus, setWordleStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  // ── Magic Garden State ─────────────────────────────────────────────────
  const [gardenPlots, setGardenPlots] = useState([
    { id: 1, name: 'Luminescent Pumpkin', icon: '🎃', progress: 100, ready: true },
    { id: 2, name: 'Star Fruit', icon: '⭐', progress: 65, ready: false },
    { id: 3, name: 'Mystic Berry', icon: '🍓', progress: 40, ready: false },
    { id: 4, name: 'Golden Wheat', icon: '🌾', progress: 90, ready: false },
    { id: 5, name: 'Nightshade Orchid', icon: '🌸', progress: 10, ready: false },
    { id: 6, name: 'Sun Sunflower', icon: '🌻', progress: 100, ready: true },
  ]);
  const [gardenScore, setGardenScore] = useState(420);

  // ── Flow Simulator State ───────────────────────────────────────────────
  const [flowNodes, setFlowNodes] = useState<Array<{
    id: string;
    type: 'trigger' | 'ai' | 'action' | 'db';
    title: string;
    description: string;
    status: 'idle' | 'running' | 'success';
    duration?: string;
  }>>([
    {
      id: 'step-1',
      type: 'trigger',
      title: 'WhatsApp Webhook',
      description: 'Menangkap pesan & lead masuk dari WhatsApp Cloud API',
      status: 'idle',
    },
    {
      id: 'step-2',
      type: 'ai',
      title: 'Anticeil AI Agent',
      description: 'Ekstrak kebutuhan pelanggan via model Claude 3.5 / GPT-4o',
      status: 'idle',
    },
    {
      id: 'step-3',
      type: 'action',
      title: 'Notifikasi Tim Internal',
      description: `Broadcast detail lead ke channel #${channel.name}`,
      status: 'idle',
    },
    {
      id: 'step-4',
      type: 'db',
      title: 'Database Supabase / CRM',
      description: 'Simpan kontak & set status lead menjadi QUALIFIED',
      status: 'idle',
    },
  ]);
  const [isSimulating, setIsSimulating] = useState(false);

  // ── Whiteboard Canvas State ────────────────────────────────────────────
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [drawColor, setDrawColor] = useState('#10b981');
  const [brushSize, setBrushSize] = useState(3);
  const isDrawing = useRef(false);
  const lastCoord = useRef<{ x: number; y: number } | null>(null);

  // ── Code Runner & Scratchpad State ─────────────────────────────────────
  const [scratchpadCode, setScratchpadCode] = useState(
    '// Anticeil Collaborative Activity Scratchpad\n// Diskusikan logika workflow, payload webhook, atau format data bersama tim.\n\nconst samplePayload = {\n  event: "lead_generated",\n  timestamp: new Date().toISOString(),\n  source: "WhatsApp Cloud API",\n  customer: {\n    name: "Budi Santoso",\n    phone: "+6281234567890",\n    status: "QUALIFIED"\n  }\n};\n\nconsole.log("Memproses payload:", samplePayload.customer.name);\nconsole.log("Status lead:", samplePayload.customer.status);',
  );
  const [scratchpadOutput, setScratchpadOutput] = useState<string | null>(null);
  const [isExecutingScript, setIsExecutingScript] = useState(false);

  // Audio meters for voice speaking detection (Discord green glow ring)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const currentUserId = currentUser?.id || 'me';
  const currentUserName =
    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
    currentUser?.email?.split('@')[0] ||
    'Pengguna Anticeil';

  // ── 1. Initialize Local Media ──────────────────────────────────────────
  const startLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setLocalStream(stream);

      // Speaking detector
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyserRef.current = analyser;
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setIsSpeakingLocal(avg > 18);
          requestAnimationFrame(checkVolume);
        };
        requestAnimationFrame(checkVolume);
      } catch (audioErr) {
        console.warn('Audio analyser setup failed:', audioErr);
      }

      return stream;
    } catch (err: any) {
      console.warn('Could not acquire both video and audio, trying audio only:', err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(audioOnly);
        setIsVideoOff(true);
        return audioOnly;
      } catch (audioErr) {
        toast.error('Tidak dapat mengakses mikrofon atau kamera. Pastikan izin browser diizinkan.');
        return null;
      }
    }
  }, []);

  // ── 2. WebRTC Peer Connection Factory ──────────────────────────────────
  const createPeerConnection = (
    targetSocketId: string,
    peerInfo: CallParticipant,
    isInitiator: boolean,
    currentLocalStream: MediaStream | null,
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current[targetSocketId] = pc;

    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocalStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('COMMUNITY_CALL_SIGNAL', {
          channelId: channel.id,
          targetSocketId,
          signal: { candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId === targetSocketId) {
            return { ...p, stream: remoteStream };
          }
          return p;
        }),
      );
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('COMMUNITY_CALL_SIGNAL', {
            channelId: channel.id,
            targetSocketId,
            signal: offer,
          });
        } catch (err) {
          console.error('Failed to create offer', err);
        }
      };
    }

    return pc;
  };

  // ── 3. Join / Leave Call Lifecycle & Socket Listeners ──────────────────
  useEffect(() => {
    if (!isCallActive || !channel.id || !socket) return;

    let localMediaStream: MediaStream | null = null;

    startLocalMedia().then((stream) => {
      localMediaStream = stream;
      socket.emit('COMMUNITY_CALL_JOIN', {
        channelId: channel.id,
        user: {
          id: currentUserId,
          name: currentUserName,
          avatar: currentUser?.imageUrl,
        },
        mediaState: {
          hasVideo: !isVideoOff && Boolean(stream?.getVideoTracks().length),
          hasAudio: !isMuted,
          isScreenSharing: false,
        },
      });
    });

    const handleUserJoined = (data: {
      socketId: string;
      userId: string;
      userName: string;
      userAvatar?: string;
      mediaState: { hasVideo: boolean; hasAudio: boolean; isScreenSharing: boolean };
      roomSize: number;
    }) => {
      if (!isPlusOrAbove && data.roomSize > 2) {
        setIsUpgradeModalOpen(true);
      }

      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === data.socketId)) return prev;
        const newPeer: CallParticipant = {
          socketId: data.socketId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          hasVideo: data.mediaState.hasVideo,
          hasAudio: data.mediaState.hasAudio,
          isScreenSharing: data.mediaState.isScreenSharing,
        };
        createPeerConnection(data.socketId, newPeer, true, localMediaStream);
        return [...prev, newPeer];
      });

      toast.info(`${data.userName} bergabung dalam panggilan.`);
    };

    const handleUserLeft = (data: { socketId: string; userId?: string }) => {
      setParticipants((prev) => {
        const leaving = prev.find((p) => p.socketId === data.socketId);
        if (leaving) {
          toast.info(`${leaving.userName} keluar dari panggilan.`);
        }
        return prev.filter((p) => p.socketId !== data.socketId);
      });
      if (peerConnections.current[data.socketId]) {
        peerConnections.current[data.socketId].close();
        delete peerConnections.current[data.socketId];
      }
    };

    const handleSignal = async (data: {
      fromSocketId: string;
      fromUserId?: string;
      signal: any;
    }) => {
      let pc = peerConnections.current[data.fromSocketId];
      if (!pc) {
        const dummyPeer: CallParticipant = {
          socketId: data.fromSocketId,
          userId: data.fromUserId || 'unknown',
          userName: 'Rekan Panggilan',
          hasVideo: true,
          hasAudio: true,
        };
        pc = createPeerConnection(data.fromSocketId, dummyPeer, false, localMediaStream);
      }

      if (data.signal?.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('COMMUNITY_CALL_SIGNAL', {
          channelId: channel.id,
          targetSocketId: data.fromSocketId,
          signal: answer,
        });
      } else if (data.signal?.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
      } else if (data.signal?.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        } catch (e) {
          console.warn('ICE candidate addition failed:', e);
        }
      }
    };

    const handlePeerMediaUpdated = (data: {
      socketId: string;
      hasVideo?: boolean;
      hasAudio?: boolean;
      isScreenSharing?: boolean;
      isSpeaking?: boolean;
    }) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId !== data.socketId) return p;
          return {
            ...p,
            hasVideo: data.hasVideo !== undefined ? data.hasVideo : p.hasVideo,
            hasAudio: data.hasAudio !== undefined ? data.hasAudio : p.hasAudio,
            isScreenSharing: data.isScreenSharing !== undefined ? data.isScreenSharing : p.isScreenSharing,
          };
        }),
      );
    };

    socket.on('COMMUNITY_CALL_USER_JOINED', handleUserJoined);
    socket.on('COMMUNITY_CALL_USER_LEFT', handleUserLeft);
    socket.on('COMMUNITY_CALL_SIGNAL', handleSignal);
    socket.on('COMMUNITY_CALL_PEER_MEDIA_UPDATED', handlePeerMediaUpdated);

    return () => {
      socket.off('COMMUNITY_CALL_USER_JOINED', handleUserJoined);
      socket.off('COMMUNITY_CALL_USER_LEFT', handleUserLeft);
      socket.off('COMMUNITY_CALL_SIGNAL', handleSignal);
      socket.off('COMMUNITY_CALL_PEER_MEDIA_UPDATED', handlePeerMediaUpdated);

      socket.emit('COMMUNITY_CALL_LEAVE', { channelId: channel.id });
      for (const id in peerConnections.current) {
        peerConnections.current[id].close();
      }
      peerConnections.current = {};

      if (localMediaStream) {
        localMediaStream.getTracks().forEach((track) => track.stop());
      }
      setLocalStream(null);
    };
  }, [isCallActive, channel.id, socket, isPlusOrAbove]);

  // ── 4. Media Control Actions ───────────────────────────────────────────
  const handleToggleMute = () => {
    if (!localStream) return;
    const next = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
    socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
      channelId: channel.id,
      hasAudio: !next,
    });
  };

  const handleToggleVideo = async () => {
    if (!localStream) {
      const s = await startLocalMedia();
      if (s) setIsVideoOff(false);
      return;
    }
    const next = !isVideoOff;
    const videoTracks = localStream.getVideoTracks();

    if (!next && videoTracks.length === 0) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        });
        const newTrack = camStream.getVideoTracks()[0];
        if (newTrack) {
          localStream.addTrack(newTrack);
          for (const sId in peerConnections.current) {
            const pc = peerConnections.current[sId];
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStream);
            }
          }
        }
      } catch (err) {
        toast.error('Tidak dapat mengakses kamera. Pastikan izin kamera aktif.');
        return;
      }
    } else {
      videoTracks.forEach((track) => {
        track.enabled = !next;
      });
    }

    setIsVideoOff(next);
    socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
      channelId: channel.id,
      hasVideo: !next,
    });
  };

  const handleCopyCallLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link panggilan berhasil disalin! Buka di tab atau browser lain untuk menguji panggilan 2 orang.');
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
        channelId: channel.id,
        isScreenSharing: false,
      });
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(displayStream);
      setIsScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = displayStream;
      }

      const screenTrack = displayStream.getVideoTracks()[0];
      for (const sId in peerConnections.current) {
        const pc = peerConnections.current[sId];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && screenTrack) {
          sender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
        if (localStream) {
          const camTrack = localStream.getVideoTracks()[0];
          for (const sId in peerConnections.current) {
            const pc = peerConnections.current[sId];
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && camTrack) {
              sender.replaceTrack(camTrack);
            }
          }
        }
        socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
          channelId: channel.id,
          isScreenSharing: false,
        });
      };

      socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
        channelId: channel.id,
        isScreenSharing: true,
      });
    } catch (err) {
      console.warn('Screen share cancelled or failed', err);
    }
  };

  // ── 5. Activity Collaborative Sync Handlers ────────────────────────────
  const drawStroke = (x0: number, y0: number, x1: number, y1: number, color: string, size: number) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  const clearCanvasLocal = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    clearCanvasLocal();
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'WHITEBOARD_CLEAR',
      payload: null,
    });
    toast.info('Papan tulis dibersihkan');
  };

  const runSimulationSequence = (broadcast = true) => {
    if (isSimulating) return;
    setIsSimulating(true);
    toast.info('Memulai simulasi eksekusi alur otomasi...');

    if (broadcast && socket) {
      socket.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
        channelId: channel.id,
        action: 'FLOW_SIMULATE',
        payload: null,
      });
    }

    setFlowNodes((prev) => prev.map((n) => ({ ...n, status: 'idle', duration: undefined })));

    let current = 0;
    const executeStep = () => {
      if (current < flowNodes.length) {
        setFlowNodes((prev) =>
          prev.map((n, idx) => (idx === current ? { ...n, status: 'running' } : n)),
        );

        setTimeout(() => {
          const randomMs = Math.floor(Math.random() * 80) + 15;
          setFlowNodes((prev) =>
            prev.map((n, idx) =>
              idx === current ? { ...n, status: 'success', duration: `${randomMs}ms` } : n,
            ),
          );
          current++;
          executeStep();
        }, 750);
      } else {
        setIsSimulating(false);
        toast.success('Simulasi alur otomasi berhasil dijalankan! Semua langkah selesai (200 OK).');
      }
    };

    setTimeout(executeStep, 200);
  };

  const handleAddFlowNode = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      type: 'action' as const,
      title: 'Langkah Otomasi Baru',
      description: 'Langkah kustom yang ditambahkan oleh tim saat panggilan',
      status: 'idle' as const,
    };
    const updated = [...flowNodes, newStep];
    setFlowNodes(updated);
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'FLOW_UPDATE',
      payload: updated,
    });
    toast.success('Langkah otomasi baru ditambahkan!');
  };

  const handleResetFlow = () => {
    const initial = [
      {
        id: 'step-1',
        type: 'trigger' as const,
        title: 'WhatsApp Webhook',
        description: 'Menangkap pesan & lead masuk dari WhatsApp Cloud API',
        status: 'idle' as const,
      },
      {
        id: 'step-2',
        type: 'ai' as const,
        title: 'Anticeil AI Agent',
        description: 'Ekstrak kebutuhan pelanggan via model Claude 3.5 / GPT-4o',
        status: 'idle' as const,
      },
      {
        id: 'step-3',
        type: 'action' as const,
        title: 'Notifikasi Tim Internal',
        description: `Broadcast detail lead ke channel #${channel.name}`,
        status: 'idle' as const,
      },
      {
        id: 'step-4',
        type: 'db' as const,
        title: 'Database Supabase / CRM',
        description: 'Simpan kontak & set status lead menjadi QUALIFIED',
        status: 'idle' as const,
      },
    ];
    setFlowNodes(initial);
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'FLOW_UPDATE',
      payload: initial,
    });
    toast.info('Alur otomasi di-reset ke default');
  };

  const handleRunScratchpad = () => {
    setIsExecutingScript(true);
    const start = performance.now();
    try {
      const trimmed = scratchpadCode.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        const elapsed = (performance.now() - start).toFixed(2);
        setScratchpadOutput(`✓ Valid JSON Payload (${elapsed}ms)\n` + JSON.stringify(parsed, null, 2));
        toast.success(`Payload JSON valid! (${elapsed}ms)`);
      } else {
        const mockLog: string[] = [];
        const customConsole = {
          log: (...args: any[]) =>
            mockLog.push(
              args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '),
            ),
          info: (...args: any[]) => mockLog.push('[INFO] ' + args.join(' ')),
          warn: (...args: any[]) => mockLog.push('[WARN] ' + args.join(' ')),
          error: (...args: any[]) => mockLog.push('[ERROR] ' + args.join(' ')),
        };
        const runFn = new Function('console', scratchpadCode);
        runFn(customConsole);
        const elapsed = (performance.now() - start).toFixed(2);
        setScratchpadOutput(
          `✓ Script executed successfully in ${elapsed}ms\n--- Console Output ---\n` +
            (mockLog.join('\n') || '(Eksekusi selesai tanpa log output)'),
        );
        toast.success(`Script berhasil dijalankan! (${elapsed}ms)`);
      }
    } catch (err: any) {
      setScratchpadOutput(`✕ Error Eksekusi: ${err.message}`);
      toast.error(`Eksekusi gagal: ${err.message}`);
    } finally {
      setIsExecutingScript(false);
    }
  };

  // ── 6. Virtual Fisher Fishing Action ───────────────────────────────────
  const handleFishAction = () => {
    if (fisherCooldown > 0) {
      toast.error(`Harap tunggu ${fisherCooldown.toFixed(1)}s sebelum melempar kail lagi!`);
      return;
    }

    // Set 3.5s cooldown matching screenshot
    setFisherCooldown(3.5);
    const interval = setInterval(() => {
      setFisherCooldown((prev) => {
        if (prev <= 0.5) {
          clearInterval(interval);
          return 0;
        }
        return Number((prev - 0.5).toFixed(1));
      });
    }, 500);

    const rand = Math.random();
    let caughtFish = {
      amount: Math.floor(Math.random() * 8) + 4,
      type: 'Fish',
      icon: '🐟',
      xp: 8,
      boostBy: 'lawny 🐕',
    };

    if (rand > 0.92) {
      caughtFish = {
        amount: 1,
        type: 'Golden Dragon Koi',
        icon: '🐉',
        xp: 150,
        boostBy: 'server jackpot 🔥',
      };
    } else if (rand > 0.75) {
      caughtFish = {
        amount: 2,
        type: 'Cyber Shark',
        icon: '🦈',
        xp: 60,
        boostBy: 'anticeil 🐕',
      };
    } else if (rand > 0.45) {
      caughtFish = {
        amount: 4,
        type: 'Neon Salmon',
        icon: '🐠',
        xp: 25,
        boostBy: 'lawny 🐕',
      };
    }

    setFisherStats((prev) => ({
      ...prev,
      fishCount: prev.fishCount + caughtFish.amount,
      xp: prev.xp + caughtFish.xp,
      level: Math.floor((prev.xp + caughtFish.xp) / 50) + 1,
      lastCatch: caughtFish,
    }));

    const feedItem = {
      id: `f-${Date.now()}`,
      userName: currentUserName,
      message: `menangkap ${caughtFish.amount} ${caughtFish.icon} ${caughtFish.type} (+${caughtFish.xp} XP)`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setFisherFeed((prev) => [feedItem, ...prev.slice(0, 15)]);

    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'VIRTUAL_FISHER_CATCH',
      payload: feedItem,
    });

    toast.success(`Berhasil menangkap ${caughtFish.amount} ${caughtFish.icon} ${caughtFish.type}! (+${caughtFish.xp} XP)`);
  };

  const handleSellFish = () => {
    if (fisherStats.fishCount <= 0) {
      toast.info('Tas ikan Anda kosong! Lempar kail terlebih dahulu.');
      return;
    }
    const earnedCoins = fisherStats.fishCount * 12;
    setFisherStats((prev) => ({
      ...prev,
      fishCount: 0,
      coins: prev.coins + earnedCoins,
    }));
    toast.success(`Berhasil menjual ikan! Mendapatkan +${earnedCoins} Koin Emas 💰`);
  };

  // ── 8. Activity Socket Sync Events ─────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleActivityEvent = (data: {
      fromSocketId: string;
      fromUserId?: string;
      action: string;
      payload: any;
    }) => {
      if (data.action === 'ACTIVITY_LAUNCH') {
        const { appId, appName } = data.payload || {};
        if (appId) {
          setActiveAppId(appId);
          setIsAppLauncherOpen(false);
          toast.info(`${appName || 'Aktivitas'} diluncurkan oleh rekan panggilan!`);
        }
      } else if (data.action === 'ACTIVITY_STOP') {
        setActiveAppId(null);
        toast.info('Aktivitas dihentikan');
      } else if (data.action === 'YOUTUBE_CHANGE_VIDEO') {
        if (data.payload?.videoId) {
          setActiveVideoId(data.payload.videoId);
          toast.info('Video YouTube diubah oleh rekan panggilan');
        }
      } else if (data.action === 'VIRTUAL_FISHER_CATCH') {
        if (data.payload) {
          setFisherFeed((prev) => [data.payload, ...prev.slice(0, 15)]);
        }
      } else if (data.action === 'SCRATCHPAD_UPDATE') {
        setScratchpadCode(data.payload);
      } else if (data.action === 'FLOW_UPDATE') {
        if (Array.isArray(data.payload)) {
          setFlowNodes(data.payload);
        }
      } else if (data.action === 'FLOW_SIMULATE') {
        runSimulationSequence(false);
      } else if (data.action === 'WHITEBOARD_DRAW') {
        const { x0, y0, x1, y1, color, size } = data.payload || {};
        if (typeof x0 === 'number' && typeof y0 === 'number') {
          drawStroke(x0, y0, x1, y1, color, size);
        }
      } else if (data.action === 'WHITEBOARD_CLEAR') {
        clearCanvasLocal();
      }
    };

    socket.on('COMMUNITY_CALL_ACTIVITY_EVENT', handleActivityEvent);
    return () => {
      socket.off('COMMUNITY_CALL_ACTIVITY_EVENT', handleActivityEvent);
    };
  }, [socket, flowNodes, isSimulating]);

  // Total active count including local
  const totalInCall = participants.length + 1;

  const currentActiveApp = useMemo(() => {
    return DISCORD_APPS.find((app) => app.id === activeAppId);
  }, [activeAppId]);

  const filteredApps = useMemo(() => {
    if (!appSearchQuery.trim()) return DISCORD_APPS;
    const q = appSearchQuery.toLowerCase();
    return DISCORD_APPS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tagline.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q),
    );
  }, [appSearchQuery]);

  if (!isCallActive) return null;

  // ── Render Floating Picture-in-Picture Mini Stage ──────────────────────
  if (isPiP) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl bg-[#111214] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-9 px-3 bg-[#1e1f22] flex items-center justify-between border-b border-white/5 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-white truncate">
              {channel.name}
            </span>
            <span className="text-[10px] text-muted-foreground">({totalInCall})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePiP}
              className="h-6 w-6 text-muted-foreground hover:text-white"
              title="Perbesar Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEndCall}
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              title="Putus Panggilan"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Mini Preview Stage */}
        <div className="relative h-44 bg-[#1e1f22]/60 p-2 grid grid-cols-2 gap-1.5 items-center justify-center">
          {/* Local User Mini */}
          <div className="relative w-full h-full rounded-lg bg-[#2b2d31] overflow-hidden flex items-center justify-center border border-white/5">
            {!isVideoOff && localStream && localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled) ? (
              <LocalVideoView stream={localStream} />
            ) : (
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm transition-all',
                  isSpeakingLocal && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#2b2d31]',
                )}
              >
                {currentUserName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white">
              Anda {isMuted && '🔇'}
            </span>
          </div>

          {/* Remote Peer Mini */}
          {participants.length > 0 ? (
            <div className="relative w-full h-full rounded-lg bg-[#2b2d31] overflow-hidden flex items-center justify-center border border-white/5">
              {participants[0].stream && participants[0].hasVideo ? (
                <RemoteVideoView stream={participants[0].stream} isMuted={false} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400 font-bold text-sm">
                  {participants[0].userName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white truncate max-w-[80px]">
                {participants[0].userName} {!participants[0].hasAudio && '🔇'}
              </span>
            </div>
          ) : (
            <div className="w-full h-full rounded-lg bg-[#2b2d31]/50 border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-2">
              <span className="text-[10px] text-muted-foreground">Menunggu rekan...</span>
            </div>
          )}
        </div>

        {/* Mini Quick Actions */}
        <div className="h-10 px-3 bg-[#1e1f22] flex items-center justify-center gap-3 border-t border-white/5">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleMute}
            className={cn(
              'h-7 w-7 rounded-full',
              isMuted ? 'bg-red-500/20 text-red-400' : 'text-white hover:bg-white/10',
            )}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleVideo}
            className={cn(
              'h-7 w-7 rounded-full',
              isVideoOff ? 'bg-red-500/20 text-red-400' : 'text-white hover:bg-white/10',
            )}
          >
            {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="destructive"
            onClick={onEndCall}
            className="h-7 w-7 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Render Full Discord Stage View ────────────────────────────────────
  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col bg-[#111214] text-white select-none relative overflow-hidden group/stage">
      {/* ── Discord Top Stage Header Bar (Floating Overlay on Hover) ──── */}
      <div className="absolute top-0 inset-x-0 z-30 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-all duration-200 opacity-0 -translate-y-1 group-hover/stage:opacity-100 group-hover/stage:translate-y-0 focus-within:opacity-100 focus-within:translate-y-0 pointer-events-none">
        <div className="flex items-center gap-2.5 min-w-0 pointer-events-auto">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm backdrop-blur-sm">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0 drop-shadow-md">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-white truncate">
                #{channel.name}
              </span>
              {activeAppId !== null && currentActiveApp ? (
                <>
                  <span className="text-muted-foreground text-xs font-medium">·</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white/95 truncate">
                      {currentActiveApp.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-extrabold text-white flex items-center gap-1 tracking-wider shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/70">
                      720p 30FPS
                    </span>
                  </div>
                </>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  <Signal className="w-3 h-3" /> Voice Terhubung
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/70 truncate">
              {activeHub?.name || 'Komunitas Anticeil'} • {totalInCall} Peserta dalam panggilan
            </span>
          </div>
        </div>

        {/* Top Header Controls: Plan Pill, Screen Mode & PiP */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Stop Activity Button (Compact in Header like Discord) */}
          {activeAppId !== null && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStopActivity}
                    className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/30 gap-1.5 rounded-lg border border-red-500/40 bg-black/40 backdrop-blur-md shadow-sm"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hentikan Aktivitas</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Tutup aktivitas {currentActiveApp?.title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Freemium Limit Pill */}
          <div
            onClick={() => {
              if (!isPlusOrAbove) setIsUpgradeModalOpen(true);
            }}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all border backdrop-blur-md shadow-sm',
              isPlusOrAbove
                ? 'bg-primary/30 text-primary border-primary/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
            )}
            title={isPlusOrAbove ? 'Paket Plus / Unlimited Group Call' : 'Free Plan: Maks 2 Orang'}
          >
            {isPlusOrAbove ? (
              <>
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span>Plus Plan (Group Call Aktif)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Free Plan ({totalInCall}/2 Orang)</span>
              </>
            )}
          </div>

          {/* Picture in Picture Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onTogglePiP}
                  className="h-8 w-8 rounded-lg text-white/80 hover:text-white bg-black/40 hover:bg-white/10 backdrop-blur-md border border-white/10"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Minimize ke Picture-in-Picture
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Discord Main Stage Layout ──────────────────────────────────── */}
      {/* CASE A: DISCORD SCREEN SHARE / ACTIVITY FULL STAGE MODE */}
      {activeAppId !== null && currentActiveApp ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#111214] relative w-full h-full">
          {/* ── 1. Full-Stage Activity Container (Fills available space above filmstrip) ── */}
          <div
            className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative"
          >
            {/* ── Activity Window Body (The App itself) ──────────────── */}
            <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col bg-[#111214]">
              {/* APP 1: YOUTUBE WATCH TOGETHER (100% Discord UI/UX) */}
              {activeAppId === 'watch-together' && (
                <div className="h-full flex flex-col overflow-hidden bg-[#111214] select-none">
                  {/* ───────────────────────────────────────────────────────────
                      STATE 1: FULL EXPANDED PLAYER MODE (Screenshot 3)
                     ─────────────────────────────────────────────────────────── */}
                  {activeVideoId && isExpandedVideo ? (
                    <div className="relative w-full h-full bg-black flex flex-col">
                      {/* Floating Left Pill: "Playlist >" to toggle back to side-by-side */}
                      <button
                        onClick={() => setIsExpandedVideo(false)}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-zinc-900 font-bold text-xs shadow-2xl hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95"
                      >
                        <span>Playlist</span>
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </button>

                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                        title="YouTube Watch Together"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : activeVideoId && !isExpandedVideo ? (
                    /* ───────────────────────────────────────────────────────────
                       STATE 2: SIDE-BY-SIDE PLAYING & PLAYLIST MODE (Screenshot 2)
                       ─────────────────────────────────────────────────────────── */
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-[#111214]">
                      {/* Left Column (~44%): Player + Expand Pill + Playlist */}
                      <div className="w-full md:w-[44%] lg:w-[42%] flex flex-col border-b md:border-b-0 md:border-r border-white/10 p-4 gap-4 overflow-y-auto [scrollbar-width:thin]">
                        {/* Video Player Box with Centered "Expand Video" Pill */}
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl group shrink-0">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                            title="YouTube Watch Together"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />

                          {/* Discord Centered "Expand Video" Pill Button */}
                          <button
                            onClick={() => setIsExpandedVideo(true)}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-2xl transition-all hover:scale-105 active:scale-95"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Expand Video</span>
                          </button>
                        </div>

                        {/* Playlist Header Row */}
                        <div className="flex items-center justify-between shrink-0">
                          <div>
                            <h3 className="text-sm font-bold text-white leading-tight">
                              {channel?.name || 'general'} Playlist
                            </h3>
                            <p className="text-[11px] text-[#949ba4]">
                              Video {Math.max(1, ytPlaylist.findIndex((v) => v.id === activeVideoId) + 1)}/{Math.max(ytPlaylist.length, 1)}
                            </p>
                          </div>

                          {/* Hosting Badge Pill */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1f22] border border-white/10 text-white text-xs font-medium">
                            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                              {currentUserName?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span>You are <strong className="font-semibold text-[#5865f2]">hosting</strong></span>
                            <ChevronDown className="w-3.5 h-3.5 text-[#949ba4]" />
                          </div>
                        </div>

                        {/* Playlist Queue Items */}
                        <div className="flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                          {ytPlaylist.length === 0 ? (
                            /* Auto fallback to current playing video */
                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e1f22] border border-white/10">
                              <Play className="w-3.5 h-3.5 fill-current text-white shrink-0 ml-1" />
                              <div className="relative w-24 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                                <img
                                  src={`https://i.ytimg.com/vi/${activeVideoId}/hqdefault.jpg`}
                                  alt="Playing"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (!target.src.includes('mqdefault')) {
                                      target.src = `https://i.ytimg.com/vi/${activeVideoId}/mqdefault.jpg`;
                                    }
                                  }}
                                />
                                <span className="absolute inset-0 bg-black/45 flex items-center justify-center text-[10px] font-bold text-white tracking-wide">
                                  Playing
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">
                                  {ytVideos.find((v) => v.id === activeVideoId)?.title || 'Now Playing'}
                                </p>
                                <p className="text-[11px] text-[#949ba4] truncate">
                                  {ytVideos.find((v) => v.id === activeVideoId)?.channel || 'YouTube'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">
                                    {currentUserName?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  <span className="text-[11px] text-[#949ba4]">{currentUserName}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            ytPlaylist.map((item, idx) => {
                              const isPlaying = item.id === activeVideoId;
                              return (
                                <div
                                  key={`${item.id}-${idx}`}
                                  onClick={() => setActiveVideoId(item.id)}
                                  className={cn(
                                    'flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer',
                                    isPlaying
                                      ? 'bg-[#1e1f22] border-[#5865f2]/40 shadow-sm'
                                      : 'bg-[#1e1f22]/70 border-white/5 hover:border-white/15 hover:bg-[#1e1f22]'
                                  )}
                                >
                                  <Play className={cn("w-3.5 h-3.5 shrink-0 ml-1", isPlaying ? "fill-current text-white" : "text-white/40")} />
                                  <div className="relative w-24 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                                    <img
                                      src={item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.includes('mqdefault')) {
                                          target.src = `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`;
                                        }
                                      }}
                                    />
                                    {isPlaying ? (
                                      <span className="absolute inset-0 bg-black/45 flex items-center justify-center text-[10px] font-bold text-white tracking-wide">
                                        Playing
                                      </span>
                                    ) : item.duration ? (
                                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-semibold px-1 py-0.2 rounded">
                                        {item.duration}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-semibold truncate", isPlaying ? "text-white" : "text-white/80")}>
                                      {item.title}
                                    </p>
                                    <p className="text-[11px] text-[#949ba4] truncate">{item.channel}</p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">
                                        {item.addedBy?.[0]?.toUpperCase() || 'U'}
                                      </div>
                                      <span className="text-[11px] text-[#949ba4]">{item.addedBy}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Right Column (~56%): Search + Trending Grid (with checkmark on playing/queued) */}
                      <div className="flex-1 min-h-0 flex flex-col p-4 gap-4 overflow-y-auto [scrollbar-width:thin]">
                        {/* Search Input */}
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={ytSearchQuery}
                            onChange={(e) => setYtSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handlePlayYouTubeUrl(ytSearchQuery);
                              }
                            }}
                            placeholder="Search or paste YouTube URL"
                            className="w-full bg-[#1e1f22] border border-white/10 rounded-full pl-5 pr-11 py-2.5 text-xs text-white placeholder:text-[#949ba4] focus:outline-none focus:border-[#5865f2] transition-colors"
                          />
                          <Search className="w-4 h-4 text-[#949ba4] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Section Header */}
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                          <span>Trending Videos</span>
                        </div>

                        {/* Videos Grid in Side-by-Side Mode */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {ytDisplayVideos.map((video) => {
                            const isQueuedOrPlaying = activeVideoId === video.id || ytPlaylist.some((p) => p.id === video.id);
                            return (
                              <div
                                key={video.id}
                                onClick={() => handleSelectVideo(video)}
                                className="group cursor-pointer flex flex-col"
                              >
                                {/* Thumbnail */}
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/8 group-hover:border-white/20 transition-all">
                                  <img
                                    src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                                    alt={video.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      if (!target.src.includes('mqdefault')) {
                                        target.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
                                      }
                                    }}
                                  />

                                  {/* Discord Green Checkmark on Active/Queued (Screenshot 2) */}
                                  {isQueuedOrPlaying ? (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                      <div className="w-9 h-9 rounded-full bg-[#23a55a] flex items-center justify-center text-white shadow-xl">
                                        <Check className="w-5 h-5 stroke-[3]" />
                                      </div>
                                    </div>
                                  ) : (
                                    /* Hover "+" button to add to queue */
                                    <button
                                      onClick={(e) => handleAddToQueue(e, video)}
                                      title="Add to queue"
                                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                      <Plus className="w-4 h-4 stroke-[2.5]" />
                                    </button>
                                  )}

                                  {/* Duration Badge */}
                                  {video.duration && (
                                    <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                      {video.duration}
                                    </span>
                                  )}
                                </div>

                                {/* Metadata */}
                                <div className="mt-2 flex flex-col">
                                  <p className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                                    {video.title}
                                  </p>
                                  <span className="text-[11px] text-[#949ba4] mt-1 truncate">
                                    {video.channel}
                                  </span>
                                  <span className="text-[11px] text-[#949ba4] mt-0.5">
                                    {[video.views, video.uploadedAt].filter(Boolean).join(' • ')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ───────────────────────────────────────────────────────────
                       STATE 3: FULL BROWSE MODE (Screenshot 1)
                       ─────────────────────────────────────────────────────────── */
                    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto [scrollbar-width:thin] bg-[#111214] p-5 lg:p-6 gap-5">
                      {/* Top Header: Centered "Watch Together" Title */}
                      <div className="text-center shrink-0">
                        <h2 className="text-sm font-semibold text-white tracking-wide">
                          Watch Together
                        </h2>
                      </div>

                      {/* Header Row: Hosting Pill + Search Bar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                        {/* Hosting Badge Pill */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1f22] border border-white/10 text-white text-xs font-medium w-fit">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                            {currentUserName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span>You are <strong className="font-semibold text-[#5865f2]">hosting</strong></span>
                          <ChevronDown className="w-3.5 h-3.5 text-[#949ba4]" />
                        </div>

                        {/* Search or Paste URL Input */}
                        <div className="relative flex-1 max-w-xl">
                          <input
                            type="text"
                            value={ytSearchQuery}
                            onChange={(e) => setYtSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handlePlayYouTubeUrl(ytSearchQuery);
                              }
                            }}
                            placeholder="Search or paste YouTube URL"
                            className="w-full bg-[#1e1f22] border border-white/10 rounded-full pl-5 pr-11 py-2.5 text-xs text-white placeholder:text-[#949ba4] focus:outline-none focus:border-[#5865f2] transition-colors"
                          />
                          <Search className="w-4 h-4 text-[#949ba4] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Section Header: Trending Videos */}
                      <div className="flex items-center gap-2 text-white font-bold text-sm shrink-0">
                        <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                        <span>Trending Videos</span>
                      </div>

                      {/* Video Grid (4 Columns on Desktop) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {ytDisplayVideos.map((video) => (
                          <div
                            key={video.id}
                            onClick={() => handleSelectVideo(video)}
                            className="group cursor-pointer flex flex-col"
                          >
                            {/* Thumbnail Box */}
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/8 group-hover:border-white/20 transition-all">
                              <img
                                src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.src.includes('mqdefault')) {
                                    target.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
                                  }
                                }}
                              />

                              {/* Hover "+" Button to Queue */}
                              <button
                                onClick={(e) => handleAddToQueue(e, video)}
                                title="Add to queue"
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              </button>

                              {/* Duration Badge */}
                              {video.duration && (
                                <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                  {video.duration}
                                </span>
                              )}
                            </div>

                            {/* Metadata */}
                            <div className="mt-2.5 flex flex-col">
                              <p className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                                {video.title}
                              </p>
                              <span className="text-[11px] text-[#949ba4] mt-1 truncate">
                                {video.channel}
                              </span>
                              <span className="text-[11px] text-[#949ba4] mt-0.5">
                                {[video.views, video.uploadedAt].filter(Boolean).join(' • ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Small Discord-style Footer */}
                      <div className="mt-auto pt-6 pb-2 flex items-center justify-between text-[11px] text-[#949ba4]/60">
                        <span className="hover:text-[#949ba4] cursor-pointer transition-colors">YouTube Terms and Privacy</span>
                        <span>Build Version: 126</span>
                        <span className="hover:text-[#949ba4] cursor-pointer transition-colors">Open Font License</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* APP 2: VIRTUAL FISHER (Matching screenshot) */}
              {activeAppId === 'virtual-fisher' && (
                <div className="h-full flex flex-col md:flex-row overflow-hidden min-h-0">
                  {/* Left: Fishing Stage & Actions */}
                  <div className="flex-1 min-h-0 p-4 flex flex-col items-center justify-center bg-gradient-to-b from-[#111214] via-[#141b24] to-[#0a111a] relative overflow-y-auto">
                    {/* Atmospheric Water & Catch Box (Exact Discord format) */}
                    <div className="w-full max-w-md bg-[#1e1f22] rounded-2xl border border-white/10 p-5 shadow-2xl relative">
                      {/* Sub-header author */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
                          🎣
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white">{currentUserName}</span>
                          <span className="text-xs text-muted-foreground">used</span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold text-xs border border-cyan-800">
                            ::fish
                          </span>
                        </div>
                      </div>

                      {/* Discord App Rich Card */}
                      <div className="rounded-xl bg-[#2b2d31]/90 border border-white/10 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-white">Virtual Fisher</span>
                            <span className="bg-[#5865F2] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> APP
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">Level {fisherStats.level}</span>
                        </div>

                        {/* Catch text matching screenshot */}
                        <div className="space-y-1 py-1">
                          <p className="text-xs font-semibold text-white/90">
                            <strong>{currentUserName}</strong>
                          </p>
                          <p className="text-base font-extrabold text-emerald-400 flex items-center gap-2">
                            You caught:
                          </p>
                          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
                            <div className="text-lg font-black text-white flex items-center gap-2">
                              <span>{fisherStats.lastCatch.amount}</span>
                              <span className="text-2xl">{fisherStats.lastCatch.icon}</span>
                              <span>{fisherStats.lastCatch.type}</span>
                            </div>
                            <div className="text-xs font-bold text-emerald-400">
                              +{fisherStats.lastCatch.xp} XP
                            </div>
                            <div className="text-[11px] text-muted-foreground italic">
                              Global boost by <strong className="text-amber-300">{fisherStats.lastCatch.boostBy}</strong>!
                            </div>
                          </div>
                        </div>

                        {/* Cooldown feedback */}
                        {fisherCooldown > 0 && (
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                            <span>Tunggu <strong>{fisherCooldown}s</strong> sebelum memancing lagi</span>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        )}

                        {/* Discord Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <Button
                            onClick={handleFishAction}
                            disabled={fisherCooldown > 0}
                            className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs gap-1.5 shadow-md"
                          >
                            <Fish className="w-3.5 h-3.5" />
                            Fish Again
                          </Button>
                          <Button
                            onClick={handleSellFish}
                            variant="outline"
                            className="border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs gap-1"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            Sell
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => toast.info(`Tas Ikan: ${fisherStats.fishCount} Ikan, Koin: ${fisherStats.coins}`)}
                            className="text-muted-foreground hover:text-white text-xs"
                          >
                            Inventory
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Server Activity Feed & Leaderboard */}
                  <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-[#1e1f22]/95 p-4 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-400" /> Server Catch Log
                      </span>
                      <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" /> {fisherStats.coins}
                      </span>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 [scrollbar-width:thin]">
                      {fisherFeed.map((item) => (
                        <div key={item.id} className="p-2 rounded-lg bg-[#2b2d31]/60 border border-white/5 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span className="font-bold text-white">{item.userName}</span>
                            <span>{item.timestamp}</span>
                          </div>
                          <span className="text-white/90">{item.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* APP 3: WORDLE GAME */}
              {activeAppId === 'wordle' && (
                <div className="h-full min-h-0 flex flex-col items-center justify-center p-4 bg-[#111214] overflow-y-auto">
                  <div className="w-full max-w-sm flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black tracking-widest text-white">W O R D L E</span>
                      <span className="bg-[#5865F2] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                        ✓ APP
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Tebak 5 huruf tersembunyi bersama rekan tim</span>

                    {/* Wordle Rows */}
                    <div className="grid grid-rows-6 gap-2 w-full max-w-[280px]">
                      {Array.from({ length: 6 }).map((_, rowIdx) => {
                        const guess = wordleGuesses[rowIdx] || '';
                        return (
                          <div key={rowIdx} className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 5 }).map((_, colIdx) => {
                              const char = guess[colIdx] || '';
                              let tileStyle = 'bg-[#2b2d31] border-white/20 text-white';
                              if (guess) {
                                if (wordleTarget[colIdx] === char) {
                                  tileStyle = 'bg-emerald-600 border-emerald-500 text-white';
                                } else if (wordleTarget.includes(char)) {
                                  tileStyle = 'bg-amber-600 border-amber-500 text-white';
                                } else {
                                  tileStyle = 'bg-[#1e1f22] border-white/10 text-muted-foreground';
                                }
                              }
                              return (
                                <div
                                  key={colIdx}
                                  className={cn(
                                    'aspect-square rounded-lg border-2 flex items-center justify-center text-xl font-black uppercase transition-all',
                                    tileStyle,
                                  )}
                                >
                                  {char}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Input for Wordle */}
                    <div className="w-full max-w-[280px] flex gap-2">
                      <input
                        type="text"
                        maxLength={5}
                        value={wordleCurrentInput}
                        onChange={(e) => setWordleCurrentInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && wordleCurrentInput.length === 5) {
                            setWordleGuesses((prev) => [...prev, wordleCurrentInput]);
                            setWordleCurrentInput('');
                            if (wordleCurrentInput === wordleTarget) {
                              toast.success('🎉 SELAMAT! Anda dan tim berhasil menebak kata Wordle!');
                            }
                          }
                        }}
                        placeholder="TEBAK KATA (5 HURUF)"
                        className="flex-1 bg-[#2b2d31] border border-white/20 rounded-lg px-3 py-2 text-center font-bold tracking-widest text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (wordleCurrentInput.length === 5) {
                            setWordleGuesses((prev) => [...prev, wordleCurrentInput]);
                            setWordleCurrentInput('');
                            if (wordleCurrentInput === wordleTarget) {
                              toast.success('🎉 SELAMAT! Anda dan tim berhasil menebak kata Wordle!');
                            }
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs"
                      >
                        Kirim
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* APP 4: MAGIC GARDEN */}
              {activeAppId === 'magic-garden' && (
                <div className="h-full min-h-0 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#141b24] to-[#0f172a] overflow-y-auto">
                  <div className="w-full max-w-2xl bg-[#1e1f22]/90 border border-white/10 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">Magic Garden Server</span>
                        <span className="bg-[#5865F2] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                          ✓ APP
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Skor Kebun: {gardenScore} XP
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {gardenPlots.map((plot) => (
                        <div
                          key={plot.id}
                          className="p-4 rounded-xl bg-[#2b2d31] border border-white/10 flex flex-col items-center justify-center gap-2 text-center group hover:border-amber-500/40 transition-all"
                        >
                          <div className="text-3xl animate-bounce-short">{plot.icon}</div>
                          <span className="text-xs font-bold text-white">{plot.name}</span>
                          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all"
                              style={{ width: `${plot.progress}%` }}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (plot.ready) {
                                setGardenScore((prev) => prev + 50);
                                setGardenPlots((prev) =>
                                  prev.map((p) => (p.id === plot.id ? { ...p, progress: 15, ready: false } : p)),
                                );
                                toast.success(`Panen ${plot.name}! +50 XP Kebun`);
                              } else {
                                setGardenPlots((prev) =>
                                  prev.map((p) =>
                                    p.id === plot.id
                                      ? { ...p, progress: Math.min(100, p.progress + 30), ready: p.progress + 30 >= 100 }
                                      : p,
                                  ),
                                );
                                toast.info(`Menyiram ${plot.name}! Tanaman tumbuh.`);
                              }
                            }}
                            className={cn(
                              'w-full h-7 text-xs font-semibold',
                              plot.ready
                                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                                : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30',
                            )}
                          >
                            {plot.ready ? '🌾 Panen' : '💧 Siram'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* APP 5: ANTICEIL FLOW BUILDER */}
              {activeAppId === 'flow-canvas' && (
                <div className="h-full min-h-0 flex flex-col p-3 gap-2 overflow-hidden">
                  {/* Flow Toolbar */}
                  <div className="p-3 rounded-xl bg-[#2b2d31] border border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => runSimulationSequence(true)}
                        disabled={isSimulating}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow"
                      >
                        {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        {isSimulating ? 'Simulasi Berjalan...' : 'Simulasikan Eksekusi Alur'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddFlowNode}
                        className="border-white/10 hover:bg-white/10 text-xs gap-1 text-white"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetFlow}
                        className="text-xs text-muted-foreground hover:text-white gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </Button>
                    </div>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Semua rekan di panggilan melihat simulasi secara sinkron realtime
                    </span>
                  </div>

                  {/* Flow Steps */}
                  <div className="flex-1 min-h-0 p-4 bg-[#111214] rounded-xl border border-white/5 flex flex-col gap-3 overflow-y-auto">
                    {flowNodes.map((node, index) => {
                      const isLast = index === flowNodes.length - 1;
                      return (
                        <div key={node.id} className="flex flex-col items-center">
                          <div
                            className={cn(
                              'w-full max-w-xl p-4 rounded-xl border transition-all duration-300 flex items-center justify-between',
                              node.status === 'running' && 'bg-primary/20 border-primary ring-2 ring-primary/40 scale-102',
                              node.status === 'success' && 'bg-emerald-950/40 border-emerald-500/60',
                              node.status === 'idle' && 'bg-[#1e1f22] border-white/10 hover:border-white/20',
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold',
                                  node.type === 'trigger' && 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
                                  node.type === 'ai' && 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
                                  node.type === 'action' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
                                  node.type === 'db' && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
                                )}
                              >
                                {node.type === 'trigger' && <Zap className="w-4 h-4" />}
                                {node.type === 'ai' && <Bot className="w-4 h-4" />}
                                {node.type === 'action' && <Workflow className="w-4 h-4" />}
                                {node.type === 'db' && <Database className="w-4 h-4" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white truncate">{node.title}</span>
                                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/5 text-muted-foreground">
                                    {node.type}
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground truncate">{node.description}</span>
                              </div>
                            </div>

                            <div className="shrink-0 ml-2">
                              {node.status === 'running' && (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary animate-pulse">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running
                                </span>
                              )}
                              {node.status === 'success' && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK ({node.duration})
                                </span>
                              )}
                              {node.status === 'idle' && <span className="text-[10px] text-muted-foreground">Menunggu</span>}
                            </div>
                          </div>

                          {!isLast && (
                            <div className="w-0.5 h-5 bg-gradient-to-b from-white/20 to-white/10 my-1 relative flex items-center justify-center">
                              <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* APP 6: JAMSPACE WHITEBOARD */}
              {activeAppId === 'whiteboard' && (
                <div className="h-full min-h-0 flex flex-col p-3 gap-2 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-[#2b2d31] border border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground mr-1">Warna:</span>
                      {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ffffff'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setDrawColor(color)}
                          className={cn(
                            'w-5 h-5 rounded-full transition-all border',
                            drawColor === color ? 'scale-125 border-white ring-2 ring-primary' : 'border-transparent opacity-80 hover:opacity-100',
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <div className="w-[1px] h-4 bg-white/10 mx-1.5" />
                      <span className="text-xs font-semibold text-muted-foreground">Tebal:</span>
                      {[2, 4, 8].map((size) => (
                        <button
                          key={size}
                          onClick={() => setBrushSize(size)}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-bold transition-all',
                            brushSize === size ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white',
                          )}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearCanvas}
                      className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Bersihkan Papan
                    </Button>
                  </div>

                  <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-white/10 relative bg-[#111214]">
                    <canvas
                      ref={whiteboardCanvasRef}
                      width={1200}
                      height={700}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const scaleX = e.currentTarget.width / rect.width;
                        const scaleY = e.currentTarget.height / rect.height;
                        const x = (e.clientX - rect.left) * scaleX;
                        const y = (e.clientY - rect.top) * scaleY;
                        isDrawing.current = true;
                        lastCoord.current = { x, y };
                      }}
                      onMouseMove={(e) => {
                        if (!isDrawing.current || !lastCoord.current) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const scaleX = e.currentTarget.width / rect.width;
                        const scaleY = e.currentTarget.height / rect.height;
                        const x = (e.clientX - rect.left) * scaleX;
                        const y = (e.clientY - rect.top) * scaleY;
                        drawStroke(lastCoord.current.x, lastCoord.current.y, x, y, drawColor, brushSize);
                        socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                          channelId: channel.id,
                          action: 'WHITEBOARD_DRAW',
                          payload: {
                            x0: lastCoord.current.x,
                            y0: lastCoord.current.y,
                            x1: x,
                            y1: y,
                            color: drawColor,
                            size: brushSize,
                          },
                        });
                        lastCoord.current = { x, y };
                      }}
                      onMouseUp={() => {
                        isDrawing.current = false;
                        lastCoord.current = null;
                      }}
                      onMouseLeave={() => {
                        isDrawing.current = false;
                        lastCoord.current = null;
                      }}
                      className="w-full h-full cursor-crosshair touch-none"
                    />
                  </div>
                </div>
              )}

              {/* APP 7: DEV CODE RUNNER & SCRATCHPAD */}
              {activeAppId === 'code-runner' && (
                <div className="h-full min-h-0 flex flex-col p-3 gap-2 overflow-hidden">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-primary" /> Live Code & JSON Playground
                    </span>
                    <Button
                      size="sm"
                      onClick={handleRunScratchpad}
                      disabled={isExecutingScript}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Jalankan Script / Validasi
                    </Button>
                  </div>
                  <textarea
                    value={scratchpadCode}
                    onChange={(e) => {
                      setScratchpadCode(e.target.value);
                      socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                        channelId: channel.id,
                        action: 'SCRATCHPAD_UPDATE',
                        payload: e.target.value,
                      });
                    }}
                    className="flex-1 min-h-0 w-full bg-[#111214] border border-white/10 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none [scrollbar-width:thin] leading-relaxed select-text"
                    placeholder="Tulis kode Javascript atau payload JSON di sini..."
                  />

                  {/* Terminal Execution Output Console */}
                  <div className="h-28 shrink-0 bg-black/90 border border-white/10 rounded-xl p-3 font-mono text-[11px] text-white/90 overflow-y-auto [scrollbar-width:thin] select-text">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Console Output:</span>
                      <button
                        onClick={() => setScratchpadOutput(null)}
                        className="text-muted-foreground hover:text-white text-[10px]"
                      >
                        Bersihkan
                      </button>
                    </div>
                    {scratchpadOutput ? (
                      <pre className="text-emerald-300 whitespace-pre-wrap">{scratchpadOutput}</pre>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Klik tombol "Jalankan Script / Validasi" di atas untuk melihat hasil eksekusi realtime.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Discord Bottom Filmstrip (Participant Video/Avatar Tiles at BOTTOM) ── */}
          <div className="shrink-0 flex flex-col items-center z-10 px-3 pb-1">
            {/* Collapse / Expand Toggle Pill (Discord Style) */}
            <button
              onClick={() => setIsFilmstripCollapsed(!isFilmstripCollapsed)}
              className="h-5 px-3 -mb-1 rounded-full bg-[#2b2d31] hover:bg-[#35373c] text-white/70 hover:text-white text-[10px] font-semibold flex items-center gap-1.5 transition-all border border-white/10 shadow-md cursor-pointer z-20"
              title={isFilmstripCollapsed ? 'Tampilkan Kamera Peserta' : 'Sembunyikan Kamera Peserta'}
            >
              {isFilmstripCollapsed ? (
                <>
                  <ChevronUp className="w-3 h-3 text-emerald-400" />
                  <Users className="w-2.5 h-2.5" />
                  <span>Kamera & Peserta ({totalInCall})</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  <Users className="w-2.5 h-2.5" />
                  <span>Sembunyikan ({totalInCall})</span>
                </>
              )}
            </button>

            {/* Video Cards Filmstrip (Horizontally centered like Discord) */}
            {!isFilmstripCollapsed && (
              <div className="w-full max-w-5xl py-1 flex items-center justify-center gap-2 overflow-x-auto [scrollbar-width:thin] animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Local Participant Tile */}
                <div className="w-28 sm:w-36 h-20 sm:h-24 rounded-xl bg-[#2b2d31] border border-white/10 relative overflow-hidden shrink-0 flex items-center justify-center shadow-lg group">
                  {!isVideoOff && localStream && localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled) ? (
                    <LocalVideoView stream={localStream} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div
                        className={cn(
                          'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all',
                          isSpeakingLocal
                            ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#2b2d31]'
                            : 'ring-1 ring-white/10',
                        )}
                      >
                        <CommunityAvatar
                          name={currentUserName}
                          imageUrl={currentUser?.imageUrl}
                          email={currentUser?.email}
                          size={44}
                          showStatus={false}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[90px]">
                        {currentUserName}
                      </span>
                    </div>
                  )}
                  {/* Bottom tag */}
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs flex items-center gap-1 text-[9px] font-semibold text-white border border-white/5">
                    <span>Anda</span>
                    {isMuted ? <MicOff className="w-2.5 h-2.5 text-red-400" /> : <Mic className="w-2.5 h-2.5 text-emerald-400" />}
                  </div>
                </div>

                {/* Remote Participants Tiles */}
                {participants.map((peer) => (
                  <div
                    key={peer.socketId}
                    className="w-28 sm:w-36 h-20 sm:h-24 rounded-xl bg-[#2b2d31] border border-white/10 relative overflow-hidden shrink-0 flex items-center justify-center shadow-lg group"
                  >
                    {peer.stream && peer.hasVideo && peer.stream.getVideoTracks().some((t) => t.readyState === 'live') ? (
                      <RemoteVideoView stream={peer.stream} isMuted={false} />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center ring-1 ring-white/10">
                          <CommunityAvatar
                            name={peer.userName}
                            imageUrl={peer.userAvatar}
                            size={44}
                            showStatus={false}
                            className="w-full h-full rounded-full"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[90px]">
                          {peer.userName}
                        </span>
                      </div>
                    )}
                    {/* Bottom tag */}
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs flex items-center gap-1 text-[9px] font-semibold text-white border border-white/5">
                      <span className="truncate max-w-[75px]">{peer.userName}</span>
                      {!peer.hasAudio ? <MicOff className="w-2.5 h-2.5 text-red-400" /> : <Mic className="w-2.5 h-2.5 text-emerald-400" />}
                    </div>
                  </div>
                ))}

                {/* Screen Share Tile if sharing */}
                {isScreenSharing && (
                  <div className="w-28 sm:w-36 h-20 sm:h-24 rounded-xl bg-[#2b2d31] border border-emerald-500/40 relative overflow-hidden shrink-0 flex items-center justify-center shadow-lg group">
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded bg-red-600 text-[8px] font-extrabold text-white flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs flex items-center gap-1 text-[9px] font-semibold text-white border border-white/5">
                      <Monitor className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="truncate max-w-[80px]">Layar Anda</span>
                    </div>
                  </div>
                )}

                {/* Solitary Invite Prompt in Filmstrip */}
                {participants.length === 0 && !isScreenSharing && (
                  <div className="h-20 sm:h-24 px-4 rounded-xl bg-[#2b2d31]/40 border border-dashed border-white/10 flex items-center gap-3 shrink-0">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">Anda sendirian di panggung</span>
                      <span className="text-[10px] text-muted-foreground">Undang rekan tim untuk menikmati aktivitas bersama</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCopyCallLink}
                      className="h-7 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> Salin Link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CASE B: NORMAL DISCORD VIDEO GRID STAGE */
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full h-full">
          <div className="flex-1 min-h-0 min-w-0 bg-transparent border-0 flex flex-col overflow-hidden w-full h-full">
            <div
              className={cn(
                'flex-1 min-h-0 relative flex items-center justify-center p-2 w-full h-full',
                participants.length > 0 && 'grid gap-3 w-full h-full',
                participants.length === 1 && 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto',
                participants.length >= 2 && 'grid-cols-2 md:grid-cols-3 max-w-6xl mx-auto',
              )}
            >


              {/* LOCAL PARTICIPANT TILE */}
              <div
                className={cn(
                  'relative rounded-2xl overflow-hidden flex items-center justify-center transition-all',
                  participants.length === 0
                    ? 'w-full h-full bg-transparent border-0 shadow-none'
                    : 'w-full h-full bg-[#2b2d31] border border-white/5 shadow-lg group',
                )}
              >
                {!isVideoOff && localStream && localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled) ? (
                  <LocalVideoView stream={localStream} />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <div className="relative">
                      <div
                        className={cn(
                          'w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 relative z-10',
                          isSpeakingLocal
                            ? 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-[#111214] scale-105'
                            : 'ring-2 ring-white/10',
                        )}
                      >
                        <CommunityAvatar
                          name={currentUserName}
                          imageUrl={currentUser?.imageUrl}
                          email={currentUser?.email}
                          size={104}
                          showStatus={false}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      {isSpeakingLocal && (
                        <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-xl animate-pulse -z-0" />
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-base font-bold text-white tracking-wide">{currentUserName}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {isVideoOff ? <VideoOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                        {isVideoOff ? 'Kamera Mati' : 'Voice Aktif'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status Pill Bottom-Left */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs flex items-center gap-2 text-xs font-semibold text-white border border-white/10 z-10">
                  <span className="truncate max-w-[140px]">{currentUserName} (Anda)</span>
                  {isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : isSpeakingLocal ? (
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>

                {isScreenSharing && (
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded bg-primary text-[10px] font-bold text-white flex items-center gap-1 z-10">
                    <Monitor className="w-3 h-3" /> Berbagi Layar
                  </div>
                )}
              </div>

              {/* REMOTE PARTICIPANTS TILES */}
              {participants.map((peer) => (
                <div
                  key={peer.socketId}
                  className="relative w-full h-full rounded-2xl bg-[#2b2d31] border border-white/5 overflow-hidden flex items-center justify-center shadow-lg group"
                >
                  {peer.stream && peer.hasVideo && peer.stream.getVideoTracks().some((t) => t.readyState === 'live') ? (
                    <RemoteVideoView stream={peer.stream} isMuted={false} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-6">
                      <div className="relative">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center ring-2 ring-white/10 relative z-10">
                          <CommunityAvatar
                            name={peer.userName}
                            imageUrl={peer.userAvatar}
                            size={104}
                            showStatus={false}
                            className="w-full h-full rounded-full"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-base font-bold text-white tracking-wide">{peer.userName}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          {!peer.hasAudio ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                          {!peer.hasAudio ? 'Muted' : 'Tersambung'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs flex items-center gap-2 text-xs font-semibold text-white border border-white/10 z-10">
                    <span className="truncate max-w-[140px]">{peer.userName}</span>
                    {!peer.hasAudio ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>

                  {peer.isScreenSharing && (
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded bg-primary text-[10px] font-bold text-white flex items-center gap-1 z-10">
                      <Monitor className="w-3 h-3" /> Berbagi Layar
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Discord Bottom Floating Control Dock ────────────────────────── */}
      <div className="h-16 shrink-0 flex items-center justify-center px-4 bg-gradient-to-t from-[#111214] via-[#111214]/90 to-transparent z-20 pb-2">
        <div className="px-4 py-2 rounded-2xl bg-[#1e1f22] border border-white/10 shadow-2xl flex items-center gap-2.5">
          {/* Mute Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleMute}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                    isMuted
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {isMuted ? 'Nyalakan Mikrofon' : 'Matikan Mikrofon'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Camera Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleVideo}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                    isVideoOff
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {isVideoOff ? 'Nyalakan Kamera' : 'Matikan Kamera'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Screen Share Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleScreenShare}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                    isScreenSharing
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {isScreenSharing ? 'Hentikan Berbagi Layar' : 'Berbagi Layar (Screen Share)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Discord Activity Rocket Launcher Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsAppLauncherOpen(true)}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md relative',
                    activeAppId !== null
                      ? 'bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-[#5865F2]/40'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  <Rocket className="w-5 h-5" />
                  {activeAppId !== null && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#1e1f22]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {activeAppId !== null ? `Aktivitas Aktif (${currentActiveApp?.title}) - Ganti` : 'Luncurkan Anticeil Activity (Apps & Games)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Copy Call Link Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopyCallLink}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md bg-[#2b2d31] hover:bg-white/15 text-white"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                Salin Link Panggilan
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-[1px] h-6 bg-white/10 mx-1" />

          {/* Disconnect Call Button (Red Phone Off) */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onEndCall}
                  className="w-12 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-red-600/30"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-bold text-red-400">
                Putus Panggilan
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── DISCORD-STYLE APP LAUNCHER MODAL / DRAWER (Matching screenshot) ── */}
      <Dialog open={isAppLauncherOpen} onOpenChange={setIsAppLauncherOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl p-0 bg-[#1e1f22] border-white/15 text-white overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
          {/* Top Search Bar */}
          <div className="p-4 bg-[#2b2d31] border-b border-white/10 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
                placeholder="Search Apps & Commands"
                className="w-full bg-[#111214] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all"
              />
            </div>
            {activeAppId !== null && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStopActivity}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 text-xs shrink-0"
              >
                Hentikan Aktivitas Saat Ini
              </Button>
            )}
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 overflow-y-auto space-y-6 [scrollbar-width:thin] bg-[#111214]">
            {/* 1. Recents Row (Circular / Squircle Icons) */}
            {!appSearchQuery && (
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-muted-foreground tracking-wider uppercase">
                  Recents
                </span>
                <div className="flex items-center gap-3">
                  {DISCORD_APPS.filter((a) => a.isRecent).map((app) => (
                    <TooltipProvider key={app.id} delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleLaunchApp(app.id)}
                            className={cn(
                              'w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md border hover:scale-105',
                              app.iconBg,
                              activeAppId === app.id
                                ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#111214]'
                                : 'border-white/10',
                            )}
                          >
                            <app.icon className="w-6 h-6 text-white" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs font-semibold">
                          {app.title}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Apps in this Server (Featured Row) */}
            {!appSearchQuery && (
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-muted-foreground tracking-wider uppercase">
                  Apps in this Server
                </span>
                <div
                  onClick={() => handleLaunchApp('virtual-fisher')}
                  className="p-3.5 rounded-xl bg-[#1e1f22] border border-white/10 hover:border-[#5865F2]/50 hover:bg-[#2b2d31]/80 transition-all flex items-center justify-between cursor-pointer group shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500 flex items-center justify-center text-white shrink-0 shadow">
                      <Fish className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          VirtualFisher
                        </span>
                        <span className="bg-[#5865F2] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> APP
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        Virtual Fisher is a game you can play in your server focused on catching rare fish...
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs ml-3 shrink-0"
                  >
                    Luncurkan
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Promoted / Banners Grid (Rich Banner Cards from Screenshot) */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-muted-foreground tracking-wider uppercase">
                {appSearchQuery ? 'Hasil Pencarian Apps' : 'Promoted / Semua Aktivitas'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleLaunchApp(app.id)}
                    className={cn(
                      'rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer group flex flex-col shadow-lg',
                      activeAppId === app.id
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-[#1e1f22]'
                        : 'border-white/10 bg-[#1e1f22] hover:border-white/25 hover:shadow-2xl hover:-translate-y-0.5',
                    )}
                  >
                    {/* Graphical Top Banner */}
                    <div
                      className={cn(
                        'h-28 w-full p-3.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br',
                        app.bannerGradient,
                      )}
                    >
                      {/* Decorative ambient glowing circles */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                      <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-black/20 blur-lg pointer-events-none" />

                      {/* Top tags */}
                      <div className="flex items-center justify-between relative z-10">
                        {app.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-black/50 text-white backdrop-blur-md border border-white/10">
                            {app.badge}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-white/80 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-xs">
                          {app.developer}
                        </span>
                      </div>

                      {/* Center big illustration mark */}
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <app.icon className="w-8 h-8 text-white/90 drop-shadow-md" />
                          <span className="text-base font-black text-white drop-shadow tracking-wide">
                            {app.title}
                          </span>
                        </div>
                        {activeAppId === app.id && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500 text-black text-[10px] font-bold flex items-center gap-1 shadow">
                            <Check className="w-3 h-3 stroke-[3]" /> Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom Meta */}
                    <div className="p-3.5 bg-[#2b2d31] flex items-start gap-3 flex-1">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform',
                          app.iconBg,
                        )}
                      >
                        <app.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                            {app.title}
                          </span>
                          <span className="bg-[#5865F2] text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5 shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> APP
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {app.description}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Discord Nitro / Anticeil Plus Paywall Modal ──────────────────── */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 bg-[#1e1f22] border-white/15 text-white overflow-hidden shadow-2xl">
          <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 flex flex-col justify-end">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/40 text-white backdrop-blur-md w-fit mb-1 border border-white/20">
              <Crown className="w-3.5 h-3.5 text-amber-300" /> ANTICEIL PLUS
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              Batas Peserta Tercapai (Free Plan)
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Paket <strong className="text-white">Free</strong> mendukung panggilan video & suara 1-on-1 gratis selamanya (maksimal 2 orang). Untuk menghubungkan <strong className="text-white">3 orang atau lebih</strong> dalam group call bersama tim Anda, silakan tingkatkan ke paket <strong className="text-primary font-semibold">Anticeil Plus</strong>.
            </DialogDescription>

            <div className="space-y-2.5 rounded-xl bg-black/30 p-3.5 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Group Video & Voice Call hingga 25+ peserta bersamaan</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>High-Definition 1080p 60FPS Screen Sharing & Activities</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Anticeil Activity: YouTube Watch Together, Games, & Workflow Canvas</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tanpa batas durasi panggilan (*unlimited minutes*)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-muted-foreground hover:text-white"
              >
                Nanti Saja
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  if (onNavigateToBilling) {
                    onNavigateToBilling();
                  } else {
                    window.location.href = '/platform/billing';
                  }
                }}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-bold gap-1.5 shadow-lg shadow-purple-500/20"
              >
                <Sparkles className="w-4 h-4" /> Upgrade ke Plus Sekarang
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper Subcomponent to render Local Video Stream cleanly ─────────
function LocalVideoView({
  stream,
  className,
}: {
  stream: MediaStream | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.warn('Local video play error:', err);
      });
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={cn('w-full h-full object-cover -scale-x-100', className)}
    />
  );
}

// ── Helper Subcomponent to render Remote Video Streams cleanly ─────────
function RemoteVideoView({
  stream,
  isMuted = false,
  className,
}: {
  stream: MediaStream;
  isMuted?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.warn('Remote video play error:', err);
      });
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className={cn('w-full h-full object-cover', className)}
    />
  );
}
