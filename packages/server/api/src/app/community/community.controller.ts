import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { communityActivityController } from './controllers/community-activity.controller';
import { communityBillingController } from './controllers/community-billing.controller';
import { communityColonyController } from './controllers/community-colony.controller';
import { communityShopController } from './controllers/community-shop.controller';
import { communityUserController } from './controllers/community-user.controller';

export const communityController: FastifyPluginAsyncZod = async (app) => {
  // ── 1. Register Modular Sub-Controllers ──
  await app.register(communityActivityController);
  await app.register(communityBillingController);
  await app.register(communityColonyController);
  await app.register(communityShopController);
  await app.register(communityUserController);

  // ── 2. Realtime Voice Call Signaling Socket Relay ──
  if ((app as any).io) {
    const callRooms = new Map<string, Map<string, any>>();

    (app as any).io.on('connection', (socket: any) => {
      // 1. Join Call Channel
      socket.on('COMMUNITY_CALL_JOIN', (payload: any, callback?: any) => {
        try {
          const { channelId, user, hasVideo, hasAudio, isScreenSharing, plan } = payload || {};
          if (!channelId) return;

          const roomKey = `call_${channelId}`;
          socket.join(roomKey);

          if (!callRooms.has(channelId)) {
            callRooms.set(channelId, new Map());
          }
          const room = callRooms.get(channelId)!;

          // Collect current participants (excluding joining socket)
          const existingParticipants = Array.from(room.values()).filter((p: any) => p.socketId !== socket.id);

          const participantData = {
            socketId: socket.id,
            userId: user?.id,
            userName: user?.name,
            userAvatar: user?.avatar,
            hasVideo: Boolean(hasVideo),
            hasAudio: hasAudio !== undefined ? Boolean(hasAudio) : true,
            isScreenSharing: Boolean(isScreenSharing),
            plan: plan || 'free',
          };
          room.set(socket.id, participantData);

          if (typeof callback === 'function') {
            callback({
              success: true,
              participants: existingParticipants,
            });
          }

          // Notify all other members in this call channel
          socket.to(roomKey).emit('COMMUNITY_CALL_USER_JOINED', {
            ...participantData,
            roomSize: room.size,
          });
        } catch (err) {
          console.error('[COMMUNITY_CALL_JOIN Error]', err);
        }
      });

      // 2. WebRTC Peer Signaling (targeted to specific socket if specified)
      socket.on('COMMUNITY_CALL_SIGNAL', (payload: any) => {
        try {
          const enrichedPayload = {
            ...payload,
            fromSocketId: socket.id,
          };
          if (payload?.targetSocketId) {
            (app as any).io.to(payload.targetSocketId).emit('COMMUNITY_CALL_SIGNAL', enrichedPayload);
          } else if (payload?.channelId) {
            socket.to(`call_${payload.channelId}`).emit('COMMUNITY_CALL_SIGNAL', enrichedPayload);
          } else {
            socket.broadcast.emit('COMMUNITY_CALL_SIGNAL', enrichedPayload);
          }
        } catch (err) {
          console.error('[COMMUNITY_CALL_SIGNAL Error]', err);
        }
      });

      // 3. Media Toggle (Camera / Mic / Screen Share)
      socket.on('COMMUNITY_CALL_TOGGLE_MEDIA', (payload: any) => {
        try {
          const { channelId, hasVideo, hasAudio, isScreenSharing } = payload || {};
          if (!channelId) return;

          const room = callRooms.get(channelId);
          if (room && room.has(socket.id)) {
            const current = room.get(socket.id);
            if (hasVideo !== undefined) current.hasVideo = hasVideo;
            if (hasAudio !== undefined) current.hasAudio = hasAudio;
            if (isScreenSharing !== undefined) current.isScreenSharing = isScreenSharing;
            room.set(socket.id, current);
          }

          socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_PEER_MEDIA_UPDATED', {
            socketId: socket.id,
            hasVideo,
            hasAudio,
            isScreenSharing,
          });
        } catch (err) {
          console.error('[COMMUNITY_CALL_TOGGLE_MEDIA Error]', err);
        }
      });

      // 4. Leave Call
      socket.on('COMMUNITY_CALL_LEAVE', (payload: any) => {
        try {
          const { channelId } = payload || {};
          if (channelId) {
            const roomKey = `call_${channelId}`;
            socket.leave(roomKey);
            const room = callRooms.get(channelId);
            if (room) {
              room.delete(socket.id);
              if (room.size === 0) callRooms.delete(channelId);
            }
            socket.to(roomKey).emit('COMMUNITY_CALL_USER_LEFT', { socketId: socket.id });
          } else {
            socket.broadcast.emit('COMMUNITY_CALL_USER_LEFT', { socketId: socket.id });
          }
        } catch (err) {
          console.error('[COMMUNITY_CALL_LEAVE Error]', err);
        }
      });

      // 5. Cleanup on disconnect
      socket.on('disconnect', () => {
        try {
          callRooms.forEach((room, channelId) => {
            if (room.has(socket.id)) {
              room.delete(socket.id);
              if (room.size === 0) callRooms.delete(channelId);
              socket.to(`call_${channelId}`).emit('COMMUNITY_CALL_USER_LEFT', { socketId: socket.id });
            }
          });
        } catch {}
      });

      socket.on('COMMUNITY_CALL_ACTIVITY_EVENT', (payload: any) => {
        if (payload?.channelId) {
          socket.to(`call_${payload.channelId}`).emit('COMMUNITY_CALL_ACTIVITY_EVENT', payload);
        } else {
          socket.broadcast.emit('COMMUNITY_CALL_ACTIVITY_EVENT', payload);
        }
      });

      socket.on('COMMUNITY_STAGE_EVENT', (payload: any) => {
        if (payload?.channelId) {
          socket.to(`call_${payload.channelId}`).emit('COMMUNITY_STAGE_EVENT', payload);
        } else {
          socket.broadcast.emit('COMMUNITY_STAGE_EVENT', payload);
        }
      });
    });
  }
};
