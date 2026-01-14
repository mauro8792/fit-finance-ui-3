"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useCoachCache } from "@/stores/coach-cache";
import api from "@/lib/api";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dumbbell,
  Plus,
  Search,
  User,
  Calendar,
  Target,
  ChevronRight,
  Layers,
  LayoutGrid,
  BookOpen,
  LayoutTemplate,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Student, Macrocycle, Mesocycle } from "@/types";

interface StudentWithRoutines extends Student {
  macrocycles?: Macrocycle[];
}

export default function CoachRoutinesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getStudentsSummary, setStudentsSummary } = useCoachCache();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentWithRoutines[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "with" | "without">("all");
  
  const dataFetched = useRef(false);

  useEffect(() => {
    if (dataFetched.current) return;
    
    const loadData = async () => {
      if (!user?.id) return;

      try {
        dataFetched.current = true;
        setLoading(true);
        
        // Intentar usar cache primero
        const cached = getStudentsSummary();
        if (cached) {
          setStudents(cached.students as any);
          setLoading(false);
          return;
        }
        
        // Si no hay cache, hacer la llamada
        const { data } = await api.get("/macrocycle/coach/students-summary");
        const studentsData = data.students || [];
        const statsData = data.stats || { totalStudents: 0, studentsWithRoutines: 0, totalMacrocycles: 0 };
        
        setStudents(studentsData);
        
        // Guardar en cache
        setStudentsSummary(studentsData, statsData);
      } catch (error) {
        console.error("Error loading data:", error);
        dataFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, getStudentsSummary, setStudentsSummary]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !searchTerm ||
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());

    const hasRoutines = (student.macrocycles?.length || 0) > 0;
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "with" && hasRoutines) ||
      (filterStatus === "without" && !hasRoutines);

    return matchesSearch && matchesFilter;
  });

  const totalMacrocycles = students.reduce((sum, s) => sum + (s.macrocycles?.length || 0), 0);
  const studentsWithRoutines = students.filter((s) => (s.macrocycles?.length || 0) > 0).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Rutinas"
        subtitle={`${totalMacrocycles} macrociclos activos`}
        backHref="/coach"
        rightContent={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push("/coach/exercises")}
            className="text-primary"
          >
            <BookOpen className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{students.length}</p>
              <p className="text-xs text-text-muted">Alumnos</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-accent">{studentsWithRoutines}</p>
              <p className="text-xs text-text-muted">Con rutina</p>
            </CardContent>
          </Card>
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-success">{totalMacrocycles}</p>
              <p className="text-xs text-text-muted">Macrociclos</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => router.push("/coach/routines/create")}
            className="bg-gradient-to-r from-primary to-primary-hover text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Rutina
          </Button>
          <Button
            onClick={() => router.push("/coach/templates")}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Plantillas
          </Button>
        </div>
        <Button
          onClick={() => router.push("/coach/exercises")}
          variant="outline"
          className="w-full"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Catálogo de Ejercicios
        </Button>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar alumno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-32 bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with">Con rutina</SelectItem>
              <SelectItem value="without">Sin rutina</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Student List with Routines */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="bg-surface/50 border-border">
            <CardContent className="p-8 text-center">
              <Dumbbell className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No se encontraron resultados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student, idx) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-surface/80 border-border overflow-hidden">
                  <CardContent className="p-0">
                    {/* Student Header */}
                    <div
                      className="p-4 flex items-center gap-3 cursor-pointer hover:bg-surface/50 transition-colors"
                      onClick={() => router.push(`/coach/students/${student.id}/routine`)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-text-muted">
                          {(student.macrocycles?.length || 0) > 0
                            ? `${student.macrocycles?.length} macrociclo(s)`
                            : "Sin rutina asignada"}
                        </p>
                      </div>
                      {(student.macrocycles?.length || 0) === 0 ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/coach/routines/create?studentId=${student.id}`);
                          }}
                          className="bg-primary text-black"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-text-muted" />
                      )}
                    </div>

                    {/* Macrocycles */}
                    {(student.macrocycles?.length || 0) > 0 && (
                      <div className="px-4 pb-3 space-y-2">
                        {student.macrocycles?.slice(0, 2).map((macro) => {
                          const activeMeso = macro.mesocycles?.find(
                            (m: Mesocycle) => m.status === "active"
                          );
                          return (
                            <div
                              key={macro.id}
                              className="p-3 bg-background/50 rounded-lg border border-border"
                              onClick={() => router.push(`/coach/students/${student.id}/routine`)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-primary" />
                                  <span className="font-medium text-sm text-text">
                                    {macro.name || "Macrociclo"}
                                  </span>
                                </div>
                                {(macro as any).objective && (
                                  <Badge variant="outline" className="text-xs">
                                    <Target className="w-3 h-3 mr-1" />
                                    {(macro as any).objective}
                                  </Badge>
                                )}
                              </div>
                              {activeMeso && (
                                <div className="flex items-center gap-2 text-xs text-text-muted">
                                  <LayoutGrid className="w-3 h-3" />
                                  <span>
                                    Meso activo: {activeMeso.name}
                                    {activeMeso.microcycles?.length
                                      ? ` (${activeMeso.microcycles.length} semanas)`
                                      : ""}
                                  </span>
                                </div>
                              )}
                              {(macro as any).createdAt && (
                                <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Creado: {formatDate((macro as any).createdAt)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(student.macrocycles?.length || 0) > 2 && (
                          <p className="text-xs text-text-muted text-center">
                            +{(student.macrocycles?.length || 0) - 2} macrociclo(s) más
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

