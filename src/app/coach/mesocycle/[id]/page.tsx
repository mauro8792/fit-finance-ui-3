"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  Loader2, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle,
  AlertCircle,
  Send
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Mesocycle {
  id: number;
  name: string;
  status?: string;
  objetivo?: string;
  macrocycle?: {
    id: number;
    studentId: number;
  };
  microcycles?: Array<{
    id: number;
    name: string;
  }>;
}

const STATUS_OPTIONS = [
  { 
    value: "draft", 
    label: "📝 Borrador", 
    description: "Solo vos lo ves. El alumno no puede verlo.",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: EyeOff
  },
  { 
    value: "published", 
    label: "📢 Publicado", 
    description: "El alumno puede verlo pero no está activo.",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Eye
  },
  { 
    value: "active", 
    label: "✓ Activo", 
    description: "Es la rutina actual del alumno.",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle
  },
];

export default function EditMesocyclePage() {
  const params = useParams();
  const router = useRouter();
  const mesocycleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  
  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/mesocycle/${mesocycleId}`);
        setMesocycle(data);
        setName(data.name || "");
        setStatus(data.status || "draft");
      } catch (error) {
        console.error("Error loading mesocycle:", error);
        toast.error("Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mesocycleId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/mesocycle/${mesocycleId}`, { name });
      toast.success("Guardado");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "active") {
      setPendingStatus(newStatus);
      setShowConfirm(true);
    } else {
      confirmStatusChange(newStatus);
    }
  };

  const confirmStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      await api.patch(`/mesocycle/${mesocycleId}/status`, { status: newStatus });
      setStatus(newStatus);
      
      const statusLabel = STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus;
      toast.success(`Estado cambiado a ${statusLabel}`);
      setShowConfirm(false);
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Error al cambiar estado");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cargando..." backHref="/coach/students" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Editar Mesociclo"
        subtitle={mesocycle?.name}
        backHref={mesocycle?.macrocycle?.studentId 
          ? `/coach/students/${mesocycle.macrocycle.studentId}/routine`
          : "/coach/students"}
        rightContent={
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-black"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Info */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-text-muted">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-background"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Calendar className="w-4 h-4" />
              <span>{mesocycle?.microcycles?.length || 0} microciclos configurados</span>
            </div>
          </CardContent>
        </Card>

        {/* Estado */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4">
            <Label className="text-text-muted mb-3 block">Estado de la rutina</Label>
            
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = status === option.value;
                
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? option.color
                        : "bg-background border-border hover:bg-background/80"
                    )}
                    onClick={() => handleStatusChange(option.value)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn(
                        "w-5 h-5",
                        isSelected ? "" : "text-text-muted"
                      )} />
                      <div className="flex-1">
                        <p className={cn(
                          "font-medium text-sm",
                          !isSelected && "text-text"
                        )}>
                          {option.label}
                        </p>
                        <p className="text-xs text-text-muted">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge variant="outline" className={option.color}>
                          Actual
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        {status === "draft" && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Send className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-text text-sm">¿Listo para publicar?</p>
                  <p className="text-xs text-text-muted mt-1">
                    Cuando publiques, el alumno podrá ver la rutina.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-primary text-black"
                    onClick={() => handleStatusChange("published")}
                    disabled={saving}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Publicar ahora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "published" && (
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-text text-sm">¿Activar esta rutina?</p>
                  <p className="text-xs text-text-muted mt-1">
                    Si la activás, será la rutina principal del alumno.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-green-500 text-black"
                    onClick={() => handleStatusChange("active")}
                    disabled={saving}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activar rutina
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmación para activar */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              ¿Activar esta rutina?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta será la rutina activa del alumno. Si ya tiene otra rutina activa, 
              se desactivará automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background">Cancelar</AlertDialogCancel>
            <Button
              onClick={() => pendingStatus && confirmStatusChange(pendingStatus)}
              disabled={saving}
              className="bg-green-500 text-black"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, activar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

