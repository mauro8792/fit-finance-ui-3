"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Users,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMealPlanTemplate, assignMealPlan, unassignMealPlan } from "@/lib/api/meal-plan";
import { getCoachStudents } from "@/lib/api/coach";
import { useAuthStore } from "@/stores/auth-store";

interface StudentWithPlanInfo {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  hasThisPlan: boolean;
}

export default function AssignMealPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<StudentWithPlanInfo[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [template, setTemplate] = useState<{ id: number; name: string; assignedStudents?: { id: number }[] } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // Cargar template y estudiantes en paralelo
        const [templateData, studentsData] = await Promise.all([
          getMealPlanTemplate(parseInt(id)),
          getCoachStudents(user.id),
        ]);

        setTemplate(templateData);

        // Marcar qué estudiantes ya tienen este plan
        const assignedIds = new Set(
          templateData.assignedStudents?.map((s: { id: number }) => s.id) || []
        );

        const studentsWithInfo: StudentWithPlanInfo[] = studentsData.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.user?.email,
          hasThisPlan: assignedIds.has(s.id),
        }));

        setStudents(studentsWithInfo);

        // Pre-seleccionar los que ya tienen el plan
        setSelectedStudents(assignedIds);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, user?.id]);

  const filteredStudents = students.filter(
    (s) =>
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStudent = (studentId: number) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Nuevos: los que seleccionamos pero no tenían el plan
      const newAssignmentIds = [...selectedStudents].filter(
        (studentId) => !students.find((s) => s.id === studentId)?.hasThisPlan
      );

      // Desasignar: los que tenían el plan pero ya no están seleccionados
      const toUnassignIds = students
        .filter((s) => s.hasThisPlan && !selectedStudents.has(s.id))
        .map((s) => s.id);

      let messages: string[] = [];

      // Asignar nuevos
      if (newAssignmentIds.length > 0) {
        const result = await assignMealPlan(parseInt(id), { studentIds: newAssignmentIds });
        messages.push(`Plan asignado a ${result.assigned} alumno${result.assigned > 1 ? "s" : ""}`);
      }

      // Desasignar
      if (toUnassignIds.length > 0) {
        await Promise.all(
          toUnassignIds.map((studentId) => unassignMealPlan(parseInt(id), studentId))
        );
        messages.push(`Plan desasignado de ${toUnassignIds.length} alumno${toUnassignIds.length > 1 ? "s" : ""}`);
      }

      if (messages.length > 0) {
        toast.success(messages.join(". "));
      } else {
        toast.info("No hay cambios para guardar");
      }
      
      router.push(`/coach/meal-plans/${id}`);
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = selectedStudents.size;
  const changesCount = [...selectedStudents].filter(
    (id) => !students.find((s) => s.id === id)?.hasThisPlan
  ).length + students.filter(
    (s) => s.hasThisPlan && !selectedStudents.has(s.id)
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Asignar plan" backHref={`/coach/meal-plans/${id}`} />
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
    <div className="min-h-screen bg-background pb-40">
      <PageHeader
        title="Asignar plan"
        subtitle={template?.name}
        backHref={`/coach/meal-plans/${id}`}
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

        {/* Summary */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm text-text">
                  {assignedCount} alumno{assignedCount !== 1 ? "s" : ""} seleccionado{assignedCount !== 1 ? "s" : ""}
                </span>
              </div>
              {changesCount > 0 && (
                <Badge variant="outline" className="text-xs text-primary border-primary/50">
                  {changesCount} cambio{changesCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <Card className="bg-surface/50 border-border">
              <CardContent className="p-6 text-center">
                <p className="text-text-muted text-sm">No se encontraron alumnos</p>
              </CardContent>
            </Card>
          ) : (
            filteredStudents.map((student, index) => {
              const isSelected = selectedStudents.has(student.id);

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className={cn(
                      "border-border cursor-pointer transition-all",
                      isSelected
                        ? "bg-primary/10 border-primary/50"
                        : "bg-surface/80 hover:bg-surface"
                    )}
                    onClick={() => toggleStudent(student.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-text text-sm">
                            {student.firstName[0]}{student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          {student.email && (
                            <p className="text-xs text-text-muted truncate">
                              {student.email}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {student.hasThisPlan && (
                            <Badge variant="secondary" className="text-[10px] bg-success/20 text-success">
                              <Check className="w-3 h-3 mr-1" />
                              Asignado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Fixed Bottom Action - arriba de la barra de navegación */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full bg-primary text-black font-medium py-3"
            onClick={handleSave}
            disabled={saving || changesCount === 0}
          >
            {saving ? "Guardando..." : `Guardar cambios ${changesCount > 0 ? `(${changesCount})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}


