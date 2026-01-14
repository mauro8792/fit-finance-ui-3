"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useCoachCache } from "@/stores/coach-cache";
import { getCoachStudentsSummary } from "@/lib/api/coach";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  ChevronRight,
  Dumbbell,
  Users,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentWithRoutine {
  id: number;
  firstName: string;
  lastName: string;
  isActive: boolean;
  macrocycles: any[];
  currentRoutineStatus?: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getStudentsSummary, setStudentsSummary } = useCoachCache();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentWithRoutine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  
  const lastFetchParams = useRef<string>("");

  useEffect(() => {
    const fetchKey = `${user?.id}`;
    if (lastFetchParams.current === fetchKey && students.length > 0) return;
    
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Intentar usar cache primero
        const cached = getStudentsSummary();
        if (cached) {
          const studentsWithStatus = processStudents(cached.students);
          setStudents(studentsWithStatus);
          setLoading(false);
          lastFetchParams.current = fetchKey;
          return;
        }

        lastFetchParams.current = fetchKey;
        setLoading(true);
        const data = await getCoachStudentsSummary();
        setStudentsSummary(data.students, data.stats);
        const studentsWithStatus = processStudents(data.students);
        setStudents(studentsWithStatus);
      } catch (error) {
        console.error("Error loading students:", error);
        lastFetchParams.current = "";
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Procesar estudiantes para agregar el estado de rutina
  const processStudents = (studentsData: any[]): StudentWithRoutine[] => {
    return studentsData.map((student) => {
      // Simplificado: solo mostrar si tiene rutina o no
      const hasRoutine = student.macrocycles?.length > 0;
      
      return {
        ...student,
        currentRoutineStatus: hasRoutine ? "Con rutina" : "Sin rutina",
      };
    });
  };

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesFilter = showInactive ? true : student.isActive;
    return matchesSearch && matchesFilter;
  });

  const activeStudents = filteredStudents.filter((s) => s.isActive);
  const inactiveStudents = filteredStudents.filter((s) => !s.isActive);
  const totalActive = students.filter((s) => s.isActive).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Mis Alumnos" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Mis Alumnos"
        subtitle={`${totalActive} activos`}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Buscar alumno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface border-border"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={!showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(false)}
            className={cn(
              !showInactive
                ? "bg-primary text-black"
                : "border-border text-text-muted"
            )}
          >
            Activos ({totalActive})
          </Button>
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(true)}
            className={cn(
              showInactive
                ? "bg-primary text-black"
                : "border-border text-text-muted"
            )}
          >
            Todos ({students.length})
          </Button>
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              {searchQuery ? "Sin resultados" : "Sin alumnos"}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {searchQuery
                ? "No hay alumnos que coincidan con tu búsqueda"
                : "Contactá al administrador para agregar alumnos"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <StudentCard student={student} onClick={() => router.push(`/coach/students/${student.id}`)} />
              </motion.div>
            ))}

            {showInactive && inactiveStudents.length > 0 && (
              <>
                <div className="pt-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider px-1">
                    Inactivos
                  </p>
                </div>
                {inactiveStudents.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (activeStudents.length + index) * 0.05 }}
                  >
                    <StudentCard
                      student={student}
                      onClick={() => router.push(`/coach/students/${student.id}`)}
                      inactive
                    />
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentCard({
  student,
  onClick,
  inactive = false,
}: {
  student: StudentWithRoutine;
  onClick: () => void;
  inactive?: boolean;
}) {
  const hasRoutine = student.currentRoutineStatus === "Con rutina";
  const hasNoRoutine = student.currentRoutineStatus === "Sin rutina";
  
  return (
    <Card
      className={cn(
        "border-border cursor-pointer touch-feedback",
        inactive ? "bg-surface/40 opacity-60" : "bg-surface/80"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback
              className={cn(
                "text-text font-medium",
                inactive
                  ? "bg-surface"
                  : "bg-gradient-to-br from-primary/30 to-accent/30"
              )}
            >
              {student.firstName?.[0]}{student.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-text truncate">
                {student.firstName} {student.lastName}
              </h3>
              {inactive && (
                <Badge variant="secondary" className="text-xs bg-surface text-text-muted">
                  Inactivo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {hasRoutine ? (
                <span className="flex items-center gap-1 text-success">
                  <Dumbbell className="w-3 h-3" />
                  {student.currentRoutineStatus}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="w-3 h-3" />
                  {student.currentRoutineStatus}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-text-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
