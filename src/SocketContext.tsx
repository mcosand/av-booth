import { createContext, useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerMessage, ServerToClientMessages } from '../common/socket-models';

// Create the context
const SocketContext = createContext<Socket | null>(null);

// Create a provider component
export const SocketProvider = ({ children }: PropsWithChildren) => {
  const socketRef = useRef<Socket<ServerToClientMessages, ClientToServerMessage> | null>(null);

  useEffect(() => {
    console.log('setting up socket.io');
    // Connect to Socket.IO server at custom path /ws
    socketRef.current = io('/', {
      path: '/ws',
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    return () => {
      console.log('tearing down socket.io');
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket
export const useSocket = () => {
  return useContext(SocketContext);
};