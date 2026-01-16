"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Dumbbell,
  Calendar,
  Users,
  ChevronRight,
  LayoutTemplate,
  Clock,
  Filter,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== MOCK DATA ====================
interface Template {
  id: number;
  name: string;
  description?: string;
  microcyclesCount: number;
  daysPerMicrocycle: number;
  exercisesCount: number;
  assignedCount: number;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

const mockTemplates: Template[] = [
  {
    id: 1,
    name: "Hipertrofia Full Body",
    description: "Rutina de 4 días enfocada en hipertrofia para principiantes",
    microcyclesCount: 4,
    daysPerMicrocycle: 4,
    exercisesCount: 24,
    assignedCount: 5,
    status: "published",
    createdAt: "2026-01-10",
    updatedAt: "2026-01-15",
    tags: ["Hipertrofia", "Full Body", "Principiante"],
  },
  {
    id: 2,
    name: "Fuerza Upper/Lower",
    description: "Rutina de fuerza con split superior/inferior",
    microcyclesCount: 8,
    daysPerMicrocycle: 4,
    exercisesCount: 32,
    assignedCount: 3,
    status: "published",
    createdAt: "2026-01-05",
    updatedAt: "2026-01-14",
    tags: ["Fuerza", "Upper/Lower", "Intermedio"],
  },
  {
    id: 3,
    name: "PPL Avanzado",
    description: "Push Pull Legs para atletas avanzados con técnicas intensas",
    microcyclesCount: 6,
    daysPerMicrocycle: 6,
    exercisesCount: 48,
    assignedCount: 2,
    status: "published",
    createdAt: "2025-12-20",
    updatedAt: "2026-01-12",
    tags: ["PPL", "Avanzado", "Drop Sets"],
  },
  {
    id: 4,
    name: "Definición 12 semanas",
    description: "Programa de definición con cardio integrado",
    microcyclesCount: 12,
    daysPerMicrocycle: 5,
    exercisesCount: 40,
    assignedCount: 0,
    status: "draft",
    createdAt: "2026-01-14",
    updatedAt: "2026-01-14",
    tags: ["Definición", "Cardio"],
  },
];

// ==================== COMPONENT ====================
export default function RoutinesV2Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "published">("all");

  // Simular carga
  useEffect(() => {
    const timer = setTimeout(() => {
      setTemplates(mockTemplates);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Filtrar templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const draftsCount = templates.filter(t => t.status === "draft").length;
  const publishedCount = templates.filter(t => t.status === "published").length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Mis Plantillas"
        subtitle="Biblioteca de rutinas"
        backHref="/coach"
        rightContent={
          <Button
            size="sm"
            onClick={() => router.push("/coach/routines-v2/create")}
            className="bg-primary text-black hover:bg-primary-hover"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{templates.length}</p>
              <p className="text-xs text-text-muted">Plantillas</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-accent">{publishedCount}</p>
              <p className="text-xs text-text-muted">Publicadas</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{draftsCount}</p>
              <p className="text-xs text-text-muted">Borradores</p>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y filtros */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar plantilla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface border-border"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "border-border",
              filterStatus !== "all" && "border-primary text-primary"
            )}
            onClick={() => {
              const next = filterStatus === "all" ? "published" : filterStatus === "published" ? "draft" : "all";
              setFilterStatus(next);
            }}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Filtro activo */}
        {filterStatus !== "all" && (
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "cursor-pointer",
                filterStatus === "published" ? "border-accent text-accent" : "border-orange-400 text-orange-400"
              )}
              onClick={() => setFilterStatus("all")}
            >
              {filterStatus === "published" ? "Publicadas" : "Borradores"} ×
            </Badge>
          </div>
        )}

        {/* Lista de plantillas */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-8 text-center">
              <LayoutTemplate className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">
                {searchTerm ? "No se encontraron plantillas" : "No tenés plantillas todavía"}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push("/coach/routines-v2/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primera plantilla
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="bg-surface/80 border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => router.push(`/coach/routines-v2/${template.id}`)}
                  >
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              template.status === "draft" ? "bg-orange-500/20" : "bg-primary/20"
                            )}>
                              <Dumbbell className={cn(
                                "w-5 h-5",
                                template.status === "draft" ? "text-orange-400" : "text-primary"
                              )} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-text">{template.name}</h3>
                              {template.description && (
                                <p className="text-xs text-text-muted line-clamp-1">
                                  {template.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px]",
                              template.status === "draft" 
                                ? "border-orange-500/50 text-orange-400" 
                                : "border-accent/50 text-accent"
                            )}
                          >
                            {template.status === "draft" ? "Borrador" : "Publicada"}
                          </Badge>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="px-4 pb-3 flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {template.microcyclesCount} microciclos
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {template.daysPerMicrocycle} días/sem
                        </span>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3" />
                          {template.exercisesCount} ejercicios
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-2 bg-background/30 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <Users className="w-3 h-3" />
                          <span>{template.assignedCount} asignados</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <Clock className="w-3 h-3" />
                          <span>Editado {new Date(template.updatedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

