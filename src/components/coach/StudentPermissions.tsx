"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

interface Permission {
  canAccessRoutine: boolean;
  canAccessNutrition: boolean;
  canAccessWeight: boolean;
  canAccessCardio: boolean;
}

const PERMISSIONS_CONFIG = [
  {
    key: "canAccessRoutine" as keyof Permission,
    label: "Rutina de entrenamiento",
    emoji: "📋",
    description: "Ver y registrar ejercicios de la rutina",
  },
  {
    key: "canAccessNutrition" as keyof Permission,
    label: "Nutrición y macros",
    emoji: "🍎",
    description: "Registrar alimentos y controlar macros",
  },
  {
    key: "canAccessWeight" as keyof Permission,
    label: "Mi Progreso (Peso)",
    emoji: "⚖️",
    description: "Registrar peso corporal y antropometría",
  },
  {
    key: "canAccessCardio" as keyof Permission,
    label: "Cardio / Aeróbico",
    emoji: "🏃",
    description: "Registrar actividades cardio y cronómetro",
  },
];

interface StudentPermissionsProps {
  studentId: number;
  onUpdate?: () => void;
}

export function StudentPermissions({ studentId, onUpdate }: StudentPermissionsProps) {
  const [permissions, setPermissions] = useState<Permission>({
    canAccessRoutine: true,
    canAccessNutrition: true,
    canAccessWeight: true,
    canAccessCardio: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, [studentId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/students/${studentId}/permissions`);
      setPermissions(response.data);
    } catch (err) {
      console.error("Error cargando permisos:", err);
      // Si el endpoint no existe aún, usar valores por defecto
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof Permission) => {
    const newValue = !permissions[key];

    // Optimistic update
    setPermissions((prev) => ({ ...prev, [key]: newValue }));
    setSaving(key);

    try {
      await api.put(`/students/${studentId}/permissions`, {
        [key]: newValue,
      });
      toast.success("Guardado ✓", { duration: 1500 });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error guardando permiso:", err);
      // Revertir cambio si falla
      setPermissions((prev) => ({ ...prev, [key]: !newValue }));
      toast.error("Error al guardar");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-text flex items-center gap-2">
          ⚙️ Configuración de Acceso
        </h3>
        <p className="text-sm text-text-muted">
          Habilita o deshabilita funcionalidades para este alumno
        </p>
      </div>

      {/* Lista de permisos */}
      <div className="space-y-3">
        {PERMISSIONS_CONFIG.map((perm, index) => {
          const isEnabled = permissions[perm.key] ?? true;
          const isSaving = saving === perm.key;

          return (
            <motion.div
              key={perm.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  "border transition-all",
                  isEnabled
                    ? "bg-success/5 border-success/30"
                    : "bg-surface/50 border-border",
                  isSaving && "opacity-70"
                )}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{perm.emoji}</span>
                    <div>
                      <p
                        className={cn(
                          "font-medium",
                          isEnabled ? "text-text" : "text-text-muted"
                        )}
                      >
                        {perm.label}
                      </p>
                      <p className="text-xs text-text-muted">
                        {perm.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(perm.key)}
                      disabled={isSaving}
                      className="data-[state=checked]:bg-success"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info */}
      <Card className="bg-warning/10 border-warning/30">
        <CardContent className="p-3">
          <p className="text-xs text-warning flex items-start gap-2">
            <span>💡</span>
            <span>
              Los cambios se guardan automáticamente. Las funcionalidades
              deshabilitadas no aparecerán en el menú del alumno.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

