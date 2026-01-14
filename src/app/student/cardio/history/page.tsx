"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getActivityHistory } from "@/lib/api/cardio";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, Route, Flame, Footprints, Calendar } from "lucide-react";

interface Activity {
  id: number;
  activityType: string;
  duration: number;
  distance?: number;
  steps?: number;
  caloriesBurned?: number;
  date: string;
  notes?: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  walking: "🚶",
  running: "🏃",
  cycling: "🚴",
  swimming: "🏊",
  hiit: "⚡",
  other: "💪",
};

const ACTIVITY_NAMES: Record<string, string> = {
  walking: "Caminata",
  running: "Correr",
  cycling: "Ciclismo",
  swimming: "Natación",
  hiit: "HIIT",
  other: "Otro",
};

export default function CardioHistoryPage() {
  const { student } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!student?.id) return;

      try {
        setLoading(true);
        const data = await getActivityHistory(student.id, 50);
        setActivities(data || []);
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [student?.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";

    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  };

  // Group activities by date
  const groupedActivities = activities.reduce((acc, activity) => {
    const dateKey = activity.date.split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Historial" backHref="/student/cardio" />
        <div className="px-4 py-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Historial" subtitle="Actividades cardio" backHref="/student/cardio" />

      <div className="px-4 py-4 space-y-6">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
              <Footprints className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">Sin actividades</h3>
            <p className="text-text-muted text-sm">
              Cuando registres actividades aparecerán aquí
            </p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([date, dayActivities], groupIndex) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium text-text capitalize">
                  {formatDate(date)}
                </h3>
              </div>

              <div className="space-y-2">
                {dayActivities.map((activity, index) => (
                  <Card
                    key={activity.id}
                    className="bg-surface/80 border-border overflow-hidden"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                          {ACTIVITY_ICONS[activity.activityType] || ACTIVITY_ICONS.other}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-text">
                              {ACTIVITY_NAMES[activity.activityType] || activity.activityType}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {new Date(activity.date).toLocaleTimeString("es-AR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-text-muted">
                            {activity.duration && (
                              <span className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {activity.duration} min
                              </span>
                            )}
                            {activity.distance && (
                              <span className="flex items-center gap-1">
                                <Route className="w-3 h-3" />
                                {activity.distance} km
                              </span>
                            )}
                            {activity.steps && (
                              <span className="flex items-center gap-1">
                                <Footprints className="w-3 h-3" />
                                {activity.steps.toLocaleString()}
                              </span>
                            )}
                            {activity.caloriesBurned && (
                              <span className="flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                {activity.caloriesBurned} cal
                              </span>
                            )}
                          </div>

                          {activity.notes && (
                            <p className="text-xs text-text-muted mt-2 italic">
                              "{activity.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

