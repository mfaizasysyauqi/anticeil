"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceModule = void 0;
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
exports.presenceModule = presenceModule;

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
            `);

            // Add platform_id column for tenant isolation
            await ds.query(`
                ALTER TABLE anticeil_community_channels ADD COLUMN IF NOT EXISTS platform_id VARCHAR(128);
                CREATE INDEX IF NOT EXISTS idx_acc_platform ON anticeil_community_channels (platform_id);
            `);

            // Clean up legacy un-isolated data (no platform_id) and old dummy channels
            try {
                await ds.query(`DELETE FROM anticeil_community_messages WHERE channel_id IN (SELECT id FROM anticeil_community_channels WHERE platform_id IS NULL)`);
                await ds.query(`DELETE FROM anticeil_community_channels WHERE platform_id IS NULL`);
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
                    rows = await ds.query('SELECT * FROM anticeil_community_channels WHERE (platform_id = $1 OR platform_id IS NULL) AND hub_id = $2 ORDER BY created_at ASC', [platformId, hubId]);
                } else {
                    rows = await ds.query('SELECT * FROM anticeil_community_channels WHERE (platform_id = $1 OR platform_id IS NULL) ORDER BY created_at ASC', [platformId]);
                }
                return (rows || []).map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description || '',
                    category: r.category || 'CHANNELS',
                    hubId: r.hub_id || 'anticeil',
                    isDirectMessage: Boolean(r.is_direct_message),
                    dmUserId: r.dm_user_id || undefined
                }));
            } catch (e) {}
        }
        return memoryChannels.filter(c => !hubId || c.hubId === hubId);
    };

    const createChannelHandler = async (req, reply) => {
        await ensureTables();
        const { name, description = '', category = 'CHANNELS', hubId = 'anticeil' } = req.body || {};
        if (!name) {
            return reply.status(400).send({ message: 'Channel name is required' });
        }
        const ds = await getDb();
        const platformId = await resolvePlatformId(req, ds);
        const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `channel-${Date.now()}`;
        const id = `ch-${Date.now().toString(36)}-${cleanName.substring(0, 20)}`;
        const newChannel = {
            id,
            name: cleanName,
            description,
            category,
            hubId,
            isDirectMessage: false
        };

        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message, platform_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name=$2, description=$3',
                    [id, cleanName, description, category, hubId, false, platformId]
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
        const { name, description } = req.body || {};
        const ds = await getDb();
        let updatedChannel = null;
        if (ds && dbReady) {
            try {
                const platformId = await resolvePlatformId(req, ds);
                const res = await ds.query(
                    'UPDATE anticeil_community_channels SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 AND (platform_id = $4 OR platform_id IS NULL) RETURNING *',
                    [name, description, id, platformId]
                );
                if (res && res[0]) {
                    updatedChannel = {
                        id: res[0].id,
                        name: res[0].name,
                        description: res[0].description,
                        category: res[0].category,
                        hubId: res[0].hub_id,
                        isDirectMessage: Boolean(res[0].is_direct_message)
                    };
                }
            } catch (e) {}
        }
        const memIdx = memoryChannels.findIndex(c => c.id === id);
        if (memIdx >= 0) {
            if (name) memoryChannels[memIdx].name = name;
            if (description !== undefined) memoryChannels[memIdx].description = description;
            if (!updatedChannel) {
                updatedChannel = {
                    id,
                    name: memoryChannels[memIdx].name,
                    description: memoryChannels[memIdx].description,
                    category: memoryChannels[memIdx].category,
                    hubId: memoryChannels[memIdx].hub_id
                };
            }
        }
        if (app.io && updatedChannel) {
            app.io.emit('COMMUNITY_CHANNEL_UPDATED', updatedChannel);
        }
        return updatedChannel || { id, name, description };
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
                    reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {})
                }));
            } catch (e) {}
        }
        return memoryMessages[channelId] || [];
    };

    const createMessageHandler = async (req, reply) => {
        await ensureTables();
        const { channelId } = req.params;
        const body = req.body || {};
        if (!body.content && (!body.attachments || body.attachments.length === 0)) {
            return reply.status(400).send({ message: 'Content or attachment is required' });
        }
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

        const platformId = await resolvePlatformId(req, ds);
        const hubId = body.hubId || 'anticeil';
        let targetChannel = null;

        // 1. Resolve target channel by channelId or channel name
        const rawTarget = body.channelId || body.channel || 'general';

        if (ds && dbReady) {
            try {
                // Try finding by exact id first
                let rows = await ds.query(
                    'SELECT * FROM anticeil_community_channels WHERE id = $1 AND (platform_id = $2 OR platform_id IS NULL) LIMIT 1',
                    [rawTarget, platformId]
                );
                if (rows && rows[0]) {
                    targetChannel = rows[0];
                } else {
                    // Try finding by name (strip leading # and slugify)
                    const cleanSearchName = String(rawTarget).replace(/^#/, '').toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
                    rows = await ds.query(
                        'SELECT * FROM anticeil_community_channels WHERE (platform_id = $1 OR platform_id IS NULL) AND (LOWER(name) = $2 OR LOWER(name) = $3) LIMIT 1',
                        [platformId, cleanSearchName, String(rawTarget).replace(/^#/, '').toLowerCase().trim()]
                    );
                    if (rows && rows[0]) {
                        targetChannel = rows[0];
                    }
                }
            } catch (e) {}
        }

        // Check memoryChannels if not found in db
        if (!targetChannel) {
            targetChannel = memoryChannels.find(c => c.id === rawTarget || c.name.toLowerCase() === String(rawTarget).replace(/^#/, '').toLowerCase());
        }

        // 2. If channel doesn't exist yet, auto-create it!
        if (!targetChannel) {
            const rawName = String(body.channel || rawTarget).replace(/^#/, '').trim() || 'general';
            const cleanName = rawName.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'general';
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

            if (app.io) {
                app.io.emit('COMMUNITY_CHANNEL_CREATED', formattedNewChannel);
            }
        }

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

    // --- REGISTER ROUTE ALIASES (Supports both /v1/community/* and /v1/messages/*) ---
    const routePrefixes = ['/v1/community', '/v1/messages'];
    for (const prefix of routePrefixes) {
        // Channels
        app.get(`${prefix}/channels`, getChannelsHandler);
        app.post(`${prefix}/channels`, createChannelHandler);
        app.put(`${prefix}/channels/:id`, updateChannelHandler);
        app.delete(`${prefix}/channels/:id`, deleteChannelHandler);

        // Messages
        app.get(`${prefix}/channels/:channelId/messages`, getMessagesHandler);
        app.post(`${prefix}/channels/:channelId/messages`, createMessageHandler);
        app.delete(`${prefix}/messages/:id`, deleteMessageHandler);
        app.post(`${prefix}/messages/:id/reactions`, toggleReactionHandler);

        // Members
        app.get(`${prefix}/members`, getMembersHandler);

        // Bot Webhook Ingestion
        app.get(`${prefix}/webhook`, webhookDocHandler);
        app.post(`${prefix}/webhook`, botWebhookHandler);
        app.post(`${prefix}/bot/message`, botWebhookHandler);
        app.post(`${prefix}/bot`, botWebhookHandler);
    }
}

