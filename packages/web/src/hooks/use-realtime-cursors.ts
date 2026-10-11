import {
  CursorUpdatedEvent,
  WebsocketClientEvent,
  WebsocketServerEvent,
} from '@activepieces/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRealtimeCollaboration } from '@/components/providers/socket-provider';
import { authenticationSession } from '@/lib/authentication-session';

export interface CollaboratorCursor {
  userId: string;
  userDisplayName: string;
  userImageUrl?: string | null;
  x: number;
  y: number;
  selectedStep?: string | null;
  color: string;
  lastSeen: number;
}

const CURSOR_COLORS = [
  '#FF5722', // Deep Orange
  '#00B894', // Emerald / Mint
  '#0984E3', // Electric Blue
  '#6C5CE7', // Lavender / Indigo
  '#E84393', // Rose Pink
  '#F39C12', // Amber
  '#00CEC9', // Robin Teal
  '#D63031', // Crimson
  '#A29BFE', // Periwinkle
  '#2ECC71', // Bright Green
];

export function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

const INACTIVITY_TIMEOUT_MS = 4000;
const THROTTLE_MS = 35; // ~28 fps for responsive cursor motion

export function useRealtimeCursors({
  resourceId,
  selectedStep,
}: {
  resourceId: string;
  selectedStep?: string | null;
}) {
  const { socket, isPlanPlusOrAbove, isConnected } = useRealtimeCollaboration();
  const currentUserId = authenticationSession.getCurrentUserId();
  const [cursors, setCursors] = useState<Record<string, CollaboratorCursor>>({});

  const lastSentTimeRef = useRef<number>(0);
  const pendingPosRef = useRef<{ x: number | null; y: number | null } | null>(null);

  // Listen for cursor updates from other collaborators on Oracle VM
  useEffect(() => {
    if (!isPlanPlusOrAbove || !resourceId) {
      setCursors({});
      return;
    }

    const handleCursorUpdated = (event: CursorUpdatedEvent) => {
      if (event.resourceId !== resourceId || event.userId === currentUserId) {
        return;
      }

      if (event.x === null || event.y === null) {
        setCursors((prev) => {
          if (!prev[event.userId]) return prev;
          const next = { ...prev };
          delete next[event.userId];
          return next;
        });
        return;
      }

      setCursors((prev) => ({
        ...prev,
        [event.userId]: {
          userId: event.userId,
          userDisplayName: event.userDisplayName || 'Collaborator',
          userImageUrl: event.userImageUrl,
          x: event.x!,
          y: event.y!,
          selectedStep: event.selectedStep ?? null,
          color: getCursorColor(event.userId),
          lastSeen: Date.now(),
        },
      }));
    };

    socket.on(WebsocketClientEvent.CURSOR_UPDATED, handleCursorUpdated);

    // Prune stale cursors every 1.5 seconds
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let changed = false;
        const next: Record<string, CollaboratorCursor> = {};
        for (const [id, c] of Object.entries(prev)) {
          if (now - c.lastSeen < INACTIVITY_TIMEOUT_MS) {
            next[id] = c;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1500);

    return () => {
      socket.off(WebsocketClientEvent.CURSOR_UPDATED, handleCursorUpdated);
      clearInterval(pruneInterval);
    };
  }, [resourceId, socket, currentUserId, isPlanPlusOrAbove]);

  // Function to broadcast current user's cursor position in canvas graph space
  const sendCursorPosition = useCallback(
    (x: number | null, y: number | null) => {
      if (!isPlanPlusOrAbove || !resourceId || !socket.connected) {
        return;
      }

      const now = performance.now();
      // If clearing cursor (pointer leave), send immediately
      if (x === null || y === null) {
        lastSentTimeRef.current = now;
        socket.emit(WebsocketServerEvent.MOVE_CURSOR, {
          resourceId,
          x: null,
          y: null,
          selectedStep: selectedStep ?? null,
        });
        return;
      }

      // Throttle rapid pointermove events
      if (now - lastSentTimeRef.current >= THROTTLE_MS) {
        lastSentTimeRef.current = now;
        socket.emit(WebsocketServerEvent.MOVE_CURSOR, {
          resourceId,
          x,
          y,
          selectedStep: selectedStep ?? null,
        });
      } else {
        pendingPosRef.current = { x, y };
      }
    },
    [isPlanPlusOrAbove, resourceId, socket, selectedStep],
  );

  // Flush any trailing throttled position
  useEffect(() => {
    if (!isPlanPlusOrAbove) return;

    const timer = setInterval(() => {
      if (pendingPosRef.current && socket.connected) {
        const { x, y } = pendingPosRef.current;
        pendingPosRef.current = null;
        lastSentTimeRef.current = performance.now();
        socket.emit(WebsocketServerEvent.MOVE_CURSOR, {
          resourceId,
          x,
          y,
          selectedStep: selectedStep ?? null,
        });
      }
    }, THROTTLE_MS);

    return () => clearInterval(timer);
  }, [isPlanPlusOrAbove, resourceId, socket, selectedStep]);

  // Clear cursor when unmounting
  useEffect(() => {
    return () => {
      if (isPlanPlusOrAbove && socket.connected && resourceId) {
        socket.emit(WebsocketServerEvent.MOVE_CURSOR, {
          resourceId,
          x: null,
          y: null,
        });
      }
    };
  }, [isPlanPlusOrAbove, resourceId, socket]);

  return {
    cursors: Object.values(cursors),
    sendCursorPosition,
    isPlanPlusOrAbove,
    isConnected,
  };
}
