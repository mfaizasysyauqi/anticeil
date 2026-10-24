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

            // Clean up any previously seeded dummy/placeholder channels and messages
            const dummyChannelIds = [
                'umum', 'showcase-template', 'jual-beli-template', 'tanya-jawab',
                'ai-agents-discussion', 'prompt-engineering', 'mcp-builders',
                'free-workflows', 'enterprise-solutions', 'workflow-critique',
                'custom-pieces', 'webhook-integration', 'bug-reports'
            ];
            try {
                await ds.query(
                    `DELETE FROM anticeil_community_messages WHERE channel_id = ANY($1) OR sender_id LIKE 'user-%' OR sender_id = 'anticeil-community'`,
                    [dummyChannelIds]
                );
                await ds.query(
                    `DELETE FROM anticeil_community_channels WHERE id = ANY($1)`,
                    [dummyChannelIds]
                );
            } catch (cleanErr) {}

            dbReady = true;
        } catch (err) {
            app.log.warn({ err }, '[Community API] Database initialization warning, using in-memory');
        }
    }

    ensureTables().catch(() => {});

    // --- CHANNELS (CRUD) ---
    app.get('/v1/community/channels', async (req) => {
        await ensureTables();
        const ds = await getDb();
        const hubId = req.query?.hubId;
        if (ds && dbReady) {
            try {
                let rows;
                if (hubId) {
                    rows = await ds.query('SELECT * FROM anticeil_community_channels WHERE hub_id = $1 ORDER BY created_at ASC', [hubId]);
                } else {
                    rows = await ds.query('SELECT * FROM anticeil_community_channels ORDER BY created_at ASC');
                }
                return rows.map(r => ({
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
        return hubId ? memoryChannels.filter(c => c.hub_id === hubId) : memoryChannels;
    });

    app.post('/v1/community/channels', async (req, reply) => {
        await ensureTables();
        const { name, description = '', category = 'CHANNELS', hubId = 'anticeil' } = req.body || {};
        if (!name) {
            return reply.status(400).send({ message: 'Channel name is required' });
        }
        const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `channel-${Date.now()}`;
        const id = cleanName;
        const newChannel = {
            id,
            name: cleanName,
            description,
            category,
            hubId,
            isDirectMessage: false
        };

        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query(
                    'INSERT INTO anticeil_community_channels (id, name, description, category, hub_id, is_direct_message) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=$2, description=$3',
                    [id, cleanName, description, category, hubId, false]
                );
            } catch (e) {}
        }
        if (!memoryChannels.some(c => c.id === id)) {
            memoryChannels.push({ ...newChannel, hub_id: hubId, is_direct_message: false });
        }
        if (app.io) {
            app.io.emit('COMMUNITY_CHANNEL_CREATED', newChannel);
        }
        return newChannel;
    });

    app.put('/v1/community/channels/:id', async (req, reply) => {
        await ensureTables();
        const { id } = req.params;
        const { name, description } = req.body || {};
        const ds = await getDb();
        let updatedChannel = null;
        if (ds && dbReady) {
            try {
                const res = await ds.query(
                    'UPDATE anticeil_community_channels SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 RETURNING *',
                    [name, description, id]
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
    });

    app.delete('/v1/community/channels/:id', async (req) => {
        await ensureTables();
        const { id } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                await ds.query('DELETE FROM anticeil_community_messages WHERE channel_id = $1', [id]);
                await ds.query('DELETE FROM anticeil_community_channels WHERE id = $1', [id]);
            } catch (e) {}
        }
        const memIdx = memoryChannels.findIndex(c => c.id === id);
        if (memIdx >= 0) memoryChannels.splice(memIdx, 1);
        delete memoryMessages[id];

        if (app.io) {
            app.io.emit('COMMUNITY_CHANNEL_DELETED', { id });
        }
        return { success: true, id };
    });

    // --- MESSAGES (CRUD) ---
    app.get('/v1/community/channels/:channelId/messages', async (req) => {
        await ensureTables();
        const { channelId } = req.params;
        const ds = await getDb();
        if (ds && dbReady) {
            try {
                const rows = await ds.query(
                    'SELECT * FROM anticeil_community_messages WHERE channel_id = $1 ORDER BY created_at ASC LIMIT 200',
                    [channelId]
                );
                return rows.map(r => ({
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
    });

    app.post('/v1/community/channels/:channelId/messages', async (req, reply) => {
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
    });

    app.delete('/v1/community/messages/:id', async (req) => {
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
    });

    app.post('/v1/community/messages/:id/reactions', async (req) => {
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
    });

    // --- MEMBERS ---
    app.get('/v1/community/members', async () => {
        const ds = await getDb();
        if (ds) {
            try {
                const users = await ds.query(`
                    SELECT u.id, u."platformRole", ui."firstName", ui."lastName", ui.email, ui."imageUrl"
                    FROM "user" u
                    LEFT JOIN "user_identity" ui ON u."identityId" = ui.id
                    LIMIT 200
                `);
                return (users || []).map(u => ({
                    id: u.id,
                    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User',
                    email: u.email || '',
                    avatar: u.imageUrl || null,
                    role: u.platformRole === 'ADMIN' ? 'admin' : 'member',
                    status: 'online'
                }));
            } catch (e) {
                return [];
            }
        }
        return [];
    });
}

