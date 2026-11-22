"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedSecurity = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const tiny_lru_1 = require("tiny-lru");
let embed_subdomain_service_1 = null;
try {
    embed_subdomain_service_1 = require("../embed-subdomain/embed-subdomain.service");
} catch (_) {
    embed_subdomain_service_1 = null;
}
const platform_service_1 = require("../platform/platform.service");
const system_1 = require("./system/system");
const system_props_1 = require("./system/system-props");

const CACHE_MAX_ENTRIES = 1000;
const CACHE_TTL_MS = 3 * 60 * 1000;
const SELF_HOSTED_CACHE_KEY = '__self_hosted__';

const DEFAULT_ALLOWED_ORIGINS = [
    'https://*.anticeil.com',
    'https://anticeil.com',
    'https://chat.anticeil.com',
    'https://dev-chat.anticeil.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3005',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3005',
];

const cache = (0, tiny_lru_1.lru)(CACHE_MAX_ENTRIES, CACHE_TTL_MS);

function buildFrameAncestorsHeader({ origins }) {
    const allOrigins = mergeUnique(DEFAULT_ALLOWED_ORIGINS, origins);
    return `frame-ancestors 'self' ${allOrigins.join(' ')}`;
}

async function resolveAllowedOrigins({ hostname, log }) {
    const edition = system_1.system.getEdition();
    const cacheKey = edition === shared_1.ApEdition.CLOUD ? hostname : SELF_HOSTED_CACHE_KEY;
    const hit = cache.get(cacheKey);
    if (!(0, core_utils_1.isNil)(hit)) {
        return hit;
    }
    const envOrigins = (system_1.system.getList(system_props_1.AppSystemProp.ALLOWED_EMBED_ORIGINS) || []).filter(isValidOrigin);
    try {
        if (edition === shared_1.ApEdition.CLOUD && embed_subdomain_service_1 && typeof embed_subdomain_service_1.embedSubdomainService === 'function') {
            const record = await (0, embed_subdomain_service_1.embedSubdomainService)(log).getByHostname({ hostname });
            if ((0, core_utils_1.isNil)(record)) {
                cache.set(cacheKey, envOrigins);
                return envOrigins;
            }
            const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(record.platformId);
            const origins = mergeUnique(DEFAULT_ALLOWED_ORIGINS, mergeUnique(platform.allowedEmbedOrigins ?? [], envOrigins));
            cache.set(cacheKey, origins);
            return origins;
        }
        try {
            const platform = await (0, platform_service_1.platformService)(log).getOldestPlatform();
            if (!(0, core_utils_1.isNil)(platform)) {
                const origins = mergeUnique(DEFAULT_ALLOWED_ORIGINS, mergeUnique(platform.allowedEmbedOrigins ?? [], envOrigins));
                cache.set(cacheKey, origins);
                return origins;
            }
        } catch (_) {}
        const fallbackOrigins = mergeUnique(DEFAULT_ALLOWED_ORIGINS, envOrigins);
        cache.set(cacheKey, fallbackOrigins);
        return fallbackOrigins;
    }
    catch (e) {
        log?.warn?.({ error: e, hostname }, 'Failed to resolve embed allowed origins');
        return mergeUnique(DEFAULT_ALLOWED_ORIGINS, envOrigins);
    }
}

function mergeUnique(a, b) {
    return Array.from(new Set([...a, ...b]));
}

function isValidOrigin(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    const trimmed = value.trim();
    if (/^https?:\/\/\*\.[a-zA-Z0-9.-]+(:\d+)?$/.test(trimmed)) {
        return true;
    }
    try {
        return new URL(trimmed).origin === trimmed;
    }
    catch {
        return false;
    }
}

const embedSecurity = (log) => ({
    async getFrameAncestorsHeader({ hostname }) {
        const origins = await resolveAllowedOrigins({ hostname, log });
        return buildFrameAncestorsHeader({ origins });
    },
});
exports.embedSecurity = embedSecurity;
