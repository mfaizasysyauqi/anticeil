import { CommunityChannel, CommunityHub, CommunityMember, CommunityMessage } from './community-types';

export const DEFAULT_HUBS: CommunityHub[] = [
  {
    id: 'anticeil',
    name: 'Workspace Channels',
    iconType: 'spark',
    initials: 'WS',
    description: 'Saluran obrolan tim untuk kolaborasi alur kerja dan otomasi.',
  },
  {
    id: 'ai-agents',
    name: 'AI & Automations',
    iconType: 'bot',
    initials: 'AI',
    description: 'Diskusi autonomous agents, tool calling, dan server MCP tim.',
  },
  {
    id: 'templates',
    name: 'Shared Templates',
    iconType: 'templates',
    initials: 'TM',
    description: 'Koleksi alur kerja siap pakai dan template tim.',
  },
  {
    id: 'developers',
    name: 'Developer & Webhooks',
    iconType: 'code',
    initials: 'DEV',
    description: 'Custom pieces development, webhook pipelines, dan integrasi API.',
  },
  {
    id: 'direct-messages',
    name: 'Direct Messages',
    iconType: 'dm',
    initials: 'DM',
    description: 'Pesan langsung antar rekan tim dan anggota workspace.',
  },
];

export const DEFAULT_CHANNELS: CommunityChannel[] = [];

export const DEFAULT_MEMBERS: CommunityMember[] = [];

export const INITIAL_MESSAGES: Record<string, CommunityMessage[]> = {};

const STORAGE_KEY_MESSAGES = 'anticeil_community_messages_v3';
const STORAGE_KEY_CHANNELS = 'anticeil_community_channels_v3';

export function loadStoredMessages(): Record<string, CommunityMessage[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
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
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredChannels(channels: CommunityChannel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHANNELS, JSON.stringify(channels));
  } catch (err) {
    console.error('Failed to save community channels', err);
  }
}

