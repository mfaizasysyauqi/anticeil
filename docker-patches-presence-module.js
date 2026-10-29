"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceModule = void 0;
const fp = require("fastify-plugin");
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const user_service_1 = require("../../../user/user-service");
const websockets_service_1 = require("../../websockets.service");
const collaborative_resource_1 = require("../collaborative-resource");
const presence_service_1 = require("./presence.service");

// Fallbacks for custom Anticeil realtime websocket events that may not exist in base image's @activepieces/shared
const MOVE_CURSOR_EVENT = (shared_1.WebsocketServerEvent && shared_1.WebsocketServerEvent.MOVE_CURSOR) || 'MOVE_CURSOR';
const CURSOR_UPDATED_EVENT = (shared_1.WebsocketClientEvent && shared_1.WebsocketClientEvent.CURSOR_UPDATED) || 'CURSOR_UPDATED';
const FLOW_UPDATED_EVENT = (shared_1.WebsocketClientEvent && shared_1.WebsocketClientEvent.FLOW_UPDATED) || 'FLOW_UPDATED';

const presenceModule = async (app) => {
    await setupCommunityApi(app);
    // Hook on Fastify responses: when a flow is updated via HTTP POST /api/v1/flows/:id, broadcast FLOW_UPDATED
    app.addHook('onSend', async (request, reply, payload) => {
        if (request.method === 'POST' && typeof request.url === 'string' && request.url.includes('/flows/') && reply.statusCode < 300) {
            try {
                const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
                if (data && data.id && data.version) {
                    const projectId = request.projectId || (request.principal && request.principal.projectId);
                    if (projectId) {
                        websockets_service_1.websocketService.to(projectId).emit(FLOW_UPDATED_EVENT, {
                            flowId: data.id,
                            version: data.version,
                        });
                    }
                }
            } catch (e) {
                // Ignore parse errors on non-json responses
            }
        }
        return payload;
    });

    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, shared_1.WebsocketServerEvent.JOIN_PRESENCE, (socket) => {
        return async (data, principal, projectId, callback) => {
            const request = shared_1.PresenceRequest.safeParse(data);
            if (!request.success) {
                callback?.({ users: [] });
                return;
            }
            const { resourceId } = request.data;
            try {
                const resource = await collaborative_resource_1.collaborativeResource.resolve({ resourceId, projectId });
                if ((0, core_utils_1.isNil)(resource)) {
                    app.log.warn({ resourceId, user: { id: principal.id }, project: { id: projectId } }, '[JOIN_PRESENCE] Denied: resource does not belong to this project');
                    callback?.({ users: [] });
                    return;
                }
                const user = await (0, user_service_1.userService)(app.log).getMetaInformation({ id: principal.id });
                const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Collaborator';
                socket.data.userDisplayName = displayName;
                socket.data.userEmail = user.email || '';
                socket.data.userImageUrl = user.imageUrl ?? null;

                await (0, presence_service_1.presenceService)(app.log).join({
                    resourceId,
                    projectId,
                    userId: principal.id,
                    userDisplayName: displayName,
                    userEmail: user.email,
                    userImageUrl: user.imageUrl ?? null,
                });
                socket.data.presenceResourceId = resourceId;
                const users = await (0, presence_service_1.presenceService)(app.log).getActiveUsers({ resourceId, projectId });
                websockets_service_1.websocketService.to(projectId).emit(shared_1.WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId,
                    users,
                });
                registerPresenceDisconnectHandler({ socket, userId: principal.id, projectId, app });
                callback?.({ users });
            }
            catch (error) {
                app.log.error({ error }, '[JOIN_PRESENCE] Failed to join presence');
                callback?.({ users: [] });
            }
        };
    });

    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, shared_1.WebsocketServerEvent.LEAVE_PRESENCE, (socket) => {
        return async (data, principal, projectId) => {
            const request = shared_1.PresenceRequest.safeParse(data);
            if (!request.success) {
                return;
            }
            const { resourceId } = request.data;
            try {
                await (0, presence_service_1.presenceService)(app.log).leave({
                    resourceId,
                    projectId,
                    userId: principal.id,
                });
                socket.data.presenceResourceId = null;
                const users = await (0, presence_service_1.presenceService)(app.log).getActiveUsers({ resourceId, projectId });
                websockets_service_1.websocketService.to(projectId).emit(shared_1.WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId,
                    users,
                });
                // Also clear cursor when leaving resource
                socket.to(projectId).emit(CURSOR_UPDATED_EVENT, {
                    resourceId,
                    userId: principal.id,
                    userDisplayName: '',
                    x: null,
                    y: null,
                    socketId: socket.id,
                    clientId: socket.data.clientId ?? socket.id,
                });
            }
            catch (error) {
                app.log.error({ error }, '[LEAVE_PRESENCE] Failed to leave presence');
            }
        };
    });

    // Realtime cursor movement listener
    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, MOVE_CURSOR_EVENT, (socket) => {
        return async (data, principal, projectId) => {
            if (!data || typeof data !== 'object') {
                return;
            }
            const { resourceId, x, y, selectedStep, clientId } = data;
            if (!resourceId) {
                return;
            }
            try {
                if (!socket.data.userDisplayName) {
                    try {
                        const user = await (0, user_service_1.userService)(app.log).getMetaInformation({ id: principal.id });
                        socket.data.userDisplayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Collaborator';
                        socket.data.userEmail = user.email || '';
                        socket.data.userImageUrl = user.imageUrl ?? null;
                    } catch (e) {
                        socket.data.userDisplayName = 'Collaborator';
                    }
                }
                if (clientId) {
                    socket.data.clientId = clientId;
                }
                socket.data.presenceResourceId = resourceId;
                const displayName = socket.data.userDisplayName || 'Collaborator';

                // Broadcast cursor position and selected step to other collaborators in the project room
                socket.to(projectId).emit(CURSOR_UPDATED_EVENT, {
                    resourceId,
                    userId: principal.id,
                    userDisplayName: displayName,
                    userEmail: socket.data.userEmail,
                    userImageUrl: socket.data.userImageUrl,
                    x: typeof x === 'number' ? x : null,
                    y: typeof y === 'number' ? y : null,
                    selectedStep: selectedStep ?? null,
                    socketId: socket.id,
                    clientId: clientId ?? socket.id,
                });
            }
            catch (error) {
                app.log.error({ error }, '[MOVE_CURSOR] Failed to broadcast cursor');
            }
        };
    });

    // Realtime workflow modification broadcast listener
    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, FLOW_UPDATED_EVENT, (socket) => {
        return async (data, principal, projectId) => {
            if (!data || typeof data !== 'object') {
                return;
            }
            try {
                // Forward the updated flow version to all other open tabs/collaborators in this project
                socket.to(projectId).emit(FLOW_UPDATED_EVENT, data);
            }
            catch (error) {
                app.log.error({ error }, '[FLOW_UPDATED] Failed to broadcast flow update');
            }
        };
    });
};
exports.presenceModule = fp(presenceModule);

function registerPresenceDisconnectHandler({ socket, userId, projectId, app }) {
    if (socket.data.presenceDisconnectRegistered) {
        return;
    }
    socket.data.presenceDisconnectRegistered = true;
    socket.once('disconnect', async () => {
        const presenceResourceId = socket.data.presenceResourceId;
        if (typeof presenceResourceId === 'string') {
            try {
                await (0, presence_service_1.presenceService)(app.log).leave({
                    resourceId: presenceResourceId,
                    projectId,
                    userId,
                });
                const users = await (0, presence_service_1.presenceService)(app.log).getActiveUsers({ resourceId: presenceResourceId, projectId });
                websockets_service_1.websocketService.to(projectId).emit(shared_1.WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId: presenceResourceId,
                    users,
                });
            } catch (err) {
                // Ignore disconnect errors
            }

            // Clear cursor position for disconnected user
            websockets_service_1.websocketService.to(projectId).emit(CURSOR_UPDATED_EVENT, {
                resourceId: presenceResourceId,
                userId,
                userDisplayName: '',
                x: null,
                y: null,
                socketId: socket.id,
                clientId: socket.data.clientId ?? socket.id,
            });
        }
    });
}

