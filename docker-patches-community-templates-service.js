"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityTemplates = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const fs = require("fs");
const path = require("path");

const TEMPLATES_SOURCE_URL = 'https://cloud.activepieces.com/api/v1/templates';
const CACHE_FILE = path.join(process.cwd(), 'templates-cache.json');

// In-memory cache
let inMemoryTemplates = [];
let inMemoryCategories = [
    "Customer Service", "Marketing", "Sales", "IT", "HR", "Operations", "AI", "Finance"
];

// Load persisted cache on startup
try {
    if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.templates) && parsed.templates.length > 0) {
            inMemoryTemplates = parsed.templates;
        }
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
            inMemoryCategories = parsed.categories;
        }
    }
} catch (e) {
    // Ignore cache load error
}

function persistCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({
            templates: inMemoryTemplates,
            categories: inMemoryCategories,
            updatedAt: new Date().toISOString()
        }, null, 2), 'utf-8');
    } catch (_) {}
}

exports.communityTemplates = {
    getOrThrow: async (id) => {
        // First check in-memory cache
        const cached = inMemoryTemplates.find(t => t && t.id === id);
        if (cached) {
            return cached;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const url = `${TEMPLATES_SOURCE_URL}/${id}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (response.ok) {
                const template = await response.json();
                if (template && template.id) {
                    inMemoryTemplates.push(template);
                    persistCache();
                }
                return template;
            }
        } catch (e) {
            clearTimeout(timeout);
        }

        if (cached) return cached;

        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
            params: {
                entityType: 'template',
                entityId: id,
                message: `Template ${id} not found`,
            },
        });
    },
    getCategories: async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        try {
            const url = `${TEMPLATES_SOURCE_URL}/categories`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (response.ok) {
                const categories = await response.json();
                if (Array.isArray(categories) && categories.length > 0) {
                    inMemoryCategories = categories;
                    persistCache();
                }
                return categories;
            }
        } catch (e) {
            clearTimeout(timeout);
        }
        return inMemoryCategories;
    },
    list: async (request) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const queryString = convertToQueryString(request);
            const url = `${TEMPLATES_SOURCE_URL}?${queryString}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (response.ok) {
                const result = await response.json();
                if (result && Array.isArray(result.data) && result.data.length > 0) {
                    const existingIds = new Set(inMemoryTemplates.map(t => t.id));
                    for (const t of result.data) {
                        if (!existingIds.has(t.id)) {
                            inMemoryTemplates.push(t);
                        }
                    }
                    persistCache();
                    return result;
                }
            }
        } catch (e) {
            clearTimeout(timeout);
        }

        // Resilient Fallback: If cloud fails or is down/blocked, serve from local cache!
        let filtered = inMemoryTemplates;
        if (request && request.search) {
            const s = request.search.toLowerCase();
            filtered = filtered.filter(t => 
                (t.name && t.name.toLowerCase().includes(s)) ||
                (t.summary && t.summary.toLowerCase().includes(s)) ||
                (t.description && t.description.toLowerCase().includes(s))
            );
        }
        if (request && request.category) {
            filtered = filtered.filter(t => t.categories && t.categories.includes(request.category));
        }

        return {
            data: filtered,
            next: null,
            previous: null,
        };
    },
};

function convertToQueryString(params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((val) => {
                if (!(0, core_utils_1.isNil)(val)) {
                    searchParams.append(key, typeof val === 'string' ? val : JSON.stringify(val));
                }
            });
        }
        else if (!(0, core_utils_1.isNil)(value)) {
            searchParams.set(key, value.toString());
        }
    });
    return searchParams.toString();
}
