export type CommunityHubId = 'anticeil' | 'direct-messages' | string;

export type CommunityCustomEmoji = {
  id: string;
  name: string;
  char?: string;
  url?: string;
};

export type CommunityHub = {
  id: CommunityHubId;
  name: string;
  iconType?: 'logo' | 'spark' | 'bot' | 'templates' | 'code' | 'dm' | 'initials';
  initials: string;
  description?: string;
  unreadCount?: number;
  inviteCode?: string;
  membersCount?: number;
  color?: string;
  iconUrl?: string;
  role?: 'owner' | 'admin' | 'moderator' | 'member';
  tags?: string[];
  emojis?: CommunityCustomEmoji[];
  boostsCount?: number;
  boostTier?: number;
};

export const DEFAULT_HUBS: CommunityHub[] = [
  {
    id: 'anticeil',
    name: 'Pesan Langsung',
    iconType: 'logo',
    initials: 'DM',
    description: 'Saluran pesan langsung untuk obrolan pribadi dengan rekan tim.',
  },
];

const STORAGE_KEY_HUBS = 'anticeil_community_hubs_v3';

export function loadStoredHubs(): CommunityHub[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HUBS);
    if (!raw) return DEFAULT_HUBS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HUBS;
  } catch {
    return DEFAULT_HUBS;
  }
}

export function saveStoredHubs(hubs: CommunityHub[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HUBS, JSON.stringify(hubs));
    window.dispatchEvent(new Event('anticeil_hubs_changed'));
  } catch (err) {
    console.error('Failed to save community hubs to storage', err);
  }
}
