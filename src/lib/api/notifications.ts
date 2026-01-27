import api from "@/lib/api";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Obtener todas mis notificaciones
 */
export const getNotifications = async (limit = 50): Promise<Notification[]> => {
  const { data } = await api.get(`/notifications?limit=${limit}`);
  return data;
};

/**
 * Obtener notificaciones no leídas
 */
export const getUnreadNotifications = async (): Promise<Notification[]> => {
  const { data } = await api.get("/notifications/unread");
  return data;
};

/**
 * Obtener cantidad de notificaciones no leídas
 */
export const getUnreadCount = async (): Promise<number> => {
  const { data } = await api.get("/notifications/unread-count");
  return data.count;
};

/**
 * Marcar una notificación como leída
 */
export const markAsRead = async (notificationId: number): Promise<void> => {
  await api.patch(`/notifications/${notificationId}/read`);
};

/**
 * Marcar todas las notificaciones como leídas
 */
export const markAllAsRead = async (): Promise<void> => {
  await api.patch("/notifications/read-all");
};

/**
 * Eliminar una notificación
 */
export const deleteNotification = async (notificationId: number): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
};

