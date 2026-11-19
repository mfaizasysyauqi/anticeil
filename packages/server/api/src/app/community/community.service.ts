const inMemoryStore = new Map<string, any>();

export const communityService = {
  get: async <T = any>(key: string, defaultValue: T): Promise<T> => {
    return inMemoryStore.has(key) ? inMemoryStore.get(key) : defaultValue;
  },

  set: async <T = any>(key: string, value: T): Promise<T> => {
    inMemoryStore.set(key, value);
    return value;
  },

  delete: async (key: string): Promise<boolean> => {
    return inMemoryStore.delete(key);
  },
};
