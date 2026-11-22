import fs from 'node:fs';
import path from 'node:path';
import { storeEntryService } from '../store-entry/store-entry.service';

const inMemoryStore = new Map<string, any>();
const COMMUNITY_PROJECT_ID = 'comm_vault_oracle_01';
const BACKUP_FILE = path.resolve(process.cwd(), 'cache', 'community-store-backup.json');

// Initialize memory from disk snapshot if available on startup
try {
  if (fs.existsSync(BACKUP_FILE)) {
    const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      inMemoryStore.set(k, v);
    }
  }
} catch {
  // Ignore backup load errors
}

const persistBackup = () => {
  try {
    const dir = path.dirname(BACKUP_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, any> = {};
    for (const [k, v] of inMemoryStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Ignore backup write errors
  }
};

export const communityService = {
  get: async <T = any>(key: string, defaultValue: T): Promise<T> => {
    // 1. Check L1 Memory Cache
    if (inMemoryStore.has(key)) {
      return inMemoryStore.get(key);
    }

    // 2. Query L2 Database (PostgreSQL on Oracle VM)
    try {
      const entry = await storeEntryService.getOne({
        projectId: COMMUNITY_PROJECT_ID,
        key: `comm_${key}`.substring(0, 120),
      });
      if (entry && entry.value !== undefined && entry.value !== null) {
        inMemoryStore.set(key, entry.value);
        return entry.value as T;
      }
    } catch {
      // Database not yet connected or initializing
    }

    return defaultValue;
  },

  set: async <T = any>(key: string, value: T): Promise<T> => {
    inMemoryStore.set(key, value);
    persistBackup();

    // Persist to PostgreSQL on Oracle VM
    try {
      await storeEntryService.upsert({
        projectId: COMMUNITY_PROJECT_ID,
        request: {
          key: `comm_${key}`.substring(0, 120),
          value,
        },
      });
    } catch {
      // If DB is offline, memory + local backup keeps state intact
    }

    return value;
  },

  delete: async (key: string): Promise<boolean> => {
    const res = inMemoryStore.delete(key);
    persistBackup();

    try {
      await storeEntryService.delete({
        projectId: COMMUNITY_PROJECT_ID,
        key: `comm_${key}`.substring(0, 120),
      });
    } catch {
      // Ignore DB error
    }

    return res;
  },
};
