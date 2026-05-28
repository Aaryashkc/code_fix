'use client';

import { createContext, useCallback, useContext, ReactNode, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { SOCKET_BASE_URL } from '@/lib/runtimeConfig';

type SocketAck<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

type TripLocationPayload = {
  bookingId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
};

type SosPayload = {
  bookingId: string;
  message?: string;
  lat?: number | null;
  lng?: number | null;
};

interface SocketContextType {
  isConnected: boolean;
  socket: Socket | null;
  joinTripRoom: (bookingId: string) => Promise<void>;
  leaveTripRoom: (bookingId: string) => Promise<void>;
  updateLocation: (payload: TripLocationPayload) => Promise<void>;
  stopLocationSharing: (bookingId: string) => Promise<void>;
  triggerSOS: (payload: SosPayload) => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  socket: null,
  joinTripRoom: async () => {},
  leaveTripRoom: async () => {},
  updateLocation: async () => {},
  stopLocationSharing: async () => {},
  triggerSOS: async () => {},
});

function emitWithAck<T>(socket: Socket | null, event: string, payload: unknown) {
  return new Promise<T>((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket connection is not available'));
      return;
    }

    socket.emit(event, payload, (response?: SocketAck<T>) => {
      if (!response?.success) {
        reject(new Error(response?.message || `Failed to complete "${event}"`));
        return;
      }

      resolve(response.data as T);
    });
  });
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!auth?.user) {
      setIsConnected(false);
      setSocket((currentSocket) => {
        currentSocket?.disconnect();
        return null;
      });
      return;
    }

    let isCancelled = false;
    let nextSocket: Socket | null = null;

    const connect = async () => {
      const { io } = await import('socket.io-client');
      if (isCancelled) return;

      nextSocket = io(SOCKET_BASE_URL, {
        withCredentials: true,
        transports: ['websocket'],
      });

      nextSocket.on('connect', () => {
        setIsConnected(true);
        setSocket(nextSocket);
      });

      nextSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      nextSocket.on('connect_error', (error) => {
        setIsConnected(false);
        console.error('Socket connection error:', error.message);
      });
    };

    const timer = window.setTimeout(() => {
      void connect();
    }, 1200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
      nextSocket?.disconnect();
      setSocket((currentSocket) => (currentSocket === nextSocket ? null : currentSocket));
      setIsConnected(false);
    };
  }, [auth?.user]);

  const joinTripRoom = useCallback(async (bookingId: string) => {
    await emitWithAck(socket, 'joinTripRoom', { bookingId });
  }, [socket]);

  const leaveTripRoom = useCallback(async (bookingId: string) => {
    await emitWithAck(socket, 'leaveTripRoom', { bookingId });
  }, [socket]);

  const updateLocation = useCallback(async (payload: TripLocationPayload) => {
    await emitWithAck(socket, 'updateLocation', payload);
  }, [socket]);

  const stopLocationSharing = useCallback(async (bookingId: string) => {
    await emitWithAck(socket, 'stopLocationSharing', { bookingId });
  }, [socket]);

  const triggerSOS = useCallback(async (payload: SosPayload) => {
    await emitWithAck(socket, 'triggerSOS', payload);
  }, [socket]);

  return (
    <SocketContext.Provider value={{ isConnected, socket, joinTripRoom, leaveTripRoom, updateLocation, stopLocationSharing, triggerSOS }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export { SocketContext };
