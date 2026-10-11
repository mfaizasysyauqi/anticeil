import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { billingUtils } from '@/features/billing/utils/billing-utils';
import { platformHooks } from '@/hooks/platform-hooks';
import { authenticationSession } from '@/lib/authentication-session';

export const ORACLE_VM_REALTIME_URL =
  (import.meta.env.VITE_ORACLE_REALTIME_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3000' : typeof window !== 'undefined' ? window.location.origin : '');

const socket: Socket = io(ORACLE_VM_REALTIME_URL, {
  transports: ['websocket'],
  path: '/api/socket.io',
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export type SocketContextType = {
  socket: Socket;
  isPlanPlusOrAbove: boolean;
  isConnected: boolean;
  oracleVmUrl: string;
};

const SocketContext = createContext<SocketContextType>({
  socket,
  isPlanPlusOrAbove: false,
  isConnected: false,
  oracleVmUrl: ORACLE_VM_REALTIME_URL,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { platform } = platformHooks.useCurrentPlatform();
  const [isConnected, setIsConnected] = useState(socket.connected);

  const isPlanPlusOrAbove = useMemo(() => {
    const plan = platform?.plan?.plan;
    const hasLicense = !Boolean(!platform?.plan?.licenseKey);
    return billingUtils.isPaidPlan(plan) || hasLicense;
  }, [platform?.plan?.plan, platform?.plan?.licenseKey]);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const token = authenticationSession.getToken();
    const projectId = authenticationSession.getProjectId();

    // Connect to VM Oracle WebSocket only for users in Plan Plus and above
    if (isPlanPlusOrAbove && token && projectId) {
      socket.auth = {
        token,
        projectId,
      };

      if (!socket.connected) {
        socket.connect();
      }
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
      setIsConnected(false);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [isPlanPlusOrAbove]);

  const value = useMemo(
    () => ({
      socket,
      isPlanPlusOrAbove,
      isConnected,
      oracleVmUrl: ORACLE_VM_REALTIME_URL,
    }),
    [isPlanPlusOrAbove, isConnected],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context.socket;
};

export const useRealtimeCollaboration = () => {
  return useContext(SocketContext);
};
