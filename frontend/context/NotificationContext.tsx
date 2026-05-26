'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '@/lib/api';

type NotificationPayload = Record<string, unknown>;

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data: NotificationPayload;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  socket: Socket | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications?limit=20');
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Connect to Socket.io when user logs in
  useEffect(() => {
    if (!auth?.user || !socket) {
      return;
    }

    queueMicrotask(() => {
      void fetchNotifications();
      void fetchUnreadCount();
    });

    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    // Booking negotiation events
    const handleNewRequest = (data: NotificationPayload) => {
      const touristName = typeof data.touristName === 'string' ? data.touristName : 'A tourist';
      const notif: Notification = {
        _id: `booking-req-${Date.now()}`,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `${touristName} sent a booking request`,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleCounterOffer = (data: NotificationPayload) => {
      const counterPrice = typeof data.counterPrice === 'number' || typeof data.counterPrice === 'string'
        ? data.counterPrice
        : '';
      const notif: Notification = {
        _id: `counter-${Date.now()}`,
        type: 'counter_offer',
        title: 'Counter Offer Received',
        message: `New counter offer of NPR ${counterPrice}`,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleAccepted = (data: NotificationPayload) => {
      const agreedPrice = typeof data.agreedPrice === 'number' || typeof data.agreedPrice === 'string'
        ? data.agreedPrice
        : '';
      const notif: Notification = {
        _id: `accepted-${Date.now()}`,
        type: 'booking_accepted',
        title: 'Booking Confirmed!',
        message: `Your booking has been confirmed at NPR ${agreedPrice}`,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleDeclined = (data: NotificationPayload) => {
      const notif: Notification = {
        _id: `declined-${Date.now()}`,
        type: 'booking_declined',
        title: 'Booking Declined',
        message: 'Your booking request was declined',
        data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleConnectError = (err: Error) => {
      console.error('Socket connection error:', err.message);
    };

    socket.on('notification', handleNotification);
    socket.on('booking:new-request', handleNewRequest);
    socket.on('booking:counter-offer', handleCounterOffer);
    socket.on('booking:accepted', handleAccepted);
    socket.on('booking:declined', handleDeclined);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('booking:new-request', handleNewRequest);
      socket.off('booking:counter-offer', handleCounterOffer);
      socket.off('booking:accepted', handleAccepted);
      socket.off('booking:declined', handleDeclined);
      socket.off('connect_error', handleConnectError);
    };
  }, [auth?.user, fetchNotifications, fetchUnreadCount, socket]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications: auth?.user ? notifications : [],
      unreadCount: auth?.user ? unreadCount : 0,
      socket: auth?.user ? socket : null,
      fetchNotifications,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
