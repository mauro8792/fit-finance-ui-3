"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellRing,
  X,
  Dumbbell,
  Edit,
  Scale,
  UserPlus,
  Info,
  Trash2,
  CheckCheck,
  Loader2,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  Apple,
} from "lucide-react";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

// Iconos según tipo de notificación
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "routine_assigned":
      return <Dumbbell className="w-5 h-5 text-success" />;
    case "routine_updated":
      return <Edit className="w-5 h-5 text-blue-400" />;
    case "weight_logged":
      return <Scale className="w-5 h-5 text-orange-400" />;
    case "new_student":
      return <UserPlus className="w-5 h-5 text-purple-400" />;
    case "fee_reminder":
      return <CreditCard className="w-5 h-5 text-yellow-400" />;
    case "fee_due_today":
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case "fee_overdue":
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case "fee_paid":
      return <CheckCheck className="w-5 h-5 text-success" />;
    case "student_food_created":
      return <Apple className="w-5 h-5 text-green-400" />;
    default:
      return <Info className="w-5 h-5 text-text-muted" />;
  }
};

// Obtener URL de navegación según tipo de notificación
const getNotificationUrl = (notif: Notification): string | null => {
  switch (notif.type) {
    case "student_food_created":
      if (notif.metadata?.foodId) {
        return `/coach/student-foods?foodId=${notif.metadata.foodId}`;
      }
      return "/coach/student-foods";
    case "new_student":
      if (notif.metadata?.studentId) {
        return `/coach/students/${notif.metadata.studentId}`;
      }
      return "/coach/students";
    case "weight_logged":
      if (notif.metadata?.studentId) {
        return `/coach/students/${notif.metadata.studentId}/progress`;
      }
      return null;
    default:
      return null;
  }
};

// Formato de tiempo relativo
const getTimeAgo = (date: string) => {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return notifDate.toLocaleDateString("es-AR");
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Manejar click en notificación con navegación
  const handleNotificationClick = async (notif: Notification) => {
    // Marcar como leída si no lo está
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }

    // Verificar si tiene URL de navegación
    const url = getNotificationUrl(notif);
    if (url) {
      setOpen(false);
      router.push(url);
    } else {
      // Si no tiene URL, expandir/contraer
      setExpandedId(expandedId === notif.id ? null : notif.id);
    }
  };

  // Cargar contador de no leídas
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Error cargando contador:", err);
    }
  }, []);

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications(30);
      setNotifications(data);
    } catch (err) {
      console.error("Error cargando notificaciones:", err);
      setError("Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar contador al montar y cada 30 segundos
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Cargar notificaciones cuando se abre el panel
  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  // Marcar como leída
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marcando como leída:", err);
    }
  };

  // Marcar todas como leídas
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marcando todas como leídas:", err);
    }
  };

  // Eliminar notificación
  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      const notif = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notif && !notif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error eliminando notificación:", err);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const readNotifications = notifications.filter((n) => n.isRead);

  return (
    <>
      {/* Botón campanita */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5 h-5 text-text-muted" />
        )}
      </Button>

      {/* Panel de notificaciones - Fullscreen para PWA */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setOpen(false)}
            />

            {/* Panel lateral */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-full max-w-sm bg-background z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <span className="text-lg font-semibold text-text">
                    Notificaciones
                  </span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Botón marcar todas */}
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="p-3 border-b border-border">
                  <Button
                    variant="outline"
                    className="w-full text-success border-success/50 hover:bg-success/10"
                    onClick={handleMarkAllAsRead}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Marcar todas como leídas
                  </Button>
                </div>
              )}

              {/* Lista de notificaciones */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-text-muted mt-2">Cargando...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadNotifications}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Bell className="w-16 h-16 text-text-muted/30 mb-4" />
                    <p className="text-text-muted">No tenés notificaciones</p>
                  </div>
                ) : (
                  <>
                    {/* No leídas */}
                    {unreadNotifications.length > 0 && (
                      <>
                        <p className="px-4 py-2 text-xs text-text-muted uppercase tracking-wide">
                          Nuevas ({unreadNotifications.length})
                        </p>
                        {unreadNotifications.map((notif) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => handleNotificationClick(notif)}
                            className={cn(
                              "flex items-start gap-3 px-4 py-3 bg-success/10 border-l-4 border-success cursor-pointer hover:bg-success/15 transition-colors",
                              getNotificationUrl(notif) && "hover:bg-success/20"
                            )}
                          >
                            <div className="mt-0.5">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-text text-sm">
                                {notif.title}
                              </p>
                              <p className={cn(
                                "text-text-muted text-xs mt-0.5 transition-all",
                                expandedId === notif.id ? "" : "line-clamp-2"
                              )}>
                                {notif.message}
                              </p>
                              <p className="text-text-muted/60 text-[10px] mt-1">
                                {getTimeAgo(notif.createdAt)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-text-muted hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notif.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </>
                    )}

                    {/* Leídas */}
                    {readNotifications.length > 0 && (
                      <>
                        <div className="border-t border-border my-2" />
                        <p className="px-4 py-2 text-xs text-text-muted/60 uppercase tracking-wide">
                          Anteriores ({readNotifications.length})
                        </p>
                        {readNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={cn(
                              "flex items-start gap-3 px-4 py-3 opacity-60 hover:opacity-80 transition-opacity cursor-pointer",
                              getNotificationUrl(notif) && "hover:opacity-100"
                            )}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className="mt-0.5">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-text-muted text-sm">
                                {notif.title}
                              </p>
                              <p className={cn(
                                "text-text-muted/70 text-xs mt-0.5 transition-all",
                                expandedId === notif.id ? "" : "line-clamp-2"
                              )}>
                                {notif.message}
                              </p>
                              <p className="text-text-muted/50 text-[10px] mt-1">
                                {getTimeAgo(notif.createdAt)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-text-muted/50 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notif.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

