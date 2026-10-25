import { CommunityChannel, CommunityHub, CommunityMember, CommunityMessage } from './messages-types';
export { DEFAULT_HUBS, loadStoredHubs, saveStoredHubs } from '@/lib/community-hubs';

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


// ── Extended Community Storage (Invites, Bans, Roles, Audit Log) ──
const STORAGE_KEY_INVITES = 'anticeil_community_invites_v3';
const STORAGE_KEY_BANS = 'anticeil_community_bans_v3';
const STORAGE_KEY_ROLES = 'anticeil_community_roles_v3';
const STORAGE_KEY_AUDIT = 'anticeil_community_audit_v3';

export function loadStoredInvites(hubId: string): any[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_INVITES}_${hubId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredInvites(hubId: string, invites: any[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_INVITES}_${hubId}`, JSON.stringify(invites));
  } catch (err) {
    console.error('Failed to save invites', err);
  }
}

export function loadStoredBans(hubId: string): any[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_BANS}_${hubId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredBans(hubId: string, bans: any[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_BANS}_${hubId}`, JSON.stringify(bans));
  } catch (err) {
    console.error('Failed to save bans', err);
  }
}

export function loadStoredRoles(hubId: string): any[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_ROLES}_${hubId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredRoles(hubId: string, roles: any[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_ROLES}_${hubId}`, JSON.stringify(roles));
  } catch (err) {
    console.error('Failed to save roles', err);
  }
}

export function loadStoredAuditLog(hubId: string): any[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_AUDIT}_${hubId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredAuditLog(hubId: string, logs: any[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_AUDIT}_${hubId}`, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save audit logs', err);
  }
}