// ==========================================
// ANTICEIL COMMUNITY API & REALTIME ENGINE
// ==========================================
async function setupCommunityApi(app) {
    let dbReady = false;
    const memoryChannels = [];
    const memoryMessages = {};
    const members = [];
    const memoryHubs = [];
    const memoryHubMembers = {};
    const memoryRoles = {};
    const memoryInvites = {};
    const memoryBans = {};
    const memoryAuditLog = {};
    const activeCallRooms = {};
    const activeCallActivities = {};

    function getPlatformId(req) {
        if (req.principal && req.principal.platform && req.principal.platform.id) {
            return req.principal.platform.id;
        }
        try {
            const auth = req.headers && req.headers.authorization;
            if (auth && auth.startsWith('Bearer ')) {
                const parts = auth.substring(7).split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    if (payload && payload.platform && payload.platform.id) return payload.platform.id;
                    if (payload && payload.platformId) return payload.platformId;
                }
            }
        } catch (e) {}
        return null;
    }

    async function resolvePlatformId(req, ds) {
        if (req?.body?.platformId) return req.body.platformId;
        if (req?.query?.platformId) return req.query.platformId;
        if (req?.headers?.['x-platform-id']) return req.headers['x-platform-id'];
        const fromToken = getPlatformId(req);
        if (fromToken) return fromToken;
        if (ds) {
            try {
                const rows = await ds.query('SELECT id FROM "platform" LIMIT 1');
                if (rows && rows[0] && rows[0].id) return rows[0].id;
                const ch = await ds.query('SELECT platform_id FROM anticeil_community_channels WHERE platform_id IS NOT NULL LIMIT 1');
                if (ch && ch[0] && ch[0].platform_id) return ch[0].platform_id;
            } catch (e) {}
        }
        return 'anticeil-platform';
    }

    async function getDb() {
        try {
            const { databaseConnection } = require("../../../database/database-connection");
            return databaseConnection();
        } catch (e) {
            return null;
        }
    }

    async function ensureTables() {
        if (dbReady) return;
        const ds = await getDb();
        if (!ds) return;
        try {
            await ds.query(`
                CREATE TABLE IF NOT EXISTS anticeil_community_channels (
                    id VARCHAR(128) PRIMARY KEY,
                    name VARCHAR(128) NOT NULL,
                    description TEXT DEFAULT '',
                    category VARCHAR(64) DEFAULT 'CHANNELS',
                    hub_id VARCHAR(64) DEFAULT 'anticeil',
                    is_direct_message BOOLEAN DEFAULT FALSE,
                    dm_user_id VARCHAR(128),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS anticeil_community_messages (
                    id VARCHAR(128) PRIMARY KEY,
                    channel_id VARCHAR(128) NOT NULL,
                    sender_id VARCHAR(128) NOT NULL,
                    sender_name VARCHAR(256) NOT NULL,
                    sender_email VARCHAR(256) NOT NULL,
                    sender_avatar TEXT,
                    sender_role VARCHAR(64) DEFAULT 'member',
                    content TEXT NOT NULL,
                    attachments TEXT DEFAULT '[]',
                    reactions TEXT DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS anticeil_community_hubs (
                    id VARCHAR(128) PRIMARY KEY,
                    name VARCHAR(128) NOT NULL,
                    description TEXT DEFAULT '',
                    icon_type VARCHAR(64) DEFAULT 'code',
                    initials VARCHAR(16) DEFAULT 'SV',
                    icon_url TEXT,
                    invite_code VARCHAR(64),
                    color VARCHAR(64) DEFAULT 'bg-indigo-600',
                    tags TEXT DEFAULT '[]',
                    emojis TEXT DEFAULT '[]',
                    boosts_count INT DEFAULT 0,
                    boost_tier INT DEFAULT 0,
                    platform_id VARCHAR(128),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS anticeil_community_members (
                    id VARCHAR(128) PRIMARY KEY,
                    hub_id VARCHAR(128) NOT NULL,
                    user_id VARCHAR(128) NOT NULL,
                    role VARCHAR(64) DEFAULT 'member',
                    role_label VARCHAR(128) DEFAULT 'Anggota',
                    platform_id VARCHAR(128),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS anticeil_community_roles (
                    id VARCHAR(128) PRIMARY KEY,
                    hub_id VARCHAR(128) NOT NULL,
                    name VARCHAR(128) NOT NULL,
                    color VARCHAR(32) DEFAULT '#6366f1',
                    permissions TEXT DEFAULT '[]',
                    position INT DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS anticeil_community_invites (
                    id VARCHAR(128) PRIMARY KEY,
                    hub_id VARCHAR(128) NOT NULL,
                    code VARCHAR(64) UNIQUE NOT NULL,
                    inviter_name VARCHAR(256) DEFAULT 'Admin',
                    max_uses INT DEFAULT 0,
                    uses INT DEFAULT 0,
                    expires_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS anticeil_community_bans (
                    id VARCHAR(128) PRIMARY KEY,
                    hub_id VARCHAR(128) NOT NULL,
                    user_id VARCHAR(128) NOT NULL,
                    user_name VARCHAR(256),
                    user_email VARCHAR(256),
                    reason TEXT DEFAULT '',
                    banned_by_name VARCHAR(256) DEFAULT 'Admin',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS anticeil_community_audit_log (
                    id VARCHAR(128) PRIMARY KEY,
                    hub_id VARCHAR(128) NOT NULL,
                    action VARCHAR(64) NOT NULL,
                    actor_name VARCHAR(256) DEFAULT 'Admin',
                    target_name VARCHAR(256) DEFAULT '',
                    details TEXT DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);

            // Add columns for existing databases
            try {
                await ds.query(`
                    ALTER TABLE anticeil_community_channels ADD COLUMN IF NOT EXISTS platform_id VARCHAR(128);
                    CREATE INDEX IF NOT EXISTS idx_acc_platform ON anticeil_community_channels (platform_id);
                    ALTER TABLE anticeil_community_channels ADD COLUMN IF NOT EXISTS type VARCHAR(32) DEFAULT 'text';
                    ALTER TABLE anticeil_community_channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
                    UPDATE anticeil_community_channels SET type = 'voice' WHERE (LOWER(name) LIKE '%voice%' OR id LIKE '%voice%') AND (type = 'text' OR type IS NULL);
                    UPDATE anticeil_community_channels SET type = 'forum' WHERE (LOWER(name) LIKE '%forum%' OR LOWER(name) LIKE '%diskusi%' OR id LIKE '%forum%') AND (type = 'text' OR type IS NULL);
                    UPDATE anticeil_community_channels SET type = 'kanban' WHERE (LOWER(name) LIKE '%kanban%' OR id LIKE '%kanban%') AND (type = 'text' OR type IS NULL);
                    ALTER TABLE anticeil_community_hubs ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]';
                    ALTER TABLE anticeil_community_hubs ADD COLUMN IF NOT EXISTS emojis TEXT DEFAULT '[]';
                    ALTER TABLE anticeil_community_hubs ADD COLUMN IF NOT EXISTS boosts_count INT DEFAULT 0;
                    ALTER TABLE anticeil_community_hubs ADD COLUMN IF NOT EXISTS boost_tier INT DEFAULT 0;
                    ALTER TABLE anticeil_community_hubs ADD COLUMN IF NOT EXISTS icon_url TEXT;
                    ALTER TABLE anticeil_community_hubs ADD COLUMN IF NOT EXISTS platform_id VARCHAR(128);

                    CREATE TABLE IF NOT EXISTS anticeil_community_threads (
                        id VARCHAR(128) PRIMARY KEY,
                        channel_id VARCHAR(128) NOT NULL,
                        name VARCHAR(256) NOT NULL,
                        creator_id VARCHAR(128) NOT NULL,
                        creator_name VARCHAR(256) NOT NULL,
                        creator_avatar TEXT,
                        message_count INT DEFAULT 0,
                        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_community_thread_messages (
                        id VARCHAR(128) PRIMARY KEY,
                        thread_id VARCHAR(128) NOT NULL,
                        channel_id VARCHAR(128) NOT NULL,
                        sender_id VARCHAR(128) NOT NULL,
                        sender_name VARCHAR(256) NOT NULL,
                        sender_avatar TEXT,
                        sender_role VARCHAR(64) DEFAULT 'member',
                        content TEXT NOT NULL,
                        attachments TEXT DEFAULT '[]',
                        reactions TEXT DEFAULT '{}',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_friends (
                        id VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        friend_id VARCHAR(128) NOT NULL,
                        friend_name VARCHAR(256) NOT NULL,
                        friend_username VARCHAR(128),
                        friend_avatar TEXT,
                        friend_email VARCHAR(256),
                        status VARCHAR(32) DEFAULT 'accepted',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        UNIQUE(user_id, friend_id)
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_friend_requests (
                        id VARCHAR(128) PRIMARY KEY,
                        sender_id VARCHAR(128) NOT NULL,
                        sender_name VARCHAR(256) NOT NULL,
                        sender_username VARCHAR(128),
                        sender_avatar TEXT,
                        receiver_id VARCHAR(128) NOT NULL,
                        receiver_name VARCHAR(256),
                        status VARCHAR(32) DEFAULT 'pending',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_message_requests (
                        id VARCHAR(128) PRIMARY KEY,
                        receiver_id VARCHAR(128) NOT NULL,
                        sender_id VARCHAR(128) NOT NULL,
                        sender_name VARCHAR(256) NOT NULL,
                        sender_username VARCHAR(128),
                        sender_avatar TEXT,
                        initial_message TEXT NOT NULL,
                        is_spam BOOLEAN DEFAULT FALSE,
                        mutual_servers INT DEFAULT 0,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_notifications (
                        id VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        actor_id VARCHAR(128),
                        actor_name VARCHAR(256) NOT NULL,
                        actor_avatar TEXT,
                        type VARCHAR(64) DEFAULT 'mention',
                        title VARCHAR(256) NOT NULL,
                        summary TEXT DEFAULT '',
                        channel_id VARCHAR(128),
                        channel_name VARCHAR(128),
                        hub_id VARCHAR(128),
                        is_read BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_calendar_events (
                        id VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        hub_id VARCHAR(128) NOT NULL,
                        hub_name VARCHAR(256) DEFAULT 'Anticeil',
                        channel_id VARCHAR(128),
                        channel_name VARCHAR(256),
                        title VARCHAR(256) NOT NULL,
                        description TEXT DEFAULT '',
                        type VARCHAR(64) DEFAULT 'meeting',
                        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
                        end_time TIMESTAMP WITH TIME ZONE,
                        status VARCHAR(64) DEFAULT 'scheduled',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_assignments (
                        id VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        title VARCHAR(256) NOT NULL,
                        description TEXT DEFAULT '',
                        column_id VARCHAR(64) DEFAULT 'todo',
                        channel_id VARCHAR(128) DEFAULT 'kanban-dev',
                        channel_name VARCHAR(128) DEFAULT 'tugas-tim',
                        hub_id VARCHAR(128) DEFAULT 'anticeil',
                        hub_name VARCHAR(128) DEFAULT 'Anticeil Official',
                        priority VARCHAR(32) DEFAULT 'medium',
                        due_date VARCHAR(64),
                        tags TEXT DEFAULT '[]',
                        completed_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    ALTER TABLE anticeil_assignments ADD COLUMN IF NOT EXISTS assignee_id VARCHAR(128);
                    ALTER TABLE anticeil_assignments ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(256);
                    ALTER TABLE anticeil_assignments ADD COLUMN IF NOT EXISTS assignee_avatar TEXT;

                    CREATE TABLE IF NOT EXISTS anticeil_call_logs (
                        id VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        peer_id VARCHAR(128) NOT NULL,
                        peer_name VARCHAR(256) NOT NULL,
                        peer_avatar TEXT,
                        type VARCHAR(32) DEFAULT 'incoming',
                        is_video BOOLEAN DEFAULT FALSE,
                        duration VARCHAR(64),
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_community_channel_reads (
                        user_id VARCHAR(128) NOT NULL,
                        channel_id VARCHAR(128) NOT NULL,
                        last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        PRIMARY KEY (user_id, channel_id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_acc_reads ON anticeil_community_channel_reads (user_id, channel_id);

                    ALTER TABLE anticeil_community_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
                    ALTER TABLE anticeil_community_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;
                    ALTER TABLE anticeil_community_messages ADD COLUMN IF NOT EXISTS pinned_by VARCHAR(256);

                    CREATE TABLE IF NOT EXISTS anticeil_channel_notifications (
                        user_id VARCHAR(128) NOT NULL,
                        channel_id VARCHAR(128) NOT NULL,
                        level VARCHAR(32) DEFAULT 'all',
                        is_muted BOOLEAN DEFAULT FALSE,
                        mute_duration VARCHAR(64),
                        muted_until TIMESTAMP WITH TIME ZONE,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        PRIMARY KEY (user_id, channel_id)
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_community_server_emojis (
                        id VARCHAR(128) PRIMARY KEY,
                        hub_id VARCHAR(128) NOT NULL,
                        name VARCHAR(128) NOT NULL,
                        code VARCHAR(128) NOT NULL,
                        url TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS anticeil_community_server_stickers (
                        id VARCHAR(128) PRIMARY KEY,
                        hub_id VARCHAR(128) NOT NULL,
                        name VARCHAR(128) NOT NULL,
                        url TEXT NOT NULL,
                        tags TEXT DEFAULT '[]',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                `);
            } catch (alterErr) {}


            // Seed default hub if none exists
            try {
                const count = await ds.query('SELECT count(*) as c FROM anticeil_community_hubs');
                if (count && count[0] && Number(count[0].c) === 0) {
                    await ds.query(`
                        INSERT INTO anticeil_community_hubs (id, name, description, icon_type, initials, invite_code, color, tags, emojis, boosts_count, boost_tier)
                        VALUES ('anticeil', 'Pesan Langsung', 'Saluran pesan langsung untuk obrolan pribadi dengan rekan tim.', 'logo', 'DM', 'ANTICEIL', 'bg-indigo-600', '["komunitas","anticeil"]', '[{"id":"1","name":"rocket","char":"🚀"},{"id":"2","name":"fire","char":"🔥"}]', 0, 0)
                        ON CONFLICT (id) DO NOTHING
                    `);
                }
            } catch (seedErr) {}

            // Ensure every server (hub) has default Voice and Forum channels if missing
            try {
                const hubs = await ds.query('SELECT id, name, platform_id FROM anticeil_community_hubs WHERE id != $1', ['anticeil']);
                for (const h of hubs || []) {
                    const chs = await ds.query('SELECT type FROM anticeil_community_channels WHERE hub_id = $1', [h.id]);
                    const types = (chs || []).map(c => c.type || 'text');
                    const platId = h.platform_id || (await resolvePlatformId({}, ds));
                    if (!types.includes('voice')) {
                        const voiceId = `ch-${Date.now().toString(36)}-voice-${Math.random().toString(36).slice(2, 6)}`;
                        await ds.query(
                            'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id, type, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                            [voiceId, 'General Voice', 'Saluran suara dan video', 'CHANNELS', h.id, false, platId, 'voice', false]
                        );
                    }
                    if (!types.includes('forum')) {
                        const forumId = `ch-${Date.now().toString(36)}-forum-${Math.random().toString(36).slice(2, 6)}`;
                        await ds.query(
                            'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id, type, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                            [forumId, 'forum-diskusi', 'Ruang diskusi terorganisir', 'CHANNELS', h.id, false, platId, 'forum', false]
                        );
                    }
                }
            } catch (seedChErr) {}

            // Migrate legacy un-isolated data (no platform_id) to current platform so nothing gets deleted
            try {
                const defaultPlat = await resolvePlatformId({}, ds);
                await ds.query(`UPDATE anticeil_community_channels SET platform_id = $1 WHERE platform_id IS NULL`, [defaultPlat]);
                await ds.query(`UPDATE anticeil_community_hubs SET platform_id = $1 WHERE platform_id IS NULL`, [defaultPlat]);
            } catch (cleanErr) {}

            dbReady = true;
        } catch (err) {
            app.log.warn({ err }, '[Community API] Database initialization warning, using in-memory');
        }
    }

    ensureTables().catch(() => {});

    // --- CHANNELS HANDLERS ---
    const getChannelsHandler = async (req) => {
        await ensureTables();
        const ds = await getDb();
        const hubId = req.query?.hubId;
        const platformId = await resolvePlatformId(req, ds);
        if (ds && dbReady) {
            try {
                let rows;
                if (hubId) {
                    rows = await ds.query('SELECT * FROM anticeil_community_channels WHERE hub_id = $1 ORDER BY created_at ASC', [hubId]);
                } else {
                    rows = await ds.query('SELECT * FROM anticeil_community_channels ORDER BY created_at ASC');
                }
                
                rows = rows || [];
                // Deduplicate existing channels by (hub_id, type, name) keeping the earliest created one
                const seenTypes = new Map();
                for (const r of rows) {
                    const hId = r.hub_id || 'anticeil';
                    const resolvedType = (r.type && r.type !== 'text') ? r.type : (
                        ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('voice') ? 'voice' :
                        ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('forum') || ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('diskusi') ? 'forum' :
                        ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('kanban') ? 'kanban' : (r.type || 'text')
                    );
                    const key = `${hId}:${resolvedType}:${(r.name || '').trim().toLowerCase()}`;
                    if (!seenTypes.has(key)) {
                        seenTypes.set(key, { ...r, type: resolvedType });
                    }
                }
                rows = Array.from(seenTypes.values());

                // If a specific server has missing default channels (voice/forum/text), auto-create them
                if (hubId && hubId !== 'anticeil') {
                    const serverRows = rows.filter(r => (r.hub_id || 'anticeil') === hubId);
                    const types = serverRows.map(r => r.type || 'text');
                    const hasGeneral = serverRows.some(r => (r.name || '').toLowerCase() === 'general' && (r.type === 'text' || !r.type));

                    if (!hasGeneral) {
                        const defaultChId = `ch-${hubId}-general`;
                        const defaultText = {
                            id: defaultChId,
                            name: 'general',
                            description: 'Saluran obrolan umum',
                            category: 'CHANNELS',
                            hub_id: hubId,
                            is_direct_message: false,
                            platform_id: platformId,
                            type: 'text',
                            is_private: false
                        };
                        try {
                            await ds.query(
                                'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id, type, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                                [defaultText.id, defaultText.name, defaultText.description, defaultText.category, defaultText.hub_id, false, platformId, 'text', false]
                            );
                            rows.unshift(defaultText);
                        } catch (e) {}
                    }
                    if (!types.includes('voice')) {
                        const voiceChId = `ch-${hubId}-voice`;
                        const defaultVoice = {
                            id: voiceChId,
                            name: 'General Voice',
                            description: 'Saluran suara dan video',
                            category: 'CHANNELS',
                            hub_id: hubId,
                            is_direct_message: false,
                            platform_id: platformId,
                            type: 'voice',
                            is_private: false
                        };
                        try {
                            await ds.query(
                                'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id, type, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                                [defaultVoice.id, defaultVoice.name, defaultVoice.description, defaultVoice.category, defaultVoice.hub_id, false, platformId, 'voice', false]
                            );
                            rows.push(defaultVoice);
                        } catch (e) {}
                    }
                    if (!types.includes('forum')) {
                        const forumChId = `ch-${hubId}-forum`;
                        const defaultForum = {
                            id: forumChId,
                            name: 'forum-diskusi',
                            description: 'Ruang diskusi terorganisir',
                            category: 'CHANNELS',
                            hub_id: hubId,
                            is_direct_message: false,
                            platform_id: platformId,
                            type: 'forum',
                            is_private: false
                        };
                        try {
                            await ds.query(
                                'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id, type, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                                [defaultForum.id, defaultForum.name, defaultForum.description, defaultForum.category, defaultForum.hub_id, false, platformId, 'forum', false]
                            );
                            rows.push(defaultForum);
                        } catch (e) {}
                    }
                }

                return (rows || []).map(r => {
                    const resolvedType = (r.type && r.type !== 'text') ? r.type : (
                        ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('voice') ? 'voice' :
                        ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('forum') || ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('diskusi') ? 'forum' :
                        ((r.name || '') + ' ' + (r.id || '')).toLowerCase().includes('kanban') ? 'kanban' : (r.type || 'text')
                    );
                    return {
                        id: r.id,
                        name: r.name,
                        description: r.description || '',
                        category: r.category || 'CHANNELS',
                        hubId: r.hub_id || 'anticeil',
                        type: resolvedType,
                        isPrivate: Boolean(r.is_private),
                        isDirectMessage: Boolean(r.is_direct_message),
                        dmUserId: r.dm_user_id || undefined
                    };
                });
            } catch (e) {}
        }
        let filtered = memoryChannels.filter(c => !hubId || c.hubId === hubId);
        if (hubId && hubId !== 'anticeil') {
            const types = filtered.map(c => c.type || 'text');
            if (filtered.length === 0) {
                const gen = {
                    id: `ch-${Date.now().toString(36)}-general`,
                    name: 'general',
                    description: 'Saluran obrolan umum',
                    category: 'CHANNELS',
                    hubId: hubId,
                    type: 'text',
                    isPrivate: false,
                    isDirectMessage: false
                };
                memoryChannels.push(gen);
                filtered.push(gen);
            }
            if (!types.includes('voice')) {
                const genV = {
                    id: `ch-${Date.now().toString(36)}-voice-${Math.random().toString(36).slice(2, 6)}`,
                    name: 'General Voice',
                    description: 'Saluran suara dan video',
                    category: 'CHANNELS',
                    hubId: hubId,
                    type: 'voice',
                    isPrivate: false,
                    isDirectMessage: false
                };
                memoryChannels.push(genV);
                filtered.push(genV);
            }
            if (!types.includes('forum')) {
                const genF = {
                    id: `ch-${Date.now().toString(36)}-forum-${Math.random().toString(36).slice(2, 6)}`,
                    name: 'forum-diskusi',
                    description: 'Ruang diskusi terorganisir',
                    category: 'CHANNELS',
                    hubId: hubId,
                    type: 'forum',
                    isPrivate: false,
                    isDirectMessage: false
                };
                memoryChannels.push(genF);
                filtered.push(genF);
            }
        }
        return filtered;
    };

    const createChannelHandler = async (req, reply) => {
        await ensureTables();
        const { name, description = '', category = 'CHANNELS', hubId = 'anticeil', type = 'text', isPrivate = false } = req.body || {};
        if (!name) {
            return reply.status(400).send({ message: 'Channel name is required' });
        }
        const ds = await getDb();
        const platformId = await resolvePlatformId(req, ds);
        const cleanName = type === 'voice' 
            ? name.trim() 
            : (name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `channel-${Date.now()}`);
        const id = `ch-${Date.now().toString(36)}-${type}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'ch'}`;
        const newChannel = {
            id,
            name: cleanName,
            description,
            category,
            hubId,
            type,
            isPrivate: Boolean(isPrivate),
            isDirectMessage: false
        };

        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id, type, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, type=$8, is_private=$9',
                    [id, cleanName, description, category, hubId, false, platformId, type, Boolean(isPrivate)]
                );
            } catch (e) {}
        }
        memoryChannels.push(newChannel);
        if (app.io) {
            app.io.emit('COMMUNITY_CHANNEL_CREATED', newChannel);
        }
        return newChannel;
    };

    const updateChannelHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const { name, description, type, isPrivate } = req.body || {};
        const ds = await getDb();
        let updatedChannel = null;
        if (ds && dbReady) {
            try {
                const platformId = await resolvePlatformId(req, ds);
                const res = await ds.query(
                    'UPDATE anticeil_community_channels SET name = COALESCE($1, name), description = COALESCE($2, description), type = COALESCE($3, type), is_private = COALESCE($4, is_private), updated_at = NOW() WHERE id = $5 AND (platform_id = $6 OR platform_id IS NULL) RETURNING *',
                    [name, description, type, typeof isPrivate === 'boolean' ? isPrivate : null, id, platformId]
                );
                if (res && res[0]) {
                    updatedChannel = {
                        id: res[0].id,
                        name: res[0].name,
                        description: res[0].description,
                        category: res[0].category,
                        hubId: res[0].hub_id,
                        type: res[0].type || 'text',
                        isPrivate: Boolean(res[0].is_private),
                        isDirectMessage: Boolean(res[0].is_direct_message)
                    };
                }
            } catch (e) {}
        }
        const memIdx = memoryChannels.findIndex(c => c.id === id);
        if (memIdx >= 0) {
            if (name) memoryChannels[memIdx].name = name;
            if (description !== undefined) memoryChannels[memIdx].description = description;
            if (type) memoryChannels[memIdx].type = type;
            if (isPrivate !== undefined) memoryChannels[memIdx].isPrivate = isPrivate;
            if (!updatedChannel) {
                updatedChannel = {
                    id,
                    name: memoryChannels[memIdx].name,
                    description: memoryChannels[memIdx].description,
                    category: memoryChannels[memIdx].category,
                    hubId: memoryChannels[memIdx].hub_id,
                    type: memoryChannels[memIdx].type || 'text',
                    isPrivate: Boolean(memoryChannels[memIdx].isPrivate),
                    isDirectMessage: Boolean(memoryChannels[memIdx].isDirectMessage)
                };
            }
        }
        if (!updatedChannel) {
            updatedChannel = { id, name: name || 'channel', description: description || '', category: 'CHANNELS', hubId: 'anticeil', type: type || 'text', isPrivate: Boolean(isPrivate), isDirectMessage: false };
        }
        if (app.io && updatedChannel) {
            app.io.emit('COMMUNITY_CHANNEL_UPDATED', updatedChannel);
        }
        return updatedChannel;
    };

    // --- FORUM THREADS HANDLERS ---
    const getThreadsHandler = async (req, reply) => {
        await ensureTables();
        const { channelId } = req.params;
        const search = req.query?.search;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                let query = 'SELECT * FROM anticeil_community_threads WHERE channel_id = $1';
                const params = [channelId];
                if (search) {
                    query += ' AND LOWER(name) LIKE $2';
                    params.push(`%${search.toLowerCase()}%`);
                }
                query += ' ORDER BY last_message_at DESC';
                const rows = await ds.query(query, params);
                return (rows || []).map(r => ({
                    id: r.id,
                    channelId: r.channel_id,
                    name: r.name,
                    creatorId: r.creator_id,
                    creatorName: r.creator_name,
                    creatorAvatar: r.creator_avatar,
                    messageCount: Number(r.message_count) || 0,
                    lastMessageAt: r.last_message_at,
                    createdAt: r.created_at
                }));
            } catch (e) {}
        }
        return [];
    };

    const createThreadHandler = async (req, reply) => {
        await ensureTables();
        const { channelId } = req.params;
        const { name, creatorName = 'User', creatorAvatar = null, initialMessage = '' } = req.body || {};
        if (!name) return reply.status(400).send({ message: 'Thread name is required' });
        const id = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ds = await getDb();
        const user = req.principal || {};
        const creatorId = user.id || 'user';
        const now = new Date().toISOString();
        const thread = {
            id,
            channelId,
            name: name.trim(),
            creatorId,
            creatorName,
            creatorAvatar,
            messageCount: initialMessage ? 1 : 0,
            lastMessageAt: now,
            createdAt: now
        };
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_threads (id, channel_id, name, creator_id, creator_name, creator_avatar, message_count, last_message_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                    [id, channelId, thread.name, creatorId, creatorName, creatorAvatar, thread.messageCount, now, now, now]
                );
                if (initialMessage) {
                    const msgId = `msg_th_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                    await ds.query(
                        'INSERT INTO anticeil_community_thread_messages (id, thread_id, channel_id, sender_id, sender_name, sender_avatar, content, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                        [msgId, id, channelId, creatorId, creatorName, creatorAvatar, initialMessage, now]
                    );
                }
            } catch (e) {}
        }
        if (app.io) {
            app.io.emit('COMMUNITY_THREAD_CREATED', thread);
        }
        return thread;
    };

    const getThreadMessagesHandler = async (req, reply) => {
        await ensureTables();
        const { threadId } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_community_thread_messages WHERE thread_id = $1 ORDER BY created_at ASC', [threadId]);
                return (rows || []).map(r => ({
                    id: r.id,
                    threadId: r.thread_id,
                    channelId: r.channel_id,
                    senderId: r.sender_id,
                    senderName: r.sender_name,
                    senderAvatar: r.sender_avatar,
                    senderRole: r.sender_role || 'member',
                    content: r.content,
                    attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments || '[]') : (r.attachments || []),
                    reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {}),
                    createdAt: r.created_at
                }));
            } catch (e) {}
        }
        return [];
    };

    const sendThreadMessageHandler = async (req, reply) => {
        await ensureTables();
        const { threadId } = req.params;
        const { channelId, content, senderName = 'User', senderAvatar = null, senderRole = 'member', attachments = [] } = req.body || {};
        const id = `msg_th_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const user = req.principal || {};
        const senderId = user.id || 'user';
        const now = new Date().toISOString();
        const msg = {
            id,
            threadId,
            channelId,
            senderId,
            senderName,
            senderAvatar,
            senderRole,
            content: content || '',
            attachments,
            reactions: {},
            createdAt: now
        };
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_thread_messages (id, thread_id, channel_id, sender_id, sender_name, sender_avatar, sender_role, content, attachments, reactions, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                    [id, threadId, channelId || '', senderId, senderName, senderAvatar, senderRole, msg.content, JSON.stringify(attachments), JSON.stringify({}), now]
                );
                await ds.query(
                    'UPDATE anticeil_community_threads SET message_count = message_count + 1, last_message_at = $1, updated_at = $1 WHERE id = $2',
                    [now, threadId]
                );
            } catch (e) {}
        }
        if (app.io) {
            app.io.emit('COMMUNITY_THREAD_MESSAGE_CREATED', msg);
        }
        return msg;
    };

    const deleteChannelHandler = async (req) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const platformId = await resolvePlatformId(req, ds);
                await ds.query('DELETE FROM anticeil_community_messages WHERE channel_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_channels WHERE id = $1 AND (platform_id = $2 OR platform_id IS NULL)', [id, platformId]);
            } catch (e) {}
        }
        const memIdx = memoryChannels.findIndex(c => c.id === id);
        if (memIdx >= 0) memoryChannels.splice(memIdx, 1);
        delete memoryMessages[id];

        if (app.io) {
            app.io.emit('COMMUNITY_CHANNEL_DELETED', { id });
        }
        return { success: true, id };
    };

    // --- MESSAGES HANDLERS ---
    const getMessagesHandler = async (req) => {
        await ensureTables();
        const { channelId } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_community_messages WHERE channel_id = $1 ORDER BY created_at ASC LIMIT 200',
                    [channelId]
                );
                return (rows || []).map(r => ({
                    id: r.id,
                    channelId: r.channel_id,
                    senderId: r.sender_id,
                    senderName: r.sender_name,
                    senderEmail: r.sender_email,
                    senderAvatar: r.sender_avatar || null,
                    senderRole: r.sender_role || 'member',
                    content: r.content,
                    createdAt: (r.created_at instanceof Date) ? r.created_at.toISOString() : String(r.created_at),
                    attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments || '[]') : (r.attachments || []),
                    reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {}),
                    isPinned: Boolean(r.is_pinned),
                    pinnedAt: r.pinned_at ? ((r.pinned_at instanceof Date) ? r.pinned_at.toISOString() : String(r.pinned_at)) : null,
                    pinnedBy: r.pinned_by || null
                }));
            } catch (e) {}
        }
        return memoryMessages[channelId] || [];
    };

    const messageRateLimitMap = {};

    const createMessageHandler = async (req, reply) => {
        await ensureTables();
        const { channelId } = req.params;
        const body = req.body || {};
        if (!body.content && (!body.attachments || body.attachments.length === 0)) {
            return reply.status(400).send({ message: 'Content or attachment is required' });
        }
        if (body.content && typeof body.content === 'string' && body.content.length > 2000) {
            return reply.status(400).send({ message: 'Pesan terlalu panjang. Maksimal 2.000 karakter.' });
        }
        const clientKey = body.senderId || req.ip || 'anon';
        const now = Date.now();
        if (!messageRateLimitMap[clientKey]) messageRateLimitMap[clientKey] = [];
        messageRateLimitMap[clientKey] = messageRateLimitMap[clientKey].filter(t => now - t < 5000);
        if (messageRateLimitMap[clientKey].length >= 5) {
            return reply.status(429).send({ message: 'Terlalu cepat mengirim pesan. Harap tunggu beberapa detik.' });
        }
        messageRateLimitMap[clientKey].push(now);

        const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newMessage = {
            id,
            channelId,
            senderId: body.senderId || 'anon-user',
            senderName: body.senderName || 'Pengguna Anticeil',
            senderEmail: body.senderEmail || 'user@anticeil.com',
            senderAvatar: body.senderAvatar || null,
            senderRole: body.senderRole || 'member',
            content: body.content || '',
            createdAt: new Date().toISOString(),
            attachments: body.attachments || [],
            reactions: {}
        };

        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_messages (id, channel_id, sender_id, sender_name, sender_email, sender_avatar, sender_role, content, attachments, reactions, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                    [
                        id,
                        channelId,
                        newMessage.senderId,
                        newMessage.senderName,
                        newMessage.senderEmail,
                        newMessage.senderAvatar,
                        newMessage.senderRole,
                        newMessage.content,
                        JSON.stringify(newMessage.attachments),
                        JSON.stringify(newMessage.reactions),
                        newMessage.createdAt
                    ]
                );
            } catch (e) {}
        }
        if (!memoryMessages[channelId]) memoryMessages[channelId] = [];
        memoryMessages[channelId].push(newMessage);

        if (app.io) {
            app.io.emit('COMMUNITY_CHAT_MESSAGE', newMessage);
        }
        return newMessage;
    };

    const deleteMessageHandler = async (req) => {
        await ensureTables();
        const { id } = req.params;
        let channelId = null;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const found = await ds.query('SELECT channel_id FROM anticeil_community_messages WHERE id = $1', [id]);
                if (found && found[0]) {
                    channelId = found[0].channel_id;
                }
                await ds.query('DELETE FROM anticeil_community_messages WHERE id = $1', [id]);
            } catch (e) {}
        }
        for (const ch in memoryMessages) {
            const idx = memoryMessages[ch].findIndex(m => m.id === id);
            if (idx >= 0) {
                channelId = ch;
                memoryMessages[ch].splice(idx, 1);
                break;
            }
        }
        if (app.io) {
            app.io.emit('COMMUNITY_MESSAGE_DELETED', { id, channelId });
        }
        return { success: true, id, channelId };
    };

    const toggleReactionHandler = async (req) => {
        await ensureTables();
        const { id } = req.params;
        const { emoji, userId = 'me' } = req.body || {};
        let reactions = {};
        let channelId = null;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const found = await ds.query('SELECT channel_id, reactions FROM anticeil_community_messages WHERE id = $1', [id]);
                if (found && found[0]) {
                    channelId = found[0].channel_id;
                    const raw = found[0].reactions;
                    reactions = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
                }
            } catch (e) {}
        }
        if (!channelId) {
            for (const ch in memoryMessages) {
                const msg = memoryMessages[ch].find(m => m.id === id);
                if (msg) {
                    channelId = ch;
                    reactions = { ...(msg.reactions || {}) };
                    break;
                }
            }
        }
        if (emoji) {
            const list = reactions[emoji] || [];
            if (list.includes(userId)) {
                reactions[emoji] = list.filter(u => u !== userId);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...list, userId];
            }
        }
        if (ds && dbReady) {
            try {
                await ds.query('UPDATE anticeil_community_messages SET reactions = $1 WHERE id = $2', [JSON.stringify(reactions), id]);
            } catch (e) {}
        }
        if (channelId && memoryMessages[channelId]) {
            const msg = memoryMessages[channelId].find(m => m.id === id);
            if (msg) msg.reactions = reactions;
        }
        if (app.io) {
            app.io.emit('COMMUNITY_REACTION_UPDATED', { id, channelId, reactions });
        }
        return { id, channelId, reactions };
    };

    // --- PINNED MESSAGES HANDLERS ---
    const getPinsHandler = async (req) => {
        await ensureTables();
        const { channelId } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_community_messages WHERE channel_id = $1 AND is_pinned = true ORDER BY pinned_at DESC LIMIT 50',
                    [channelId]
                );
                return (rows || []).map(r => ({
                    id: r.id,
                    channelId: r.channel_id,
                    senderId: r.sender_id,
                    senderName: r.sender_name,
                    senderEmail: r.sender_email,
                    senderAvatar: r.sender_avatar || null,
                    senderRole: r.sender_role || 'member',
                    content: r.content,
                    createdAt: (r.created_at instanceof Date) ? r.created_at.toISOString() : String(r.created_at),
                    attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments || '[]') : (r.attachments || []),
                    reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {}),
                    isPinned: true,
                    pinnedAt: r.pinned_at ? ((r.pinned_at instanceof Date) ? r.pinned_at.toISOString() : String(r.pinned_at)) : null,
                    pinnedBy: r.pinned_by || null
                }));
            } catch (e) {}
        }
        const memList = memoryMessages[channelId] || [];
        return memList.filter(m => m.isPinned);
    };

    const togglePinHandler = async (req, reply) => {
        await ensureTables();
        const { id, messageId, channelId: paramChannelId } = req.params;
        const targetId = id || messageId || req.body?.messageId;
        const body = req.body || {};
        const userName = body.userName || 'Admin';
        const channelId = body.channelId || paramChannelId;
        const ds = await getDb();
        let updatedMsg = null;

        if (ds && dbReady && targetId) {
            try {
                const found = await ds.query('SELECT * FROM anticeil_community_messages WHERE id = $1', [targetId]);
                if (found && found.length > 0) {
                    const row = found[0];
                    const nextPinned = !row.is_pinned;
                    const now = new Date();
                    const pinnedAt = nextPinned ? now.toISOString() : null;
                    const pinnedBy = nextPinned ? userName : null;

                    await ds.query(
                        'UPDATE anticeil_community_messages SET is_pinned = $1, pinned_at = $2, pinned_by = $3, updated_at = $4 WHERE id = $5',
                        [nextPinned, pinnedAt, pinnedBy, now.toISOString(), targetId]
                    );

                    updatedMsg = {
                        id: row.id,
                        channelId: row.channel_id,
                        senderId: row.sender_id,
                        senderName: row.sender_name,
                        senderEmail: row.sender_email,
                        senderAvatar: row.sender_avatar || null,
                        senderRole: row.sender_role || 'member',
                        content: row.content,
                        createdAt: (row.created_at instanceof Date) ? row.created_at.toISOString() : String(row.created_at),
                        attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments || '[]') : (row.attachments || []),
                        reactions: typeof row.reactions === 'string' ? JSON.parse(row.reactions || '{}') : (row.reactions || {}),
                        isPinned: nextPinned,
                        pinnedAt,
                        pinnedBy,
                    };
                }
            } catch (e) {}
        }

        if (!updatedMsg && targetId) {
            for (const chId in memoryMessages) {
                const list = memoryMessages[chId];
                for (let i = 0; i < list.length; i++) {
                    if (list[i].id === targetId) {
                        list[i].isPinned = !list[i].isPinned;
                        list[i].pinnedAt = list[i].isPinned ? new Date().toISOString() : null;
                        list[i].pinnedBy = list[i].isPinned ? userName : null;
                        updatedMsg = list[i];
                        break;
                    }
                }
                if (updatedMsg) break;
            }
        }

        if (!updatedMsg) {
            return reply.status(404).send({ message: 'Message not found' });
        }

        if (app.io) {
            app.io.emit('COMMUNITY_MESSAGE_PINNED', updatedMsg);
        }
        return updatedMsg;
    };

    const claimGiftHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const body = req.body || {};
        const userName = body.userName || 'You';
        const ds = await getDb();
        let updatedMsg = null;

        if (ds && dbReady && id) {
            try {
                const found = await ds.query('SELECT * FROM anticeil_community_messages WHERE id = $1', [id]);
                if (found && found.length > 0) {
                    const row = found[0];
                    let attachments = typeof row.attachments === 'string' ? JSON.parse(row.attachments || '[]') : (row.attachments || []);
                    attachments = attachments.map(att => {
                        if (att.type === 'gift') {
                            return {
                                ...att,
                                giftData: {
                                    ...(att.giftData || {}),
                                    claimed: true,
                                    claimedBy: userName,
                                    claimedAt: new Date().toISOString()
                                }
                            };
                        }
                        return att;
                    });
                    await ds.query('UPDATE anticeil_community_messages SET attachments = $1 WHERE id = $2', [JSON.stringify(attachments), id]);
                    updatedMsg = {
                        id: row.id,
                        channelId: row.channel_id,
                        attachments
                    };
                }
            } catch (e) {}
        }
        if (app.io && updatedMsg) {
            app.io.emit('COMMUNITY_GIFT_CLAIMED', updatedMsg);
        }
        return { success: true, messageId: id, claimedBy: userName };
    };

    // --- CHANNEL NOTIFICATIONS HANDLERS ---
    const getChannelNotificationsHandler = async (req) => {
        await ensureTables();
        const { channelId } = req.params;
        const userId = req.query?.userId || getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_channel_notifications WHERE user_id = $1 AND channel_id = $2',
                    [userId, channelId]
                );
                if (rows && rows.length > 0) {
                    const r = rows[0];
                    return {
                        channelId: r.channel_id,
                        userId: r.user_id,
                        level: r.level || 'all',
                        isMuted: Boolean(r.is_muted),
                        muteDuration: r.mute_duration || null,
                        mutedUntil: r.muted_until ? ((r.muted_until instanceof Date) ? r.muted_until.toISOString() : String(r.muted_until)) : null
                    };
                }
            } catch (e) {}
        }
        return { channelId, isMuted: false, level: 'all', mutedUntil: null };
    };

    const updateChannelNotificationsHandler = async (req) => {
        await ensureTables();
        const { channelId } = req.params;
        const userId = req.body?.userId || getReqUserId(req);
        const { level = 'all', isMuted = false, muteDuration = null, mutedUntil = null } = req.body || {};
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query(`
                    INSERT INTO anticeil_channel_notifications (user_id, channel_id, level, is_muted, mute_duration, muted_until, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (user_id, channel_id) DO UPDATE SET
                        level = EXCLUDED.level,
                        is_muted = EXCLUDED.is_muted,
                        mute_duration = EXCLUDED.mute_duration,
                        muted_until = EXCLUDED.muted_until,
                        updated_at = NOW()
                `, [userId, channelId, level, isMuted, muteDuration, mutedUntil]);
            } catch (e) {}
        }
        return { success: true, channelId, level, isMuted, muteDuration, mutedUntil };
    };

    // --- SERVER CUSTOM EMOJIS & STICKERS HANDLERS ---
    const getHubEmojisHandler = async (req) => {
        await ensureTables();
        const { hubId } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_community_server_emojis WHERE hub_id = $1 ORDER BY created_at DESC', [hubId]);
                return (rows || []).map(r => ({
                    id: r.id,
                    hubId: r.hub_id,
                    name: r.name,
                    code: r.code,
                    url: r.url,
                    createdAt: r.created_at
                }));
            } catch (e) {}
        }
        return [];
    };

    const createHubEmojiHandler = async (req) => {
        await ensureTables();
        const { hubId } = req.params;
        const { name, code, url } = req.body || {};
        const id = `emj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const ds = await getDb();
        if (ds && dbReady && name && url) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_server_emojis (id, hub_id, name, code, url, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                    [id, hubId, name, code || `:${name}:`, url]
                );
            } catch (e) {}
        }
        return { success: true, id, hubId, name, code: code || `:${name}:`, url };
    };

    const getHubStickersHandler = async (req) => {
        await ensureTables();
        const { hubId } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_community_server_stickers WHERE hub_id = $1 ORDER BY created_at DESC', [hubId]);
                return (rows || []).map(r => ({
                    id: r.id,
                    hubId: r.hub_id,
                    name: r.name,
                    url: r.url,
                    tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || []),
                    createdAt: r.created_at
                }));
            } catch (e) {}
        }
        return [];
    };

    const createHubStickerHandler = async (req) => {
        await ensureTables();
        const { hubId } = req.params;
        const { name, url, tags = [] } = req.body || {};
        const id = `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const ds = await getDb();
        if (ds && dbReady && name && url) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_server_stickers (id, hub_id, name, url, tags, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                    [id, hubId, name, url, JSON.stringify(tags)]
                );
            } catch (e) {}
        }
        return { success: true, id, hubId, name, url, tags };
    };

    const deleteHubStickerHandler = async (req) => {
        await ensureTables();
        const { stickerId } = req.params;
        const ds = await getDb();
        if (ds && dbReady && stickerId) {
            try {
                await ds.query('DELETE FROM anticeil_community_server_stickers WHERE id = $1', [stickerId]);
            } catch (e) {}
        }
        return { success: true, id: stickerId };
    };

    // --- GIF SEARCH & TRENDING HANDLER ---
    const searchGifsHandler = async (req) => {
        const query = req.query?.q || '';
        const limit = parseInt(req.query?.limit || '20', 10);
        const catalog = [
            { id: 'g1', title: 'Happy Dance Celebration', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/200w.gif', category: 'dance' },
            { id: 'g2', title: 'Celebration Birthday', url: 'https://media.giphy.com/media/10hO3rDNqqg2Xe/giphy.gif', previewUrl: 'https://media.giphy.com/media/10hO3rDNqqg2Xe/200w.gif', category: 'happy-birthday' },
            { id: 'g3', title: 'Cute Cat Laugh LOL', url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', previewUrl: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/200w.gif', category: 'lol' },
            { id: 'g4', title: 'Laughing Dog LOL', url: 'https://media.giphy.com/media/10yXFkBJ0MwGQg/giphy.gif', previewUrl: 'https://media.giphy.com/media/10yXFkBJ0MwGQg/200w.gif', category: 'lol' },
            { id: 'g5', title: 'Bear Wave Hello', url: 'https://media.giphy.com/media/VbEC9WchxkiWTL5PFo/giphy.gif', previewUrl: 'https://media.giphy.com/media/VbEC9WchxkiWTL5PFo/200w.gif', category: 'hello' },
            { id: 'g6', title: 'Tom Hanks Wave Hello', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', previewUrl: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/200w.gif', category: 'hello' },
            { id: 'g7', title: 'Warm Hug Love', url: 'https://media.giphy.com/media/KztT2c4uNxKKBosTht/giphy.gif', previewUrl: 'https://media.giphy.com/media/KztT2c4uNxKKBosTht/200w.gif', category: 'love' },
            { id: 'g8', title: 'Gamer Rage Smash', url: 'https://media.giphy.com/media/8vUEXZA2me7vnuUvrs/giphy.gif', previewUrl: 'https://media.giphy.com/media/8vUEXZA2me7vnuUvrs/200w.gif', category: 'gaming' },
            { id: 'g9', title: 'Mind Blown Reaction', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', previewUrl: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/200w.gif', category: 'reaction' },
            { id: 'g10', title: 'Applause Great Job', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1GhO/giphy.gif', previewUrl: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1GhO/200w.gif', category: 'clap' },
            { id: 'g11', title: 'Thumbs Up Cool', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif', category: 'reaction' },
            { id: 'g12', title: 'Victory Groove Dance', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif', category: 'dance' },
            { id: 'g13', title: 'Gaming Victory Royale', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200w.gif', category: 'gaming' },
            { id: 'g14', title: 'Thank You Heart Love', url: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/200w.gif', category: 'love' }
        ];
        if (!query) return catalog.slice(0, limit);
        const lower = query.toLowerCase();
        const filtered = catalog.filter(g => g.title.toLowerCase().includes(lower) || g.category.toLowerCase().includes(lower));
        return (filtered.length > 0 ? filtered : catalog).slice(0, limit);
    };

    // --- CHANNEL READS & UNREAD COUNTS HANDLERS ---
    const memoryChannelReads = {};

    const markChannelReadHandler = async (req, reply) => {
        await ensureTables();
        const userId = req.body?.userId || req.query?.userId || getReqUserId(req);
        const { channelId } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query(`
                    INSERT INTO anticeil_community_channel_reads (user_id, channel_id, last_read_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (user_id, channel_id)
                    DO UPDATE SET last_read_at = NOW()
                `, [userId, channelId]);
            } catch (e) {
                console.error('Failed to update channel read timestamp:', e);
            }
        }
        memoryChannelReads[`${userId}_${channelId}`] = Date.now();
        if (app.io) {
            app.io.emit('COMMUNITY_CHANNEL_READ', { userId, channelId, readAt: new Date().toISOString() });
        }
        return reply.send({ success: true, channelId, userId });
    };

    const getUnreadCountsHandler = async (req, reply) => {
        await ensureTables();
        const userId = req.query?.userId || getReqUserId(req);
        const ds = await getDb();
        const counts = {
            anticeil: 0,
            servers: {},
            friends: {},
            channels: {},
            total: 0
        };

        if (ds && dbReady) {
            try {
                // 1. Calculate unread messages from database where message was created after user's last_read_at
                const rows = await ds.query(`
                    SELECT 
                        m.channel_id,
                        c.hub_id,
                        c.category,
                        c.is_direct_message,
                        c.dm_user_id,
                        COUNT(m.id)::int AS unread_count
                    FROM anticeil_community_messages m
                    LEFT JOIN anticeil_community_channels c 
                        ON c.id = m.channel_id
                    LEFT JOIN anticeil_community_channel_reads r 
                        ON r.channel_id = m.channel_id AND r.user_id = $1
                    WHERE m.sender_id != $1
                      AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
                    GROUP BY m.channel_id, c.hub_id, c.category, c.is_direct_message, c.dm_user_id
                `, [userId]);

                let totalDmUnread = 0;

                for (const r of (rows || [])) {
                    const count = parseInt(r.unread_count, 10) || 0;
                    if (count <= 0) continue;

                    const chId = r.channel_id;
                    const hubId = r.hub_id || 'anticeil';
                    const isDm = r.is_direct_message || r.category === 'DIRECT MESSAGES' || chId.startsWith('dm-');

                    counts.channels[chId] = (counts.channels[chId] || 0) + count;
                    counts.total += count;

                    if (isDm) {
                        totalDmUnread += count;
                        let friendId = r.dm_user_id;
                        if (!friendId && chId.startsWith('dm-')) {
                            const parts = chId.slice(3).split('-');
                            friendId = parts.find(p => p !== userId) || parts[0];
                        }
                        if (friendId) {
                            counts.friends[friendId] = (counts.friends[friendId] || 0) + count;
                            counts.friends[`dm-${friendId}`] = (counts.friends[`dm-${friendId}`] || 0) + count;
                        }
                    } else if (hubId && hubId !== 'anticeil') {
                        counts.servers[hubId] = (counts.servers[hubId] || 0) + count;
                    }
                }

                // 2. Add unread direct notifications for anticeil logo
                let unreadNotifs = 0;
                try {
                    const notifRows = await ds.query(`
                        SELECT COUNT(*)::int AS count
                        FROM anticeil_notifications
                        WHERE (user_id = $1 OR user_id = 'all')
                          AND is_read = FALSE
                    `, [userId]);
                    unreadNotifs = parseInt(notifRows?.[0]?.count, 10) || 0;
                } catch (e) {}

                counts.anticeil = totalDmUnread + unreadNotifs;

                const flatMap = {
                    anticeil: counts.anticeil,
                    ...counts.servers,
                    ...counts.friends,
                    ...counts.channels
                };

                return reply.send({
                    success: true,
                    counts,
                    unreadCounts: flatMap
                });
            } catch (e) {
                console.error('Error calculating database unread counts:', e);
            }
        }

        // In-memory fallback calculation
        try {
            let totalDmUnread = 0;
            for (const chId in memoryMessages) {
                const msgs = memoryMessages[chId] || [];
                const lastRead = memoryChannelReads[`${userId}_${chId}`] || 0;
                const unread = msgs.filter(m => m.senderId !== userId && new Date(m.createdAt).getTime() > lastRead).length;
                if (unread > 0) {
                    counts.channels[chId] = unread;
                    counts.total += unread;
                    if (chId.startsWith('dm-')) {
                        totalDmUnread += unread;
                        const friendId = chId.replace('dm-', '');
                        counts.friends[friendId] = (counts.friends[friendId] || 0) + unread;
                        counts.friends[`dm-${friendId}`] = (counts.friends[`dm-${friendId}`] || 0) + unread;
                    }
                }
            }
            counts.anticeil = totalDmUnread;
            return reply.send({
                success: true,
                counts,
                unreadCounts: {
                    anticeil: counts.anticeil,
                    ...counts.servers,
                    ...counts.friends,
                    ...counts.channels
                }
            });
        } catch (e) {}

        return reply.send({ success: true, counts, unreadCounts: { anticeil: 0 } });
    };

    // --- MEMBERS HANDLER ---
    const getMembersHandler = async (req) => {
        const ds = await getDb();
        const platformId = await resolvePlatformId(req, ds);
        let projectId = req.query?.projectId;
        if (!projectId && req.principal?.projectId) {
            projectId = req.principal.projectId;
        }
        if (!projectId) {
            try {
                const auth = req.headers && req.headers.authorization;
                if (auth && auth.startsWith('Bearer ')) {
                    const parts = auth.substring(7).split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                        if (payload && payload.projectId) projectId = payload.projectId;
                    }
                }
            } catch (e) {}
        }

        if (ds) {
            try {
                const users = await ds.query(`
                    SELECT 
                        u.id, 
                        u."platformRole", 
                        ui."firstName", 
                        ui."lastName", 
                        ui.email, 
                        ui."imageUrl",
                        pm_info."projectRoleName"
                    FROM "user" u
                    LEFT JOIN "user_identity" ui ON u."identityId" = ui.id
                    LEFT JOIN LATERAL (
                        SELECT pr.name as "projectRoleName"
                        FROM "project_member" pm
                        LEFT JOIN "project_role" pr ON pm."projectRoleId" = pr.id
                        WHERE pm."userId" = u.id AND (pm."projectId" = $2 OR $2 IS NULL)
                        ORDER BY 
                            CASE 
                                WHEN pr.name = 'Admin' THEN 1
                                WHEN pr.name = 'Editor' THEN 2
                                WHEN pr.name = 'Viewer' THEN 3
                                ELSE 4
                            END ASC
                        LIMIT 1
                    ) pm_info ON true
                    WHERE u."platformId" = $1 OR $1 IS NULL
                    ORDER BY 
                        CASE 
                            WHEN u."platformRole" = 'ADMIN' THEN 1
                            WHEN u."platformRole" = 'OPERATOR' THEN 2
                            WHEN pm_info."projectRoleName" = 'Admin' THEN 3
                            WHEN pm_info."projectRoleName" = 'Editor' THEN 4
                            WHEN pm_info."projectRoleName" = 'Viewer' THEN 5
                            ELSE 6
                        END ASC,
                        ui."firstName" ASC
                    LIMIT 200
                `, [platformId, projectId || null]);

                return (users || []).map(u => {
                    let role = 'member';
                    let roleLabel = 'Anggota Platform';

                    if (u.platformRole === 'ADMIN') {
                        role = 'platform_admin';
                        roleLabel = 'Admin Platform';
                    } else if (u.platformRole === 'OPERATOR') {
                        role = 'platform_operator';
                        roleLabel = 'Operator Platform';
                    } else if (u.projectRoleName === 'Admin') {
                        role = 'project_admin';
                        roleLabel = 'Admin Proyek';
                    } else if (u.projectRoleName === 'Editor') {
                        role = 'project_editor';
                        roleLabel = 'Editor Proyek';
                    } else if (u.projectRoleName === 'Viewer') {
                        role = 'project_viewer';
                        roleLabel = 'Viewer Proyek';
                    }

                    return {
                        id: u.id,
                        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User',
                        email: u.email || '',
                        avatar: u.imageUrl || null,
                        role,
                        roleLabel,
                        platformRole: u.platformRole,
                        projectRole: u.projectRoleName || null,
                        status: 'online'
                    };
                });
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    // --- BOT WEBHOOK HANDLER (For external automations, Activepieces Pieces, cURL, GitHub Actions) ---
    const botWebhookHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const body = req.body || {};
        const content = typeof body.content === 'string' ? body.content.trim() : (body.message ? String(body.message).trim() : '');
        const attachments = Array.isArray(body.attachments) ? body.attachments : [];

        if (!content && attachments.length === 0) {
            return reply.status(400).send({
                success: false,
                message: 'Pesan kosong: harus menyertakan "content" teks atau "attachments".',
                documentation: 'Kirim POST JSON ke /api/v1/community/webhook atau /api/v1/messages/webhook',
                examplePayload: {
                    content: "Halo dari Activepieces automation! 🚀",
                    channel: "general",
                    botName: "Anticeil Bot",
                    botAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=AnticeilBot"
                }
            });
        }

        console.log('[Anticeil Bot Webhook] Incoming webhook call:', {
            query: req.query,
            body: {
                channel: body.channel,
                channelId: body.channelId,
                hubId: body.hubId,
                botName: body.botName,
                content: content ? `${content.substring(0, 40)}...` : '<empty>'
            }
        });

        const platformId = await resolvePlatformId(req, ds);
        const queryChannelId = req.query?.channelId;
        const queryHubId = req.query?.hubId;
        const rawTargetId = (queryChannelId && (!body.channelId || body.channelId === 'general'))
            ? queryChannelId
            : (body.channelId || queryChannelId);
        const rawTargetName = (body.channel && body.channel !== 'general') ? body.channel : (req.query?.channel || body.channel || rawTargetId);
        const hubId = (queryHubId && (!body.hubId || body.hubId === 'anticeil'))
            ? queryHubId
            : (body.hubId || queryHubId || 'anticeil');
        let targetChannel = null;

        if (ds && dbReady) {
            try {
                // Step A: If channelId is provided, find by exact ID first (primary key is globally unique)
                if (rawTargetId) {
                    let rows = await ds.query(
                        'SELECT * FROM anticeil_community_channels WHERE id = $1 LIMIT 1',
                        [rawTargetId]
                    );
                    if (rows && rows[0]) {
                        targetChannel = rows[0];
                    }
                }

                // Step B: If not found by ID, try finding by channel name
                if (!targetChannel && (rawTargetName || rawTargetId)) {
                    const cleanSearchName = String(rawTargetName || rawTargetId).replace(/^#/, '').toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
                    const rawCleanName = String(rawTargetName || rawTargetId).replace(/^#/, '').toLowerCase().trim();

                    if (hubId) {
                        let rows = await ds.query(
                            'SELECT * FROM anticeil_community_channels WHERE hub_id = $1 AND (LOWER(name) = $2 OR LOWER(name) = $3 OR id = $4) LIMIT 1',
                            [hubId, cleanSearchName, rawCleanName, rawTargetId || '']
                        );
                        if (rows && rows[0]) {
                            targetChannel = rows[0];
                        }
                    }

                    // Step C: Fallback search by name across all channels
                    if (!targetChannel) {
                        let rows = await ds.query(
                            'SELECT * FROM anticeil_community_channels WHERE LOWER(name) = $1 OR LOWER(name) = $2 OR id = $3 LIMIT 1',
                            [cleanSearchName, rawCleanName, rawTargetId || '']
                        );
                        if (rows && rows[0]) {
                            targetChannel = rows[0];
                        }
                    }
                }
            } catch (e) {
                app.log.error({ e }, '[Bot Webhook] Error resolving channel from DB');
            }
        }

        // Check memoryChannels if not found in db
        if (!targetChannel) {
            const cleanTarget = String(rawTargetName || rawTargetId || '').replace(/^#/, '').toLowerCase().trim();
            targetChannel = memoryChannels.find(c =>
                (rawTargetId && c.id === rawTargetId) ||
                (cleanTarget && c.name.toLowerCase() === cleanTarget)
            );
        }

        // 2. Prevent duplicate channels: Only auto-create if NO channel matches anywhere
        if (!targetChannel) {
            const rawName = String(rawTargetName || rawTargetId || 'general').replace(/^#/, '').trim() || 'general';
            const cleanName = rawName.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'general';

            // Check if ANY channel exists with this name (e.g. general, alerts, etc.)
            if (ds && dbReady) {
                try {
                    let existingRows = await ds.query(
                        'SELECT * FROM anticeil_community_channels WHERE LOWER(name) = $1 OR id = $2 ORDER BY created_at ASC LIMIT 1',
                        [cleanName, rawName]
                    );
                    if (existingRows && existingRows[0]) {
                        targetChannel = existingRows[0];
                    }
                } catch (e) {}
            }
            if (!targetChannel) {
                targetChannel = memoryChannels.find(c => c.name.toLowerCase() === cleanName || c.id === rawName);
            }

            // Still not found? Only now create a new channel
            if (!targetChannel) {
                const newChannelId = `ch-${cleanName}-${Date.now().toString(36)}`;
                
                const newChannelObj = {
                    id: newChannelId,
                    name: cleanName,
                    description: `Saluran bot otomatis untuk #${cleanName}`,
                    category: 'CHANNELS',
                    hub_id: hubId,
                    is_direct_message: false,
                    platform_id: platformId
                };

                if (ds && dbReady) {
                    try {
                        await ds.query(
                            'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                            [newChannelObj.id, newChannelObj.name, newChannelObj.description, newChannelObj.category, newChannelObj.hub_id, false, platformId]
                        );
                    } catch (e) {}
                }

                const formattedNewChannel = {
                    id: newChannelObj.id,
                    name: newChannelObj.name,
                    description: newChannelObj.description,
                    category: newChannelObj.category,
                    hubId: newChannelObj.hub_id,
                    isDirectMessage: false
                };

                memoryChannels.push(formattedNewChannel);
                targetChannel = formattedNewChannel;
                console.log('[Anticeil Bot Webhook] Channel did not exist, created new channel:', newChannelId, cleanName);

                if (app.io) {
                    app.io.emit('COMMUNITY_CHANNEL_CREATED', formattedNewChannel);
                }
            }
        }

        console.log('[Anticeil Bot Webhook] Target channel resolved to:', {
            id: targetChannel.id,
            name: targetChannel.name,
            hubId: targetChannel.hubId || targetChannel.hub_id || 'anticeil'
        });

        const channelId = targetChannel.id;
        const botName = String(body.botName || body.senderName || 'Anticeil Bot').trim();
        const cleanBotSlug = botName.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 30) || 'automasi';
        const botId = `bot-${cleanBotSlug}`;
        const msgId = `msg-bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const nowIso = new Date().toISOString();

        const newMessage = {
            id: msgId,
            channelId,
            senderId: botId,
            senderName: botName,
            senderEmail: body.senderEmail || `${cleanBotSlug}@anticeil.internal`,
            senderAvatar: body.botAvatar || body.senderAvatar || null,
            senderRole: 'bot',
            content,
            createdAt: nowIso,
            attachments,
            reactions: {}
        };

        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_messages (id, channel_id, sender_id, sender_name, sender_email, sender_avatar, sender_role, content, attachments, reactions, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                    [
                        newMessage.id,
                        newMessage.channelId,
                        newMessage.senderId,
                        newMessage.senderName,
                        newMessage.senderEmail,
                        newMessage.senderAvatar,
                        newMessage.senderRole,
                        newMessage.content,
                        JSON.stringify(newMessage.attachments),
                        JSON.stringify(newMessage.reactions),
                        newMessage.createdAt
                    ]
                );
            } catch (e) {
                app.log.error({ e }, '[Bot Webhook] Failed to insert message to DB');
            }
        }

        if (!memoryMessages[channelId]) memoryMessages[channelId] = [];
        memoryMessages[channelId].push(newMessage);

        if (app.io) {
            app.io.emit('COMMUNITY_CHAT_MESSAGE', newMessage);
        }

        return reply.status(201).send({
            success: true,
            channel: {
                id: targetChannel.id,
                name: targetChannel.name,
                hubId: targetChannel.hubId || targetChannel.hub_id || 'anticeil'
            },
            message: newMessage
        });
    };

    // --- AUDIT LOG HELPER ---
    async function recordAuditLog(ds, hubId, action, actorName, targetName = '', details = {}) {
        const id = `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || {});
        const entry = {
            id,
            hubId,
            action,
            actorName: actorName || 'Admin',
            targetName: targetName || '',
            details: typeof details === 'object' ? details : {},
            createdAt: new Date().toISOString()
        };
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_audit_log (id, hub_id, action, actor_name, target_name, details, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [id, hubId, action, entry.actorName, entry.targetName, detailsStr, entry.createdAt]
                );
            } catch (e) {}
        }
        if (!memoryAuditLog[hubId]) memoryAuditLog[hubId] = [];
        memoryAuditLog[hubId].unshift(entry);
        if (memoryAuditLog[hubId].length > 100) memoryAuditLog[hubId].pop();
        if (app.io) {
            app.io.emit('COMMUNITY_AUDIT_LOG_ENTRY', entry);
        }
        return entry;
    }

    // --- HUBS (SERVERS) HANDLERS ---
    const getHubsHandler = async (req) => {
        await ensureTables();
        const ds = await getDb();
        const platformId = await resolvePlatformId(req, ds);
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_community_hubs ORDER BY created_at ASC'
                );
                if (rows && rows.length > 0) {
                    return rows.map(r => ({
                        id: r.id,
                        name: r.name,
                        iconType: r.icon_type || 'code',
                        initials: r.initials || (r.name || 'SV').slice(0, 2).toUpperCase(),
                        description: r.description || '',
                        inviteCode: r.invite_code,
                        color: r.color || 'bg-indigo-600',
                        iconUrl: r.icon_url || null,
                        role: 'owner',
                        tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : ['komunitas'],
                        emojis: r.emojis ? (typeof r.emojis === 'string' ? JSON.parse(r.emojis) : r.emojis) : [],
                        boostsCount: Number(r.boosts_count || 0),
                        boostTier: Number(r.boost_tier || 0)
                    }));
                }
            } catch (e) {}
        }
        if (memoryHubs.length > 0) return memoryHubs;
        return [{
            id: 'anticeil',
            name: 'Pesan Langsung',
            iconType: 'logo',
            initials: 'DM',
            description: 'Saluran pesan langsung untuk obrolan pribadi dengan rekan tim.',
            role: 'owner',
            color: 'bg-indigo-600',
            tags: ['komunitas', 'anticeil'],
            emojis: [{ id: '1', name: 'rocket', char: '🚀' }],
            boostsCount: 0,
            boostTier: 0
        }];
    };

    const createHubHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const platformId = await resolvePlatformId(req, ds);
        const { name, description = '', color = 'bg-indigo-600', icon = 'code', iconUrl = null, tags = [], emojis = [] } = req.body || {};
        if (!name) return reply.status(400).send({ message: 'Nama server wajib diisi' });

        const id = req.body?.id || `hub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const initials = (name || 'SV').slice(0, 2).toUpperCase();
        const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
        const hub = {
            id,
            name,
            description,
            iconType: icon || 'code',
            initials,
            inviteCode,
            color,
            iconUrl,
            role: 'owner',
            tags: tags.length ? tags : ['komunitas'],
            emojis: emojis.length ? emojis : [{ id: '1', name: 'rocket', char: '🚀' }],
            boostsCount: 0,
            boostTier: 0,
            platformId
        };

        const defaultChannelId = `ch-${Date.now().toString(36)}-general`;
        const defaultChannel = {
            id: defaultChannelId,
            name: 'general',
            description: `Saluran obrolan umum untuk server ${name}`,
            category: 'CHANNELS',
            hubId: id,
            isDirectMessage: false,
            platformId
        };

        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_hubs (id, name, description, icon_type, initials, icon_url, invite_code, color, tags, emojis, boosts_count, boost_tier, platform_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
                    [hub.id, hub.name, hub.description, hub.iconType, hub.initials, hub.iconUrl, hub.inviteCode, hub.color, JSON.stringify(hub.tags), JSON.stringify(hub.emojis), 0, 0, platformId]
                );
                await ds.query(
                    'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                    [defaultChannel.id, defaultChannel.name, defaultChannel.description, defaultChannel.category, defaultChannel.hubId, false, platformId]
                );
            } catch (e) {}
        }
        memoryHubs.push(hub);
        memoryChannels.push(defaultChannel);
        await recordAuditLog(ds, id, 'HUB_CREATED', req.principal?.name || 'Admin', name);
        if (app.io) {
            app.io.emit('COMMUNITY_HUB_CREATED', hub);
            app.io.emit('COMMUNITY_CHANNEL_CREATED', defaultChannel);
        }
        return reply.status(201).send({
            ...hub,
            defaultChannel
        });
    };

    const updateHubHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { id } = req.params;
        const platformId = await resolvePlatformId(req, ds);
        const { name, description, color, icon, iconUrl, tags, emojis, boostsCount, boostTier } = req.body || {};

        if (ds && dbReady) {
            try {
                await ds.query(
                    `UPDATE anticeil_community_hubs SET
                        name = COALESCE($1, name),
                        description = COALESCE($2, description),
                        color = COALESCE($3, color),
                        icon_type = COALESCE($4, icon_type),
                        icon_url = COALESCE($5, icon_url),
                        tags = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE tags END,
                        emojis = CASE WHEN $7::text IS NOT NULL THEN $7 ELSE emojis END,
                        boosts_count = COALESCE($8, boosts_count),
                        boost_tier = COALESCE($9, boost_tier),
                        updated_at = NOW()
                     WHERE id = $10 AND (platform_id = $11 OR platform_id IS NULL)`,
                    [
                        name || null,
                        description !== undefined ? description : null,
                        color || null,
                        icon || null,
                        iconUrl !== undefined ? iconUrl : null,
                        tags ? JSON.stringify(tags) : null,
                        emojis ? JSON.stringify(emojis) : null,
                        typeof boostsCount === 'number' ? boostsCount : null,
                        typeof boostTier === 'number' ? boostTier : null,
                        id,
                        platformId
                    ]
                );
            } catch (e) {}
        }

        const idx = memoryHubs.findIndex(h => h.id === id);
        if (idx >= 0) {
            if (name) memoryHubs[idx].name = name;
            if (description !== undefined) memoryHubs[idx].description = description;
            if (color) memoryHubs[idx].color = color;
            if (iconUrl !== undefined) memoryHubs[idx].iconUrl = iconUrl;
            if (tags) memoryHubs[idx].tags = tags;
            if (emojis) memoryHubs[idx].emojis = emojis;
            if (typeof boostsCount === 'number') memoryHubs[idx].boostsCount = boostsCount;
            if (typeof boostTier === 'number') memoryHubs[idx].boostTier = boostTier;
        }

        await recordAuditLog(ds, id, 'HUB_UPDATED', req.principal?.name || 'Admin', name || id, { name, tags, emojis });
        const updated = (idx >= 0 ? memoryHubs[idx] : { id, name, description, color, tags, emojis, boostsCount, boostTier });
        if (app.io) app.io.emit('COMMUNITY_HUB_UPDATED', updated);
        return updated;
    };

    const deleteHubHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { id } = req.params;
        const platformId = await resolvePlatformId(req, ds);

        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_community_messages WHERE channel_id IN (SELECT id FROM anticeil_community_channels WHERE hub_id = $1)', [id]);
                await ds.query('DELETE FROM anticeil_community_channels WHERE hub_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_members WHERE hub_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_roles WHERE hub_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_invites WHERE hub_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_bans WHERE hub_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_audit_log WHERE hub_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_hubs WHERE id = $1 AND (platform_id = $2 OR platform_id IS NULL)', [id, platformId]);
            } catch (e) {}
        }
        const idx = memoryHubs.findIndex(h => h.id === id);
        if (idx >= 0) memoryHubs.splice(idx, 1);
        if (app.io) app.io.emit('COMMUNITY_HUB_DELETED', { id });
        return { success: true, id };
    };

    const boostHubHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { id } = req.params;
        let count = 1;
        let tier = 0;

        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT boosts_count FROM anticeil_community_hubs WHERE id = $1', [id]);
                if (rows && rows[0]) {
                    count = Number(rows[0].boosts_count || 0) + 1;
                    tier = count >= 14 ? 3 : count >= 7 ? 2 : count >= 2 ? 1 : 0;
                    await ds.query('UPDATE anticeil_community_hubs SET boosts_count = $1, boost_tier = $2, updated_at = NOW() WHERE id = $3', [count, tier, id]);
                }
            } catch (e) {}
        }

        const idx = memoryHubs.findIndex(h => h.id === id);
        if (idx >= 0) {
            memoryHubs[idx].boostsCount = count;
            memoryHubs[idx].boostTier = tier;
        }

        await recordAuditLog(ds, id, 'SERVER_BOOST', req.principal?.name || 'Admin', `Tingkat ${tier}`, { boostsCount: count });
        if (app.io) app.io.emit('COMMUNITY_SERVER_BOOSTED', { id, boostsCount: count, boostTier: tier });
        return { success: true, boostsCount: count, boostTier: tier };
    };

    const updateMemberRoleHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId, userId } = req.params;
        const { role } = req.body || {};
        if (!role) return reply.status(400).send({ message: 'Role is required' });

        if (ds && dbReady) {
            try {
                const id = `mem_${hubId}_${userId}`;
                await ds.query(
                    'INSERT INTO anticeil_community_members (id, hub_id, user_id, role) VALUES ($1, $2, $3, $4) ON CONFLICT (hub_id, user_id) DO UPDATE SET role = $4',
                    [id, hubId, userId, role]
                );
            } catch (e) {}
        }
        if (!memoryHubMembers[hubId]) memoryHubMembers[hubId] = {};
        memoryHubMembers[hubId][userId] = role;
        await recordAuditLog(ds, hubId, 'MEMBER_ROLE_CHANGE', req.principal?.name || 'Admin', userId, { newRole: role });
        if (app.io) app.io.emit('COMMUNITY_MEMBER_ROLE_UPDATED', { hubId, userId, role });
        return { success: true, userId, role };
    };

    const kickMemberHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId, userId } = req.params;

        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_community_members WHERE hub_id = $1 AND user_id = $2', [hubId, userId]);
            } catch (e) {}
        }
        if (memoryHubMembers[hubId]) delete memoryHubMembers[hubId][userId];
        await recordAuditLog(ds, hubId, 'MEMBER_KICK', req.principal?.name || 'Admin', userId);
        if (app.io) app.io.emit('COMMUNITY_MEMBER_KICKED', { hubId, userId });
        return { success: true, userId };
    };

    const getRolesHandler = async (req) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_community_roles WHERE hub_id = $1 ORDER BY position ASC, created_at ASC', [hubId]);
                if (rows && rows.length > 0) {
                    return rows.map(r => ({
                        id: r.id,
                        hubId: r.hub_id,
                        name: r.name,
                        color: r.color || '#6366f1',
                        permissions: r.permissions ? JSON.parse(r.permissions) : ['SEND_MESSAGES'],
                        position: r.position || 0
                    }));
                }
            } catch (e) {}
        }
        if (memoryRoles[hubId] && memoryRoles[hubId].length > 0) return memoryRoles[hubId];
        return [
            { id: 'role-owner', hubId, name: 'Owner', color: '#ef4444', permissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'KICK_MEMBERS', 'BAN_MEMBERS'] },
            { id: 'role-admin', hubId, name: 'Admin', color: '#8b5cf6', permissions: ['MANAGE_CHANNELS', 'KICK_MEMBERS', 'MANAGE_WEBHOOKS'] },
            { id: 'role-mod', hubId, name: 'Moderator', color: '#3b82f6', permissions: ['KICK_MEMBERS', 'MANAGE_MESSAGES'] },
            { id: 'role-member', hubId, name: 'Member', color: '#64748b', permissions: ['SEND_MESSAGES', 'ATTACH_FILES', 'ADD_REACTIONS'] }
        ];
    };

    const createRoleHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        const { name, color = '#6366f1', permissions = ['SEND_MESSAGES'] } = req.body || {};
        if (!name) return reply.status(400).send({ message: 'Nama peran wajib diisi' });

        const id = `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newRole = { id, hubId, name, color, permissions };
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_roles (id, hub_id, name, color, permissions) VALUES ($1, $2, $3, $4, $5)',
                    [id, hubId, name, color, JSON.stringify(permissions)]
                );
            } catch (e) {}
        }
        if (!memoryRoles[hubId]) memoryRoles[hubId] = [];
        memoryRoles[hubId].push(newRole);
        await recordAuditLog(ds, hubId, 'ROLE_CREATED', req.principal?.name || 'Admin', name, { color });
        return reply.status(201).send(newRole);
    };

    const deleteRoleHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId, roleId } = req.params;
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_community_roles WHERE hub_id = $1 AND id = $2', [hubId, roleId]);
            } catch (e) {}
        }
        if (memoryRoles[hubId]) {
            memoryRoles[hubId] = memoryRoles[hubId].filter(r => r.id !== roleId);
        }
        await recordAuditLog(ds, hubId, 'ROLE_DELETED', req.principal?.name || 'Admin', roleId);
        return { success: true, id: roleId };
    };

    const getInvitesHandler = async (req) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_community_invites WHERE hub_id = $1 ORDER BY created_at DESC', [hubId]);
                if (rows && rows.length > 0) {
                    return rows.map(r => ({
                        id: r.id,
                        hubId: r.hub_id,
                        code: r.code,
                        inviterName: r.inviter_name || 'Admin',
                        uses: Number(r.uses || 0),
                        maxUses: Number(r.max_uses || 0),
                        expiresAt: r.expires_at || null,
                        createdAt: r.created_at
                    }));
                }
            } catch (e) {}
        }
        if (memoryInvites[hubId] && memoryInvites[hubId].length > 0) return memoryInvites[hubId];
        return [{
            id: `inv_default_${hubId}`,
            hubId,
            code: 'ANTICEIL',
            inviterName: 'Sistem',
            uses: 1,
            maxUses: 0,
            expiresAt: null,
            createdAt: new Date().toISOString()
        }];
    };

    const createInviteHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        const { maxUses = 0, expiresAt = null } = req.body || {};
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newInvite = {
            id,
            hubId,
            code,
            inviterName: req.principal?.name || 'Admin',
            uses: 0,
            maxUses: Number(maxUses) || 0,
            expiresAt: expiresAt || null,
            createdAt: new Date().toISOString()
        };
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_invites (id, hub_id, code, inviter_name, max_uses, uses, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [id, hubId, code, newInvite.inviterName, newInvite.maxUses, 0, newInvite.expiresAt, newInvite.createdAt]
                );
            } catch (e) {}
        }
        if (!memoryInvites[hubId]) memoryInvites[hubId] = [];
        memoryInvites[hubId].unshift(newInvite);
        await recordAuditLog(ds, hubId, 'INVITE_CREATE', req.principal?.name || 'Admin', code);
        return reply.status(201).send(newInvite);
    };

    const deleteInviteHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId, inviteId } = req.params;
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_community_invites WHERE hub_id = $1 AND (id = $2 OR code = $2)', [hubId, inviteId]);
            } catch (e) {}
        }
        if (memoryInvites[hubId]) {
            memoryInvites[hubId] = memoryInvites[hubId].filter(i => i.id !== inviteId && i.code !== inviteId);
        }
        await recordAuditLog(ds, hubId, 'INVITE_REVOKE', req.principal?.name || 'Admin', inviteId);
        return { success: true, id: inviteId };
    };

    const getBansHandler = async (req) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_community_bans WHERE hub_id = $1 ORDER BY created_at DESC', [hubId]);
                if (rows) {
                    return rows.map(r => ({
                        id: r.id,
                        hubId: r.hub_id,
                        userId: r.user_id,
                        userName: r.user_name || 'Pengguna',
                        userEmail: r.user_email || '',
                        reason: r.reason || '',
                        bannedByName: r.banned_by_name || 'Admin',
                        createdAt: r.created_at
                    }));
                }
            } catch (e) {}
        }
        return memoryBans[hubId] || [];
    };

    const createBanHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        const { userId, userName, userEmail, reason = 'Melanggar aturan komunitas' } = req.body || {};
        if (!userId) return reply.status(400).send({ message: 'User ID is required' });

        const id = `ban_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newBan = {
            id,
            hubId,
            userId,
            userName: userName || userId,
            userEmail: userEmail || '',
            reason,
            bannedByName: req.principal?.name || 'Admin',
            createdAt: new Date().toISOString()
        };

        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_bans (id, hub_id, user_id, user_name, user_email, reason, banned_by_name, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (hub_id, user_id) DO UPDATE SET reason = $6',
                    [id, hubId, userId, newBan.userName, newBan.userEmail, reason, newBan.bannedByName, newBan.createdAt]
                );
                await ds.query('DELETE FROM anticeil_community_members WHERE hub_id = $1 AND user_id = $2', [hubId, userId]);
            } catch (e) {}
        }
        if (!memoryBans[hubId]) memoryBans[hubId] = [];
        memoryBans[hubId].unshift(newBan);
        await recordAuditLog(ds, hubId, 'MEMBER_BAN', req.principal?.name || 'Admin', newBan.userName, { reason });
        if (app.io) app.io.emit('COMMUNITY_USER_BANNED', { hubId, userId });
        return reply.status(201).send(newBan);
    };

    const deleteBanHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId, userId } = req.params;
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_community_bans WHERE hub_id = $1 AND (user_id = $2 OR id = $2)', [hubId, userId]);
            } catch (e) {}
        }
        if (memoryBans[hubId]) {
            memoryBans[hubId] = memoryBans[hubId].filter(b => b.userId !== userId && b.id !== userId);
        }
        await recordAuditLog(ds, hubId, 'MEMBER_UNBAN', req.principal?.name || 'Admin', userId);
        if (app.io) app.io.emit('COMMUNITY_USER_UNBANNED', { hubId, userId });
        return { success: true, userId };
    };

    const getAuditLogHandler = async (req) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_community_audit_log WHERE hub_id = $1 ORDER BY created_at DESC LIMIT 100', [hubId]);
                if (rows && rows.length > 0) {
                    return rows.map(r => ({
                        id: r.id,
                        hubId: r.hub_id,
                        action: r.action,
                        actorName: r.actor_name,
                        targetName: r.target_name || '',
                        details: r.details ? (typeof r.details === 'string' ? JSON.parse(r.details) : r.details) : {},
                        createdAt: r.created_at
                    }));
                }
            } catch (e) {}
        }
        return memoryAuditLog[hubId] || [{
            id: `audit_init_${hubId}`,
            hubId,
            action: 'HUB_INITIALIZED',
            actorName: 'Sistem Anticeil',
            targetName: 'Server Komunitas',
            details: { info: 'Server diaktifkan dengan modul lengkap' },
            createdAt: new Date().toISOString()
        }];
    };

    const getStatsHandler = async (req) => {
        await ensureTables();
        const ds = await getDb();
        const { hubId } = req.params;
        let totalMessages = 0;
        let totalChannels = 0;
        let totalMembers = 1;
        let totalBots = 1;
        let botMessages = 0;
        const channelActivity = [];

        if (ds && dbReady) {
            try {
                const chRows = await ds.query('SELECT id, name FROM anticeil_community_channels WHERE hub_id = $1', [hubId]);
                totalChannels = chRows ? chRows.length : 0;
                if (chRows && chRows.length > 0) {
                    const chIds = chRows.map(c => `'${c.id}'`).join(',');
                    const msgCounts = await ds.query(`SELECT channel_id, sender_role, count(*) as count FROM anticeil_community_messages WHERE channel_id IN (${chIds}) GROUP BY channel_id, sender_role`);
                    const map = {};
                    for (const m of (msgCounts || [])) {
                        const cnt = Number(m.count);
                        totalMessages += cnt;
                        if (m.sender_role === 'bot') botMessages += cnt;
                        map[m.channel_id] = (map[m.channel_id] || 0) + cnt;
                    }
                    for (const ch of chRows) {
                        channelActivity.push({
                            channelId: ch.id,
                            channelName: ch.name,
                            messageCount: map[ch.id] || 0
                        });
                    }
                }
            } catch (e) {}
        }

        channelActivity.sort((a, b) => b.messageCount - a.messageCount);
        return {
            totalMessages: Math.max(totalMessages, 12),
            totalChannels: Math.max(totalChannels, 3),
            totalMembers: Math.max(totalMembers, 4),
            totalBots: Math.max(totalBots, 2),
            botMessages: Math.max(botMessages, 5),
            channelActivity
        };
    };

    const webhookDocHandler = async (req, reply) => {
        return reply.send({
            name: 'Anticeil Realtime Chat Bot Webhook API',
            status: 'online',
            description: 'Kirim pesan instan langsung ke saluran Anticeil Chat / Messages via webhook HTTP POST.',
            endpoints: [
                'POST /api/v1/community/webhook',
                'POST /api/v1/messages/webhook',
                'POST /api/v1/community/bot/message',
                'POST /api/v1/messages/bot/message'
            ],
            payloadExample: {
                content: 'Halo! Pesan ini dikirim secara otomatis dari workflow Anticeil. 🤖',
                channel: 'general',
                botName: 'Activepieces Flow Bot',
                botAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=FlowBot',
                attachments: []
            }
        });
    };

    // Helper to get authenticated user ID
    function getReqUserId(req) {
        if (req.principal && req.principal.id) return req.principal.id;
        try {
            const auth = req.headers && req.headers.authorization;
            if (auth && auth.startsWith('Bearer ')) {
                const parts = auth.substring(7).split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    if (payload && (payload.id || payload.sub)) return payload.id || payload.sub;
                }
            }
        } catch (e) {}
        if (req.headers && req.headers['x-user-id']) return req.headers['x-user-id'];
        return 'default-user';
    }

    // ── FRIENDS HANDLERS ──
    const getFriendsHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_friends WHERE user_id = $1 OR user_id = $2 ORDER BY created_at DESC',
                    [userId, 'all']
                );
                return reply.send(rows.map(r => ({
                    id: r.id,
                    name: r.friend_name,
                    username: r.friend_username,
                    avatar: r.friend_avatar,
                    email: r.friend_email,
                    status: r.status,
                    createdAt: r.created_at
                })));
            } catch (e) {}
        }
        return reply.send([]);
    };

    const getFriendRequestsHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_friend_requests WHERE receiver_id = $1 OR receiver_id = $2 ORDER BY created_at DESC',
                    [userId, 'all']
                );
                return reply.send(rows.map(r => ({
                    id: r.id,
                    senderId: r.sender_id,
                    senderName: r.sender_name,
                    senderUsername: r.sender_username,
                    senderAvatar: r.sender_avatar,
                    status: r.status,
                    createdAt: r.created_at
                })));
            } catch (e) {}
        }
        return reply.send([]);
    };

    const sendFriendRequestHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const { targetUsername, targetUserId } = req.body || {};
        if (!targetUsername && !targetUserId) {
            return reply.status(400).send({ message: 'Target username or user ID required' });
        }
        const ds = await getDb();
        const id = `freq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const senderName = req.principal?.name || req.body?.senderName || 'Pengguna Anticeil';
        const senderUsername = req.principal?.username || req.body?.senderUsername || 'user';
        const senderAvatar = req.principal?.imageUrl || null;
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_friend_requests (id, sender_id, sender_name, sender_username, sender_avatar, receiver_id, receiver_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [id, userId, senderName, senderUsername, senderAvatar, targetUserId || targetUsername, targetUsername || 'Teman', 'pending']
                );
                return reply.send({ success: true, id, message: `Permintaan pertemanan dikirim ke ${targetUsername || targetUserId}` });
            } catch (e) {}
        }
        return reply.send({ success: true, id, message: 'Permintaan pertemanan tersimpan' });
    };

    const acceptFriendRequestHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const userId = getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const reqRows = await ds.query('SELECT * FROM anticeil_friend_requests WHERE id = $1', [id]);
                if (reqRows && reqRows[0]) {
                    const fr = reqRows[0];
                    const fId = `friend_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                    await ds.query(
                        'INSERT INTO anticeil_friends (id, user_id, friend_id, friend_name, friend_username, friend_avatar, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, friend_id) DO NOTHING',
                        [fId, userId, fr.sender_id, fr.sender_name, fr.sender_username, fr.sender_avatar, 'accepted']
                    );
                    await ds.query('DELETE FROM anticeil_friend_requests WHERE id = $1', [id]);
                    return reply.send({ success: true, friendId: fr.sender_id });
                }
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    const ignoreFriendRequestHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_friend_requests WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    const deleteFriendHandler = async (req, reply) => {
        await ensureTables();
        const { friendId } = req.params;
        const userId = getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [userId, friendId]);
            } catch (e) {}
        }
        return reply.send({ success: true, friendId });
    };

    // ── MESSAGE REQUESTS HANDLERS ──
    const getMessageRequestsHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_message_requests WHERE receiver_id = $1 OR receiver_id = $2 ORDER BY created_at DESC',
                    [userId, 'all']
                );
                return reply.send(rows.map(r => ({
                    id: r.id,
                    userId: r.sender_id,
                    name: r.sender_name,
                    username: r.sender_username,
                    avatar: r.sender_avatar,
                    initialMessage: r.initial_message,
                    isSpam: r.is_spam,
                    mutualServers: r.mutual_servers,
                    date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                })));
            } catch (e) {}
        }
        return reply.send([]);
    };

    const acceptMessageRequestHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_message_requests WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    const ignoreMessageRequestHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_message_requests WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    const spamMessageRequestHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('UPDATE anticeil_message_requests SET is_spam = TRUE WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    // ── NOTIFICATIONS HANDLERS ──
    const getNotificationsHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_notifications WHERE user_id = $1 OR user_id = $2 ORDER BY created_at DESC LIMIT 50',
                    [userId, 'all']
                );
                return reply.send(rows.map(r => ({
                    id: r.id,
                    actorId: r.actor_id,
                    actorName: r.actor_name,
                    actorAvatar: r.actor_avatar,
                    type: r.type,
                    title: r.title,
                    summary: r.summary,
                    channelId: r.channel_id,
                    channelName: r.channel_name,
                    hubId: r.hub_id,
                    isRead: r.is_read,
                    createdAt: r.created_at
                })));
            } catch (e) {}
        }
        return reply.send([]);
    };

    const markNotificationReadHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('UPDATE anticeil_notifications SET is_read = TRUE WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    const markAllNotificationsReadHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('UPDATE anticeil_notifications SET is_read = TRUE WHERE user_id = $1 OR user_id = $2', [userId, 'all']);
            } catch (e) {}
        }
        return reply.send({ success: true });
    };

    const createNotificationHandler = async (req, reply) => {
        await ensureTables();
        const { actorName, title, summary = '', type = 'mention', channelId, channelName, hubId } = req.body || {};
        const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const userId = req.body?.userId || 'all';
        const actorId = req.body?.actorId || getReqUserId(req);
        const actorAvatar = req.body?.actorAvatar || null;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_notifications (id, user_id, actor_id, actor_name, actor_avatar, type, title, summary, channel_id, channel_name, hub_id, is_read) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                    [id, userId, actorId, actorName, actorAvatar, type, title, summary, channelId || null, channelName || null, hubId || null, false]
                );
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    // ── CALENDAR EVENTS HANDLERS ──
    const getCalendarEventsHandler = async (req, reply) => {
        await ensureTables();
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query('SELECT * FROM anticeil_calendar_events ORDER BY start_time ASC');
                return reply.send(rows.map(r => ({
                    id: r.id,
                    hubId: r.hub_id,
                    hubName: r.hub_name,
                    channelId: r.channel_id,
                    channelName: r.channel_name,
                    title: r.title,
                    description: r.description,
                    type: r.type,
                    startTime: r.start_time,
                    endTime: r.end_time,
                    status: r.status,
                    createdAt: r.created_at
                })));
            } catch (e) {}
        }
        return reply.send([]);
    };

    const createCalendarEventHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const { title, description = '', hubId = 'anticeil', hubName = 'Anticeil', channelId, channelName, type = 'meeting', startTime, endTime } = req.body || {};
        if (!title || !startTime) return reply.status(400).send({ message: 'Title and startTime required' });
        const id = `cal_ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ds = await getDb();
        const event = {
            id,
            userId,
            hubId,
            hubName,
            channelId,
            channelName,
            title,
            description,
            type,
            startTime,
            endTime: endTime || null,
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_calendar_events (id, user_id, hub_id, hub_name, channel_id, channel_name, title, description, type, start_time, end_time, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                    [id, userId, hubId, hubName, channelId || null, channelName || null, title, description, type, startTime, endTime || null, 'scheduled']
                );
            } catch (e) {}
        }
        return reply.send(event);
    };

    const deleteCalendarEventHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_calendar_events WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    // ── ASSIGNMENTS HANDLERS ──
    const getAssignmentsHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const { channelId, hubId } = req.query || {};
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                let query = 'SELECT * FROM anticeil_assignments';
                let params = [];
                if (channelId) {
                    query += ' WHERE channel_id = $1 ORDER BY created_at DESC';
                    params = [channelId];
                } else if (hubId) {
                    query += ' WHERE hub_id = $1 ORDER BY created_at DESC';
                    params = [hubId];
                } else {
                    query += ' WHERE (user_id = $1 OR user_id = $2) ORDER BY created_at DESC';
                    params = [userId, 'all'];
                }
                const rows = await ds.query(query, params);
                return reply.send(rows.map(r => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    columnId: r.column_id,
                    channelId: r.channel_id,
                    channelName: r.channel_name,
                    hubId: r.hub_id,
                    hubName: r.hub_name,
                    assigneeId: r.assignee_id || r.user_id,
                    assigneeName: r.assignee_name || 'Member',
                    assigneeAvatar: r.assignee_avatar || null,
                    priority: r.priority,
                    dueDate: r.due_date,
                    tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || []),
                    completedAt: r.completed_at,
                    createdAt: r.created_at
                })));
            } catch (e) {}
        }
        return reply.send([]);
    };

    const createAssignmentHandler = async (req, reply) => {
        await ensureTables();
        const userId = getReqUserId(req);
        const {
            id: reqId,
            title,
            description = '',
            columnId = 'todo',
            channelId = 'kanban-dev',
            channelName = 'tugas-tim',
            hubId = 'anticeil',
            hubName = 'Anticeil Official',
            assigneeId,
            assigneeName,
            assigneeAvatar,
            priority = 'medium',
            dueDate,
            tags = []
        } = req.body || {};
        if (!title) return reply.status(400).send({ message: 'Title is required' });
        const id = reqId || `assign_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ds = await getDb();
        const tagsJson = JSON.stringify(tags);
        const now = new Date().toISOString();
        const finalAssigneeId = assigneeId || userId;
        const finalAssigneeName = assigneeName || 'Member';
        const finalAssigneeAvatar = assigneeAvatar || null;
        const assignment = {
            id,
            title,
            description,
            columnId,
            channelId,
            channelName,
            hubId,
            hubName,
            assigneeId: finalAssigneeId,
            assigneeName: finalAssigneeName,
            assigneeAvatar: finalAssigneeAvatar,
            priority,
            dueDate,
            tags,
            createdAt: now
        };
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_assignments (id, user_id, title, description, column_id, channel_id, channel_name, hub_id, hub_name, assignee_id, assignee_name, assignee_avatar, priority, due_date, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
                    [id, userId, title, description, columnId, channelId, channelName, hubId, hubName, finalAssigneeId, finalAssigneeName, finalAssigneeAvatar, priority, dueDate || null, tagsJson, now, now]
                );
            } catch (e) {}
        }
        return reply.send(assignment);
    };

    const updateAssignmentHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const { columnId, title, description, priority, isCompleted, completedAt: reqCompletedAt } = req.body || {};
        const ds = await getDb();
        const completedAt = reqCompletedAt !== undefined ? reqCompletedAt : (isCompleted || columnId === 'done' ? new Date().toISOString() : null);
        if (ds && dbReady) {
            try {
                await ds.query(
                    'UPDATE anticeil_assignments SET column_id = COALESCE($1, column_id), title = COALESCE($2, title), description = COALESCE($3, description), priority = COALESCE($4, priority), completed_at = $5, updated_at = NOW() WHERE id = $6',
                    [columnId || null, title || null, description || null, priority || null, completedAt, id]
                );
            } catch (e) {}
        }
        return reply.send({ success: true, id, columnId, completedAt });
    };

    const deleteAssignmentHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_assignments WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    // ── CALL LOGS HANDLERS ──
    const getCallLogsHandler = async (req, reply) => {
        await ensureTables();
        const userId = req.query?.userId || getReqUserId(req);
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_call_logs WHERE user_id = $1 OR user_id = $2 OR user_id = $3 ORDER BY timestamp DESC LIMIT 50',
                    [userId, 'all', 'default-user']
                );
                return reply.send(rows.map(r => ({
                    id: r.id,
                    peerId: r.peer_id,
                    peerName: r.peer_name,
                    peerAvatar: r.peer_avatar,
                    type: r.type,
                    isVideo: r.is_video,
                    duration: r.duration,
                    timestamp: r.timestamp
                })));
            } catch (e) {}
        }
        return reply.send([]);
    };

    const createCallLogHandler = async (req, reply) => {
        await ensureTables();
        const userId = req.body?.userId || getReqUserId(req);
        const { peerId, peerName, peerAvatar = null, type = 'outgoing', isVideo = false, duration = null } = req.body || {};
        const id = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ds = await getDb();
        const now = new Date().toISOString();
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_call_logs (id, user_id, peer_id, peer_name, peer_avatar, type, is_video, duration, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                    [id, userId, peerId, peerName, peerAvatar, type, isVideo, duration, now, now]
                );
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    const deleteCallLogHandler = async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_call_logs WHERE id = $1', [id]);
            } catch (e) {}
        }
        return reply.send({ success: true, id });
    };

    // --- ZERO-QUOTA YOUTUBE SEARCH & TRENDING SCRAPER (UNLIMITED) ---
    const ytScrapeCache = new Map();
    const getYouTubeSearchHandler = async (req, reply) => {
        const query = (req.query?.q || '').trim();
        const category = (req.query?.category || '').trim();
        const cacheKey = query ? `q:${query.toLowerCase()}` : `cat:${category || 'trending'}`;

        const cached = ytScrapeCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
            return reply.send({ items: cached.items });
        }

        try {
            const searchUrl = query
                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
                : `https://www.youtube.com/feed/trending`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6500);

            const res = await fetch(searchUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                return reply.send({ items: cached ? cached.items : [] });
            }

            const html = await res.text();
            const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
            if (!match) {
                return reply.send({ items: cached ? cached.items : [] });
            }

            const json = JSON.parse(match[1]);
            const items = [];

            // 1. Search Results extraction
            const searchContents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
            if (Array.isArray(searchContents)) {
                for (const section of searchContents) {
                    const itemSection = section.itemSectionRenderer?.contents;
                    if (Array.isArray(itemSection)) {
                        for (const item of itemSection) {
                            const v = item.videoRenderer;
                            if (v && v.videoId) {
                                items.push({
                                    id: v.videoId,
                                    title: v.title?.runs?.[0]?.text || 'YouTube Video',
                                    channel: v.ownerText?.runs?.[0]?.text || 'YouTube',
                                    duration: v.lengthText?.simpleText || '',
                                    views: v.viewCountText?.simpleText || '',
                                    uploadedAt: v.publishedTimeText?.simpleText || '',
                                    thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
                                });
                            }
                        }
                    }
                }
            }

            // 2. Trending / Feed extraction
            if (items.length === 0) {
                const tabs = json.contents?.twoColumnBrowseResultsRenderer?.tabs;
                if (Array.isArray(tabs)) {
                    for (const tab of tabs) {
                        const tabContents = tab.tabRenderer?.content?.sectionListRenderer?.contents;
                        if (Array.isArray(tabContents)) {
                            for (const sec of tabContents) {
                                const subItems = sec.itemSectionRenderer?.contents?.[0]?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items;
                                if (Array.isArray(subItems)) {
                                    for (const it of subItems) {
                                        const v = it.videoRenderer;
                                        if (v && v.videoId) {
                                            items.push({
                                                id: v.videoId,
                                                title: v.title?.runs?.[0]?.text || 'YouTube Video',
                                                channel: v.ownerText?.runs?.[0]?.text || 'YouTube',
                                                duration: v.lengthText?.simpleText || '',
                                                views: v.viewCountText?.simpleText || '',
                                                uploadedAt: v.publishedTimeText?.simpleText || '',
                                                thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const limitedItems = items.slice(0, 24);
            if (limitedItems.length > 0) {
                ytScrapeCache.set(cacheKey, { timestamp: Date.now(), items: limitedItems });
            }
            return reply.send({ items: limitedItems });
        } catch (err) {
            return reply.send({ items: cached ? cached.items : [] });
        }
    };

    // --- REGISTER ROUTE ALIASES (Supports both /v1/community/* and /v1/messages/*) ---
    const routePrefixes = ['/v1/community', '/v1/messages'];
    for (const prefix of routePrefixes) {
        // Zero-Quota YouTube Search & Trending
        app.get(`${prefix}/youtube/search`, getYouTubeSearchHandler);

        // Channels
        app.get(`${prefix}/channels`, getChannelsHandler);
        app.post(`${prefix}/channels`, createChannelHandler);
        app.put(`${prefix}/channels/:id`, updateChannelHandler);
        app.delete(`${prefix}/channels/:id`, deleteChannelHandler);

        // Threads (For Forum Channels)
        app.get(`${prefix}/channels/:channelId/threads`, getThreadsHandler);
        app.post(`${prefix}/channels/:channelId/threads`, createThreadHandler);
        app.get(`${prefix}/threads/:threadId/messages`, getThreadMessagesHandler);
        app.post(`${prefix}/threads/:threadId/messages`, sendThreadMessageHandler);

        // Messages
        app.get(`${prefix}/channels/:channelId/messages`, getMessagesHandler);
        app.post(`${prefix}/channels/:channelId/messages`, createMessageHandler);
        app.delete(`${prefix}/messages/:id`, deleteMessageHandler);
        app.post(`${prefix}/messages/:id/reactions`, toggleReactionHandler);

        // Channel Notifications & Pins
        app.get(`${prefix}/channels/:channelId/notifications`, getChannelNotificationsHandler);
        app.put(`${prefix}/channels/:channelId/notifications`, updateChannelNotificationsHandler);
        app.get(`${prefix}/channels/:channelId/pins`, getPinsHandler);
        app.post(`${prefix}/channels/:channelId/pins`, togglePinHandler);
        app.delete(`${prefix}/channels/:channelId/pins/:messageId`, togglePinHandler);
        app.post(`${prefix}/messages/:id/pin`, togglePinHandler);
        app.post(`${prefix}/messages/:id/claim-gift`, claimGiftHandler);

        // Members
        app.get(`${prefix}/members`, getMembersHandler);

        // Hub Stickers & Emojis
        app.get(`${prefix}/hubs/:hubId/stickers`, getHubStickersHandler);
        app.post(`${prefix}/hubs/:hubId/stickers`, createHubStickerHandler);
        app.delete(`${prefix}/hubs/:hubId/stickers/:stickerId`, deleteHubStickerHandler);
        app.get(`${prefix}/hubs/:hubId/emojis`, getHubEmojisHandler);
        app.post(`${prefix}/hubs/:hubId/emojis`, createHubEmojiHandler);

        // GIFs Live Search & Trending
        app.get(`${prefix}/gifs/search`, searchGifsHandler);
        app.get(`${prefix}/gifs/trending`, searchGifsHandler);

        // Hubs (Servers) & Server Features
        app.get(`${prefix}/hubs`, getHubsHandler);
        app.post(`${prefix}/hubs`, createHubHandler);
        app.put(`${prefix}/hubs/:id`, updateHubHandler);
        app.delete(`${prefix}/hubs/:id`, deleteHubHandler);
        app.post(`${prefix}/hubs/:id/boost`, boostHubHandler);

        // Hub Members, Roles, Invites, Bans, Audit Log, Stats
        app.put(`${prefix}/hubs/:hubId/members/:userId/role`, updateMemberRoleHandler);
        app.delete(`${prefix}/hubs/:hubId/members/:userId`, kickMemberHandler);
        app.get(`${prefix}/hubs/:hubId/roles`, getRolesHandler);
        app.post(`${prefix}/hubs/:hubId/roles`, createRoleHandler);
        app.delete(`${prefix}/hubs/:hubId/roles/:roleId`, deleteRoleHandler);
        app.get(`${prefix}/hubs/:hubId/invites`, getInvitesHandler);
        app.post(`${prefix}/hubs/:hubId/invites`, createInviteHandler);
        app.delete(`${prefix}/hubs/:hubId/invites/:inviteId`, deleteInviteHandler);
        app.get(`${prefix}/hubs/:hubId/bans`, getBansHandler);
        app.post(`${prefix}/hubs/:hubId/bans`, createBanHandler);
        app.delete(`${prefix}/hubs/:hubId/bans/:userId`, deleteBanHandler);
        app.get(`${prefix}/hubs/:hubId/audit-log`, getAuditLogHandler);
        app.get(`${prefix}/hubs/:hubId/stats`, getStatsHandler);

        // Friends & Requests
        app.get(`${prefix}/friends`, getFriendsHandler);
        app.get(`${prefix}/friends/requests`, getFriendRequestsHandler);
        app.post(`${prefix}/friends/request`, sendFriendRequestHandler);
        app.post(`${prefix}/friends/request/:id/accept`, acceptFriendRequestHandler);
        app.post(`${prefix}/friends/request/:id/ignore`, ignoreFriendRequestHandler);
        app.delete(`${prefix}/friends/:friendId`, deleteFriendHandler);

        // Message Requests
        app.get(`${prefix}/message-requests`, getMessageRequestsHandler);
        app.post(`${prefix}/message-requests/:id/accept`, acceptMessageRequestHandler);
        app.post(`${prefix}/message-requests/:id/ignore`, ignoreMessageRequestHandler);
        app.post(`${prefix}/message-requests/:id/spam`, spamMessageRequestHandler);

        // Notifications
        app.get(`${prefix}/notifications`, getNotificationsHandler);
        app.put(`${prefix}/notifications/:id/read`, markNotificationReadHandler);
        app.put(`${prefix}/notifications/read-all`, markAllNotificationsReadHandler);
        app.post(`${prefix}/notifications`, createNotificationHandler);

        // Calendar Events
        app.get(`${prefix}/calendar/events`, getCalendarEventsHandler);
        app.post(`${prefix}/calendar/events`, createCalendarEventHandler);
        app.delete(`${prefix}/calendar/events/:id`, deleteCalendarEventHandler);

        // Assignments (Kanban tasks)
        app.get(`${prefix}/assignments`, getAssignmentsHandler);
        app.post(`${prefix}/assignments`, createAssignmentHandler);
        app.put(`${prefix}/assignments/:id`, updateAssignmentHandler);
        app.delete(`${prefix}/assignments/:id`, deleteAssignmentHandler);

        // Call Logs
        app.get(`${prefix}/calls/logs`, getCallLogsHandler);
        app.post(`${prefix}/calls/logs`, createCallLogHandler);
        app.delete(`${prefix}/calls/logs/:id`, deleteCallLogHandler);

        // Voice/Video Call Room Info
        app.get(`${prefix}/channels/:channelId/call`, async (req, reply) => {
            const { channelId } = req.params;
            const room = activeCallRooms[channelId] || [];
            return {
                channelId,
                active: room.length > 0,
                participantCount: room.length,
                participants: room.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    userAvatar: p.userAvatar,
                    hasVideo: p.hasVideo,
                    hasAudio: p.hasAudio,
                    isScreenSharing: p.isScreenSharing
                }))
            };
        });

        // Bot Webhook Ingestion
        app.get(`${prefix}/webhook`, webhookDocHandler);
        app.post(`${prefix}/webhook`, botWebhookHandler);
        app.post(`${prefix}/bot/message`, botWebhookHandler);
        app.post(`${prefix}/bot`, botWebhookHandler);
    }

    // --- AUTOMATIC BACKGROUND SCHEDULER FOR SCHEDULED MESSAGES ---
    setInterval(async () => {
        try {
            const ds = await getDb();
            if (!ds || !dbReady) return;
            const nowIso = new Date().toISOString();
            const dueEvents = await ds.query(
                "SELECT * FROM anticeil_calendar_events WHERE status = 'scheduled' AND start_time <= $1 ORDER BY start_time ASC LIMIT 10",
                [nowIso]
            );
            if (!dueEvents || dueEvents.length === 0) return;

            for (const ev of dueEvents) {
                const channelId = ev.channel_id;
                if (!channelId) {
                    await ds.query("UPDATE anticeil_calendar_events SET status = 'cancelled' WHERE id = $1", [ev.id]);
                    continue;
                }
                const msgId = `msg-sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                const senderId = ev.user_id || 'system-scheduler';
                const senderName = 'Jadwal Pesan (Scheduler)';
                const senderEmail = 'scheduler@anticeil.com';
                const content = ev.description || ev.title;
                const now = new Date().toISOString();

                await ds.query(
                    `INSERT INTO anticeil_community_messages (id, channel_id, sender_id, sender_name, sender_email, sender_avatar, sender_role, content, attachments, reactions, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [msgId, channelId, senderId, senderName, senderEmail, null, 'bot', content, '[]', '{}', now, now]
                );

                await ds.query("UPDATE anticeil_calendar_events SET status = 'sent' WHERE id = $1", [ev.id]);

                const schedMsg = {
                    id: msgId,
                    channelId,
                    senderId,
                    senderName,
                    senderEmail,
                    senderAvatar: null,
                    senderRole: 'bot',
                    content,
                    createdAt: now,
                    attachments: [],
                    reactions: {},
                    isPinned: false,
                    pinnedAt: null,
                    pinnedBy: null
                };
                if (!memoryMessages[channelId]) memoryMessages[channelId] = [];
                memoryMessages[channelId].push(schedMsg);

                if (app.io) {
                    app.io.emit('COMMUNITY_CHAT_MESSAGE', schedMsg);
                }
            }
        } catch (schedErr) {}
    }, 15000);

    // --- REALTIME WEBRTC VIDEO/VOICE CALL & ACTIVITY ENGINE ---
    function getIOServer() {
        try {
            const serverMod = require("../../../server");
            if (serverMod && serverMod.app && serverMod.app.io) {
                return serverMod.app.io;
            }
        } catch (e) {}
        if (app && app.io) return app.io;
        return null;
    }

    function attachCallEngineToSocket(socket) {
        if (!socket || socket._anticeilCallEngineAttached) return;
        socket._anticeilCallEngineAttached = true;
        try {
            app.log.info({ socketId: socket.id }, '[Anticeil Call Engine] Attached call handlers to socket');
        } catch (e) {}

        socket.on('COMMUNITY_CALL_JOIN', (data, callback) => {
            const { channelId, user, hasVideo, hasAudio, isScreenSharing, plan } = data || {};
            if (!channelId || !user || !user.id) {
                return callback && callback({ success: false, message: 'Invalid payload' });
            }

            if (!activeCallRooms[channelId]) activeCallRooms[channelId] = [];
            const room = activeCallRooms[channelId];
            const isExisting = room.some(p => p.socketId === socket.id);
            const isPlus = Boolean(plan && (plan.includes('plus') || plan.includes('team') || plan.includes('enterprise')));

            // Free Plan Limit: Max 2 participants
            if (!isExisting && room.length >= 2 && !isPlus) {
                return callback && callback({
                    success: false,
                    code: 'UPGRADE_REQUIRED',
                    message: 'Batas peserta Free plan (maksimal 2 orang) tercapai. Upgrade ke Anticeil Plus untuk group call 3+ orang.'
                });
            }

            const resolvedHasVideo = Boolean(hasVideo || data?.mediaState?.hasVideo);
            const resolvedHasAudio = (hasAudio !== undefined ? hasAudio : data?.mediaState?.hasAudio) !== false;
            const resolvedIsScreenSharing = Boolean(isScreenSharing || data?.mediaState?.isScreenSharing);

            const participant = {
                socketId: socket.id,
                userId: user.id,
                userName: user.name || 'Pengguna Anticeil',
                userAvatar: user.avatar || null,
                hasVideo: resolvedHasVideo,
                hasAudio: resolvedHasAudio,
                isScreenSharing: resolvedIsScreenSharing,
                mediaState: {
                    hasVideo: resolvedHasVideo,
                    hasAudio: resolvedHasAudio,
                    isScreenSharing: resolvedIsScreenSharing
                },
                roomSize: room.length + (isExisting ? 0 : 1),
                joinedAt: Date.now()
            };

            const existingIdx = room.findIndex(p => p.socketId === socket.id);
            if (existingIdx >= 0) {
                room[existingIdx] = participant;
            } else {
                room.push(participant);
            }

            socket.join(`call_${channelId}`);
            socket.data.activeCallChannelId = channelId;
            socket.data.activeCallUserId = user.id;

            try {
                app.log.info({ channelId, userId: user.id, socketId: socket.id, roomSize: room.length }, '[Anticeil Call Engine] User joined call room');
            } catch (e) {}

            socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_USER_JOINED', participant);
            const io = socket.server || getIOServer();
            if (io) {
                io.emit('COMMUNITY_CALL_STATE', {
                    channelId,
                    active: true,
                    participantCount: room.length,
                    participants: room
                });
            }

            if (callback) {
                callback({
                    success: true,
                    participants: room.filter(p => p.socketId !== socket.id)
                });
            }
        });

        socket.on('COMMUNITY_CALL_SIGNAL', (data) => {
            const { channelId, targetSocketId, signal } = data || {};
            if (!channelId || !signal) return;
            const payload = {
                channelId,
                fromSocketId: socket.id,
                fromUserId: socket.data?.activeCallUserId,
                signal
            };
            const io = socket.server || getIOServer();
            if (targetSocketId) {
                if (io) {
                    io.to(targetSocketId).emit('COMMUNITY_CALL_SIGNAL', payload);
                } else {
                    socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_SIGNAL', payload);
                }
            } else {
                socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_SIGNAL', payload);
            }
        });

        socket.on('COMMUNITY_CALL_TOGGLE_MEDIA', (data) => {
            const { channelId, hasVideo, hasAudio, isScreenSharing, isSpeaking } = data || {};
            if (!channelId || !activeCallRooms[channelId]) return;
            const room = activeCallRooms[channelId];
            const p = room.find(p => p.socketId === socket.id);
            if (p) {
                if (hasVideo !== undefined) p.hasVideo = hasVideo;
                if (hasAudio !== undefined) p.hasAudio = hasAudio;
                if (isScreenSharing !== undefined) p.isScreenSharing = isScreenSharing;
            }
            socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_PEER_MEDIA_UPDATED', {
                socketId: socket.id,
                userId: socket.data?.activeCallUserId,
                hasVideo,
                hasAudio,
                isScreenSharing,
                isSpeaking
            });
        });

        socket.on('COMMUNITY_CALL_ACTIVITY_EVENT', (data) => {
            const { channelId, action, payload } = data || {};
            if (!channelId) return;

            if (!activeCallActivities[channelId]) {
                activeCallActivities[channelId] = {};
            }
            const act = activeCallActivities[channelId];

            if (action === 'ACTIVITY_LAUNCH') {
                act.appId = payload?.appId;
                act.appName = payload?.appName;
                act.hostUserId = payload?.hostUserId || socket.data?.activeCallUserId;
                act.hostUserName = payload?.hostUserName;
                act.hostUserAvatar = payload?.hostUserAvatar;
            } else if (action === 'ACTIVITY_STOP') {
                delete activeCallActivities[channelId];
            } else if (action === 'YOUTUBE_CHANGE_VIDEO') {
                act.videoId = payload?.videoId;
                act.currentTime = 0;
                act.isPlaying = true;
                act.updatedAt = Date.now();
                if (payload?.hostUserId) act.hostUserId = payload.hostUserId;
            } else if (action === 'YOUTUBE_PLAY') {
                act.isPlaying = true;
                if (typeof payload?.currentTime === 'number') act.currentTime = payload.currentTime;
                act.updatedAt = Date.now();
            } else if (action === 'YOUTUBE_PAUSE') {
                act.isPlaying = false;
                if (typeof payload?.currentTime === 'number') act.currentTime = payload.currentTime;
                act.updatedAt = Date.now();
            } else if (action === 'YOUTUBE_SEEK') {
                if (typeof payload?.currentTime === 'number') act.currentTime = payload.currentTime;
                if (payload?.isPlaying !== undefined) act.isPlaying = payload.isPlaying;
                act.updatedAt = Date.now();
            } else if (action === 'YOUTUBE_TIME_SYNC') {
                if (typeof payload?.currentTime === 'number') act.currentTime = payload.currentTime;
                if (payload?.isPlaying !== undefined) act.isPlaying = payload.isPlaying;
                act.updatedAt = Date.now();
            } else if (action === 'YOUTUBE_UPDATE_PLAYLIST') {
                if (Array.isArray(payload?.playlist)) act.playlist = payload.playlist;
            } else if (action === 'YOUTUBE_CHANGE_HOST') {
                if (payload?.hostUserId) act.hostUserId = payload.hostUserId;
                if (payload?.hostUserName) act.hostUserName = payload.hostUserName;
                if (payload?.hostUserAvatar !== undefined) act.hostUserAvatar = payload.hostUserAvatar;
            } else if (action === 'YOUTUBE_TOGGLE_EDIT_PERMISSION') {
                if (payload?.allowEveryoneEdit !== undefined) act.allowEveryoneEdit = payload.allowEveryoneEdit;
            } else if (action === 'YOUTUBE_SYNC_STATE') {
                if (payload?.videoId) act.videoId = payload.videoId;
                if (Array.isArray(payload?.playlist)) act.playlist = payload.playlist;
                if (payload?.hostUserId) act.hostUserId = payload.hostUserId;
                if (payload?.hostUserName) act.hostUserName = payload.hostUserName;
                if (payload?.hostUserAvatar !== undefined) act.hostUserAvatar = payload.hostUserAvatar;
                if (typeof payload?.currentTime === 'number') act.currentTime = payload.currentTime;
                if (payload?.isPlaying !== undefined) act.isPlaying = payload.isPlaying;
                act.updatedAt = Date.now();
            } else if (action === 'YOUTUBE_QUERY_STATE') {
                if (act.videoId) {
                    const elapsed = (act.isPlaying && act.updatedAt) ? (Date.now() - act.updatedAt) / 1000 : 0;
                    const estimatedTime = Math.max(0, (act.currentTime || 0) + elapsed);
                    socket.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                        channelId,
                        fromSocketId: 'server',
                        fromUserId: 'server',
                        action: 'YOUTUBE_SYNC_STATE',
                        payload: {
                            videoId: act.videoId,
                            playlist: act.playlist || [],
                            hostUserId: act.hostUserId,
                            hostUserName: act.hostUserName,
                            hostUserAvatar: act.hostUserAvatar,
                            allowEveryoneEdit: act.allowEveryoneEdit ?? true,
                            currentTime: estimatedTime,
                            isPlaying: act.isPlaying ?? true,
                        }
                    });
                }
            } else if (action === 'ACTIVITY_QUERY' || action === 'QUERY_ACTIVE_ACTIVITY') {
                if (act.appId) {
                    socket.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                        channelId,
                        fromSocketId: 'server',
                        fromUserId: 'server',
                        action: 'ACTIVITY_LAUNCH',
                        payload: { appId: act.appId, appName: act.appName || act.appId }
                    });
                }
            } else if (action === 'CHESS_MOVE') {
                act.chessFen = payload?.fen;
                act.chessHistory = payload?.history || [];
                act.chessLastMove = payload?.move;
                act.chessTurn = payload?.turn;
                if (payload?.whitePlayer) act.chessWhitePlayer = payload.whitePlayer;
                if (payload?.blackPlayer) act.chessBlackPlayer = payload.blackPlayer;
            } else if (action === 'CHESS_CLAIM_ROLE') {
                if (payload?.role === 'white') act.chessWhitePlayer = payload.player;
                if (payload?.role === 'black') act.chessBlackPlayer = payload.player;
            } else if (action === 'CHESS_RESET') {
                delete act.chessFen;
                delete act.chessHistory;
                delete act.chessLastMove;
                delete act.chessTurn;
            } else if (action === 'CHESS_QUERY_STATE') {
                if (act.chessFen || act.chessWhitePlayer || act.chessBlackPlayer) {
                    socket.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                        channelId,
                        fromSocketId: 'server',
                        fromUserId: 'server',
                        action: 'CHESS_SYNC_STATE',
                        payload: {
                            fen: act.chessFen,
                            history: act.chessHistory || [],
                            lastMove: act.chessLastMove,
                            turn: act.chessTurn,
                            whitePlayer: act.chessWhitePlayer,
                            blackPlayer: act.chessBlackPlayer
                        }
                    });
                }
            }

            try {
                socket.join(`call_${channelId}`);
            } catch (e) {}

            socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                channelId,
                fromSocketId: socket.id,
                fromUserId: socket.data?.activeCallUserId,
                action,
                payload
            });
        });

        const leaveCurrentCall = () => {
            const channelId = socket.data?.activeCallChannelId;
            if (!channelId || !activeCallRooms[channelId]) return;
            activeCallRooms[channelId] = activeCallRooms[channelId].filter(p => p.socketId !== socket.id);
            socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_USER_LEFT', {
                channelId,
                socketId: socket.id,
                userId: socket.data?.activeCallUserId
            });
            socket.leave(`call_${channelId}`);
            socket.data.activeCallChannelId = null;

            const room = activeCallRooms[channelId];
            if (room && room.length === 0) {
                delete activeCallRooms[channelId];
                delete activeCallActivities[channelId];
            }
            const io = socket.server || getIOServer();
            if (io) {
                io.emit('COMMUNITY_CALL_STATE', {
                    channelId,
                    active: (room && room.length > 0) || false,
                    participantCount: room ? room.length : 0,
                    participants: room || []
                });
            }
        };

        socket.on('COMMUNITY_CALL_LEAVE', () => {
            leaveCurrentCall();
        });

        socket.on('disconnect', () => {
            leaveCurrentCall();
        });
    }

    // Attach via onReady hook
    app.addHook('onReady', async () => {
        const io = getIOServer();
        if (io) {
            try {
                app.log.info('[Anticeil Call Engine] Bound to Socket.IO server onReady');
            } catch (e) {}
            io.on('connection', (socket) => {
                attachCallEngineToSocket(socket);
            });
            if (io.sockets && io.sockets.sockets) {
                for (const [_, s] of io.sockets.sockets) {
                    attachCallEngineToSocket(s);
                }
            }
        }
    });

    // Also attach via websocketService.addListener for all authenticated USER sockets
    const callEvents = [
        'COMMUNITY_CALL_JOIN',
        'COMMUNITY_CALL_SIGNAL',
        'COMMUNITY_CALL_TOGGLE_MEDIA',
        'COMMUNITY_CALL_ACTIVITY_EVENT',
        'COMMUNITY_CALL_LEAVE'
    ];
    for (const evt of callEvents) {
        websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, evt, (socket) => {
            attachCallEngineToSocket(socket);
            return async (data, principal, projectId, callback) => {};
        });
    }

    // --- INTERCEPT PIECE BUNDLE DOWNLOAD FOR ANTICEIL CHAT (WORKER ENGINE) ---
    const interceptPieceBundle = async (req, reply) => {
        const rawUrl = decodeURIComponent(req.raw?.url || req.url || '');
        if (rawUrl.includes('/pieces/bundle') && (rawUrl.includes('anticeil-chat') || rawUrl.includes('@activepieces/piece-anticeil-chat'))) {
            console.log('[Anticeil Piece Interceptor] Intercepted bundle download request:', req.raw?.url || req.url);
            app.log.info({ url: req.url }, '[Anticeil Piece Interceptor] Intercepted bundle download request');
            const fs = require('fs');
            const path = require('path');
            const candidatePaths = [
                '/usr/src/app/packages/pieces/community/anticeil-chat/activepieces-piece-anticeil-chat-0.1.0.tgz',
                '/usr/src/app/activepieces-piece-anticeil-chat-0.1.0.tgz',
                path.resolve('packages/pieces/community/anticeil-chat/activepieces-piece-anticeil-chat-0.1.0.tgz'),
                path.resolve('activepieces-piece-anticeil-chat-0.1.0.tgz'),
                path.join(__dirname, '../../../../../../packages/pieces/community/anticeil-chat/activepieces-piece-anticeil-chat-0.1.0.tgz')
            ];
            for (const p of candidatePaths) {
                if (fs.existsSync(p)) {
                    console.log('[Anticeil Piece Interceptor] Found bundle tgz. Serving:', p);
                    app.log.info({ path: p }, '[Anticeil Piece Interceptor] Serving bundle tgz');
                    return reply
                        .status(200)
                        .header('Content-Type', 'application/octet-stream')
                        .header('Content-Disposition', 'attachment; filename="activepieces-piece-anticeil-chat-0.1.0.tgz"')
                        .send(fs.readFileSync(p));
                }
            }
            console.error('[Anticeil Piece Interceptor] Piece tarball NOT found in candidate paths:', candidatePaths);
        }
    };
    app.addHook('onRequest', interceptPieceBundle);
    app.addHook('preHandler', interceptPieceBundle);
}

