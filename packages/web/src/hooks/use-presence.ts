import {
  PresenceUpdatedEvent,
  PresenceUser,
  WebsocketClientEvent,
  WebsocketServerEvent,
} from '@activepieces/shared';
import { useEffect, useState } from 'react';

import { useRealtimeCollaboration } from '@/components/providers/socket-provider';
import { authenticationSession } from '@/lib/authentication-session';

function usePresence({ resourceId }: { resourceId: string }): PresenceUser[] {
  const { socket, isPlanPlusOrAbove } = useRealtimeCollaboration();
  const currentUserId = authenticationSession.getCurrentUserId();
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!isPlanPlusOrAbove || !resourceId) {
      setActiveUsers([]);
      return;
    }

    const handlePresenceUpdated = (event: PresenceUpdatedEvent) => {
      if (event.resourceId === resourceId) {
        setActiveUsers(event.users.filter((u) => u.userId !== currentUserId));
      }
    };

    socket.on(WebsocketClientEvent.PRESENCE_UPDATED, handlePresenceUpdated);

    return () => {
      socket.off(WebsocketClientEvent.PRESENCE_UPDATED, handlePresenceUpdated);
    };
  }, [resourceId, socket, currentUserId, isPlanPlusOrAbove]);

  useEffect(() => {
    if (!isPlanPlusOrAbove || !resourceId || !socket.connected) {
      return;
    }

    socket.emit(
      WebsocketServerEvent.JOIN_PRESENCE,
      { resourceId },
      (response: { users: PresenceUser[] }) => {
        if (response?.users) {
          setActiveUsers(
            response.users.filter((u) => u.userId !== currentUserId),
          );
        }
      },
    );

    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit(WebsocketServerEvent.JOIN_PRESENCE, { resourceId });
      }
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
      if (socket.connected) {
        socket.emit(WebsocketServerEvent.LEAVE_PRESENCE, { resourceId });
      }
    };
  }, [resourceId, socket, currentUserId, isPlanPlusOrAbove]);

  return activeUsers;
}

export { usePresence };
