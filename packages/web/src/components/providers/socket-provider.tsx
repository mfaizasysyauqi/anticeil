import React from 'react';
import { io } from 'socket.io-client';

// In serverless (Cloudflare Workers) mode there is no socket.io backend.
// We create the socket with autoConnect: false and never call .connect(),
// so consumers get a valid socket reference without triggering WebSocket errors.
const socket = io('/', {
  transports: ['websocket'],
  path: '/api/socket.io',
  autoConnect: false,
  reconnection: false,
});

const SocketContext = React.createContext<typeof socket>(socket);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  // No connection logic — real-time is not available in serverless mode.
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => React.useContext(SocketContext);
