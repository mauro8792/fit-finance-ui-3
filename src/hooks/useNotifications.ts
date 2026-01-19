'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useRoutineStore } from '@/stores/routine-store';

// Eventos de notificación
export enum NotificationEvent {
  ROUTINE_ACTIVATED = 'routine:activated',
  ROUTINE_UPDATED = 'routine:updated',
  ROUTINE_ASSIGNED = 'routine:assigned',
  CACHE_INVALIDATE = 'cache:invalidate',
}

interface RoutineNotificationPayload {
  routineId: string;
  routineName: string;
  coachName?: string;
  message?: string;
  timestamp: string;
  type: NotificationEvent;
}

// La URL base del servidor (sin /api)
const WS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');

export function useNotifications() {
  const socketRef = useRef<Socket | null>(null);
  const { token, user, userType } = useAuthStore();
  const { invalidateCache } = useRoutineStore();

  const handleRoutineActivated = useCallback((payload: RoutineNotificationPayload) => {
    console.log('📢 Rutina activada:', payload);
    
    // Mostrar toast
    toast.success(payload.message || '¡Tu coach activó una nueva rutina!', {
      description: `Rutina: ${payload.routineName}`,
      duration: 5000,
    });
    
    // Invalidar caché de rutinas para forzar recarga
    invalidateCache();
  }, [invalidateCache]);

  const handleRoutineUpdated = useCallback((payload: RoutineNotificationPayload) => {
    console.log('📢 Rutina actualizada:', payload);
    
    toast.info(payload.message || 'Tu rutina fue actualizada', {
      description: `Rutina: ${payload.routineName}`,
      duration: 4000,
    });
    
    invalidateCache();
  }, [invalidateCache]);

  const handleCacheInvalidate = useCallback(() => {
    console.log('📢 Invalidando caché');
    invalidateCache();
  }, [invalidateCache]);

  useEffect(() => {
    console.log('🔔 useNotifications hook ejecutado', { token: !!token, user: user?.fullName, userType });
    
    // Solo conectar si hay token y usuario
    if (!token || !user) {
      console.log('⏭️ Sin token o usuario, no conectando WebSocket');
      return;
    }

    // Solo conectar si es un alumno
    if (userType !== 'student') {
      console.log('⏭️ Usuario no es alumno (userType:', userType, '), no conectando WebSocket');
      return;
    }

    // Si ya hay una conexión activa, no crear otra
    if (socketRef.current?.connected) {
      console.log('✅ WebSocket ya conectado');
      return;
    }

    console.log('🔌 Conectando WebSocket de notificaciones a', WS_URL);

    // Crear conexión Socket.io
    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Event handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
    });

    // Listeners de eventos de rutina
    socket.on(NotificationEvent.ROUTINE_ACTIVATED, handleRoutineActivated);
    socket.on(NotificationEvent.ROUTINE_UPDATED, handleRoutineUpdated);
    socket.on(NotificationEvent.CACHE_INVALIDATE, handleCacheInvalidate);

    // Cleanup
    return () => {
      console.log('🔌 Desconectando WebSocket...');
      socket.off(NotificationEvent.ROUTINE_ACTIVATED, handleRoutineActivated);
      socket.off(NotificationEvent.ROUTINE_UPDATED, handleRoutineUpdated);
      socket.off(NotificationEvent.CACHE_INVALIDATE, handleCacheInvalidate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, userType, handleRoutineActivated, handleRoutineUpdated, handleCacheInvalidate]);

  // Función para verificar estado de conexión
  const isConnected = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  return { isConnected };
}

