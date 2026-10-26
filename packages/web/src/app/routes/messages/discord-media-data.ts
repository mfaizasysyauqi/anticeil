// ─────────────────────────────────────────────────────────────────────────────
// DISCORD MEDIA DATA & APPS CATALOG (Fullstack Assets for Emojis, Stickers, GIFs, Activities)
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscordEmoji {
  id: string;
  name: string;
  code: string;
  url: string;
  server: string;
  serverIcon?: string;
  category?: string;
}

export interface DiscordSticker {
  id: string;
  name: string;
  url: string;
  server: string;
  serverIcon?: string;
  tags?: string[];
}

export interface DiscordGifCategory {
  id: string;
  name: string;
  coverUrl: string;
  isSpecial?: boolean;
}

export interface DiscordGifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  category: string;
}

// ── 1. REAL SERVER EMOJIS (Matching Screenshot 1) ───────────────────────────
export const DISCORD_EMOJI_SERVERS = [
  { id: 'frequently-used', name: 'Frequently Used', icon: '🕒' },
  { id: 'hok-id', name: 'Honor of Kings Indonesia', icon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80' },
  { id: 'fullz', name: '[FULLZ]', icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80&auto=format&fit=crop&q=80' },
  { id: 'standard', name: 'Standard Emojis', icon: '😀' },
];

export const DISCORD_EMOJIS: DiscordEmoji[] = [
  // Frequently Used
  { id: 'em-1', name: 'fire', code: ':fire:', url: '🔥', server: 'Standard', category: 'frequently-used' },
  { id: 'em-2', name: 'joy', code: ':joy:', url: '😂', server: 'Standard', category: 'frequently-used' },
  { id: 'em-3', name: 'skull', code: ':skull:', url: '💀', server: 'Standard', category: 'frequently-used' },
  { id: 'em-4', name: 'sob', code: ':sob:', url: '😭', server: 'Standard', category: 'frequently-used' },
  { id: 'em-5', name: 'sparkles', code: ':sparkles:', url: '✨', server: 'Standard', category: 'frequently-used' },
  { id: 'em-6', name: 'rocket', code: ':rocket:', url: '🚀', server: 'Standard', category: 'frequently-used' },
  { id: 'em-7', name: 'heart', code: ':heart:', url: '❤️', server: 'Standard', category: 'frequently-used' },
  { id: 'em-8', name: 'eyes', code: ':eyes:', url: '👀', server: 'Standard', category: 'frequently-used' },

  // Honor of Kings Indonesia Emojis (Screenshot 1)
  {
    id: 'hok-1',
    name: '1237510444256596039',
    code: ':hok_chibi_cat:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f431.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-2',
    name: 'hok_excited',
    code: ':hok_excited:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f973.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-3',
    name: 'hok_singer',
    code: ':hok_singer:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3a4.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-4',
    name: 'hok_peeking',
    code: ':hok_peeking:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f97a.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-5',
    name: 'hok_menyala',
    code: ':menyala_abangkuh:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-6',
    name: 'hok_respect',
    code: ':respect_king:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f91d.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-7',
    name: 'hok_ok',
    code: ':ok_mantap:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44c.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-8',
    name: 'hok_smug',
    code: ':smug_anya:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f60f.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-9',
    name: 'hok_rank_mythic',
    code: ':rank_mythic:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f48e.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },
  {
    id: 'hok-10',
    name: 'hok_rank_master',
    code: ':rank_master:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c6.png',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    category: 'hok-id',
  },

  // [FULLZ] Server Emojis
  {
    id: 'fullz-1',
    name: 'cat_glasses',
    code: ':cat_smart:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9d0.png',
    server: '[FULLZ]',
    serverIcon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80&auto=format&fit=crop&q=80',
    category: 'fullz',
  },
  {
    id: 'fullz-2',
    name: 'cat_stare',
    code: ':cat_stare:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f408.png',
    server: '[FULLZ]',
    serverIcon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80&auto=format&fit=crop&q=80',
    category: 'fullz',
  },
  {
    id: 'fullz-3',
    name: 'gigachad',
    code: ':gigachad:',
    url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f977.png',
    server: '[FULLZ]',
    serverIcon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80&auto=format&fit=crop&q=80',
    category: 'fullz',
  },
];

// ── 2. REAL STICKERS (Matching Screenshot 2) ────────────────────────────────
export const DISCORD_STICKERS: DiscordSticker[] = [
  {
    id: 'st-1',
    name: 'sunbin',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sunbin&backgroundColor=b6e3f4',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['sunbin', 'chibi', 'support', 'hok'],
  },
  {
    id: 'st-2',
    name: 'login_patrick',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=240&auto=format&fit=crop&q=80',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['login', 'patrick', 'phone', 'call', 'meme'],
  },
  {
    id: 'st-3',
    name: 'deal_with_it',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=240&auto=format&fit=crop&q=80',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['glasses', 'deal', 'swag', 'win'],
  },
  {
    id: 'st-4',
    name: 'panik_tribal',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=panik&backgroundColor=ffd5dc',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['panik', 'scared', 'gank', 'tribal'],
  },
  {
    id: 'st-5',
    name: 'speechless',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=speechless&backgroundColor=c0aede',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['dots', 'silent', 'speechless'],
  },
  {
    id: 'st-6',
    name: 'sparkle_hair',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sparkle&backgroundColor=d1d4f9',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['cute', 'sparkle', 'happy'],
  },
  {
    id: 'st-7',
    name: 'shocked_face',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=shocked&backgroundColor=ffdfbf',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['shock', 'what', 'surprised'],
  },
  {
    id: 'st-8',
    name: 'sweating_panik',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sweat&backgroundColor=c0ebd7',
    server: 'Honor of Kings Indonesia',
    serverIcon: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=80&auto=format&fit=crop&q=80',
    tags: ['sweat', 'defeat', 'clutch'],
  },
];

// ── 3. REAL GIFS (Matching Screenshot 3) ───────────────────────────────────
export const DISCORD_GIF_CATEGORIES: DiscordGifCategory[] = [
  { id: 'favorites', name: 'Favorites', coverUrl: '', isSpecial: true },
  { id: 'trending', name: 'Trending GIFs', coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80' },
  { id: 'hello', name: 'hello', coverUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80' },
  { id: 'lol', name: 'lol', coverUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=300&auto=format&fit=crop&q=80' },
  { id: 'love', name: 'love', coverUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&auto=format&fit=crop&q=80' },
  { id: 'happy-birthday', name: 'happy birthday', coverUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300&auto=format&fit=crop&q=80' },
  { id: 'dance', name: 'dance', coverUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=300&auto=format&fit=crop&q=80' },
  { id: 'gaming', name: 'gaming', coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80' },
];

export const DISCORD_GIF_ITEMS: DiscordGifItem[] = [
  // Trending / Hello
  {
    id: 'gif-1',
    title: 'Wave Hello Tom Hanks',
    url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/200w.gif',
    category: 'hello',
  },
  {
    id: 'gif-2',
    title: 'Hi Cute Bear Wave',
    url: 'https://media.giphy.com/media/VbEC9WchxkiWTL5PFo/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/VbEC9WchxkiWTL5PFo/200w.gif',
    category: 'hello',
  },
  // LOL
  {
    id: 'gif-3',
    title: 'Laughing Dog LOL',
    url: 'https://media.giphy.com/media/10yXFkBJ0MwGQg/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/10yXFkBJ0MwGQg/200w.gif',
    category: 'lol',
  },
  {
    id: 'gif-4',
    title: 'Cat Laughing Head Turn',
    url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/200w.gif',
    category: 'lol',
  },
  // Love
  {
    id: 'gif-5',
    title: 'Milk and Mocha Hug',
    url: 'https://media.giphy.com/media/KztT2c4uNxKKBosTht/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/KztT2c4uNxKKBosTht/200w.gif',
    category: 'love',
  },
  // Happy Birthday
  {
    id: 'gif-6',
    title: 'Cats Party Disco Happy Birthday',
    url: 'https://media.giphy.com/media/10hO3rDNqqg2Xe/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/10hO3rDNqqg2Xe/200w.gif',
    category: 'happy-birthday',
  },
  // Gaming
  {
    id: 'gif-7',
    title: 'Gamer Rage Smash Keyboard',
    url: 'https://media.giphy.com/media/8vUEXZA2me7vnuUvrs/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/8vUEXZA2me7vnuUvrs/200w.gif',
    category: 'gaming',
  },
  {
    id: 'gif-8',
    title: 'Victory Royale Celebration',
    url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/200w.gif',
    category: 'gaming',
  },
];

// ── 4. EXTENDED DISCORD ACTIVITIES (Matching Screenshot 5) ─────────────────
// Exactly 4 Promoted with Banners, and the rest are Grouped Lists!
export interface DiscordAppCatalogItem {
  id: string;
  title: string;
  developer: string;
  group: 'Promoted' | 'Puzzle Games' | 'Card Games' | 'Productivity & Dev';
  icon: string;
  iconBg: string;
  bannerGradient?: string;
  description: string;
}

export const EXTENDED_DISCORD_APPS: DiscordAppCatalogItem[] = [
  // ── 4 TOP PROMOTED BANNERS (Screenshot 3 & 5) ──
  {
    id: 'wordle',
    title: 'Wordle',
    developer: 'The New York Times Games',
    group: 'Promoted',
    icon: '🟩',
    iconBg: 'bg-emerald-600',
    bannerGradient: 'from-emerald-700 via-teal-800 to-zinc-950',
    description: 'Play Wordle from New York Times Games together! Tebak 5 huruf tersembunyi.',
  },
  {
    id: 'magic-garden',
    title: 'Magic Garden',
    developer: 'Bloom Studio',
    group: 'Promoted',
    icon: '🎃',
    iconBg: 'bg-amber-500',
    bannerGradient: 'from-amber-600 via-orange-700 to-indigo-950',
    description: 'Garden with friends! Tanam labu ajaib, buah bintang dan panen bersama tim.',
  },
  {
    id: 'farm-merge-valley',
    title: 'Farm Merge Valley',
    developer: 'Zynga & CoolGames',
    group: 'Promoted',
    icon: '🌽',
    iconBg: 'bg-sky-600',
    bannerGradient: 'from-pink-600 via-purple-700 to-indigo-950',
    description: 'Gabungkan tanaman, ternak ayam dan kembangkan pedesaan bersama teman.',
  },
  {
    id: 'watch-together',
    title: 'Watch Together',
    developer: 'YouTube',
    group: 'Promoted',
    icon: '▶️',
    iconBg: 'bg-red-600',
    bannerGradient: 'from-red-600 via-rose-700 to-zinc-950',
    description: 'Tonton video YouTube bersama rekan secara sinkron realtime tanpa delay.',
  },

  // ── PUZZLE GAMES (Screenshot 5: List Format) ──
  {
    id: 'daily-word-wheel',
    title: 'Daily Word Wheel',
    developer: 'Words with Friends',
    group: 'Puzzle Games',
    icon: '🔤',
    iconBg: 'bg-blue-600',
    description: 'From the makers of Words with Friends, enjoy a daily word puzzle wheel with your friends.',
  },
  {
    id: 'daily-word-griddle',
    title: 'Daily Word Griddle',
    developer: 'Words with Friends',
    group: 'Puzzle Games',
    icon: '🧇',
    iconBg: 'bg-amber-600',
    description: 'From the makers of Words With Friends, enjoy an all new daily griddle challenge.',
  },
  {
    id: 'hex-puzzle-adventure',
    title: 'Hex Puzzle Adventure',
    developer: 'Hex Puzzle Studio',
    group: 'Puzzle Games',
    icon: '⬢',
    iconBg: 'bg-purple-600',
    description: 'A hex stacking puzzle game. Use strategic thinking to solve the hexagonal puzzle board.',
  },
  {
    id: 'daily-sudoku-together',
    title: 'Daily Sudoku Together',
    developer: 'BrainGames Inc.',
    group: 'Puzzle Games',
    icon: '🔢',
    iconBg: 'bg-cyan-600',
    description: 'Dive into Daily Sudoku Together on Discord—your ultimate collaborative Sudoku session.',
  },

  // ── CARD GAMES (Screenshot 5: List Format) ──
  {
    id: 'poker-night',
    title: 'Poker Night',
    developer: 'Discord Original',
    group: 'Card Games',
    icon: '🃏',
    iconBg: 'bg-indigo-600',
    description: "A Texas hold 'em style card game where you can prove your Poker skills to friends.",
  },
  {
    id: 'blazing-8s',
    title: 'Blazing 8s',
    developer: 'Crazy Eights Online',
    group: 'Card Games',
    icon: '🎴',
    iconBg: 'bg-emerald-600',
    description: 'Be the first to zero cards by swapping hands, skipping players, and dropping wild 8s.',
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    developer: 'Casino Royale Discord',
    group: 'Card Games',
    icon: '♠️',
    iconBg: 'bg-red-700',
    description: 'The first visual Blackjack game on Discord! Play with up to 8 people at the dealer table.',
  },
  {
    id: 'erth-poker',
    title: 'ERTH Poker',
    developer: 'ERTH Gaming',
    group: 'Card Games',
    icon: '♥️',
    iconBg: 'bg-pink-600',
    description: 'High-stakes multiplayer Texas Holdem poker tournament room with live voice chat.',
  },

  // ── PRODUCTIVITY & DEV (List Format) ──
  {
    id: 'virtual-fisher',
    title: 'Virtual Fisher',
    developer: 'Fishing Club Inc.',
    group: 'Productivity & Dev',
    icon: '🎣',
    iconBg: 'bg-cyan-500',
    description: 'Virtual Fisher is a game you can play in your server focused on catching rare fish.',
  },
  {
    id: 'whiteboard',
    title: 'Jamspace Whiteboard',
    developer: 'Anticeil Native',
    group: 'Productivity & Dev',
    icon: '🎨',
    iconBg: 'bg-blue-600',
    description: 'Papan tulis kolaboratif realtime untuk sketching arsitektur sistem dan wireframing.',
  },
  {
    id: 'code-runner',
    title: 'Dev Scratchpad & Tester',
    developer: 'Anticeil DevTools',
    group: 'Productivity & Dev',
    icon: '💻',
    iconBg: 'bg-zinc-800',
    description: 'Editor JavaScript realtime & JSON validator dengan live console output di panggung.',
  },
  {
    id: 'flow-canvas',
    title: 'Anticeil Flow Builder',
    developer: 'Anticeil Native',
    group: 'Productivity & Dev',
    icon: '⚡',
    iconBg: 'bg-purple-600',
    description: 'Simulasikan alur webhook, workflow, dan AI agent secara realtime bersama tim.',
  },
];
