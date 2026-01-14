"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { getCoachStudents } from "@/lib/api/coach";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Calendar,
  LayoutTemplate,
  Loader2,
  Check,
  ChevronRight,
  Search,
  Plus,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface StudentFromAPI {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

interface Student {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  macrocycles?: Macrocycle[];
}

interface Macrocycle {
  id: number;
  name: string;
  status: string;
}

interface Template {
  id: number;
  templateName: string;
  templateDescription?: string;
  objetivo?: string;
  microcycles?: { id: number }[];
}

export default function AssignTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [mode, setMode] = useState<"new_macro" | "existing_macro">("new_macro");
  const [selectedMacroId, setSelectedMacroId] = useState<number | null>(null);
  const [newMacroName, setNewMacroName] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Step state
  const [step, setStep] = useState<"select_student" | "configure">("select_student");

  const dataFetched = useRef(false);

  useEffect(() => {
    if (dataFetched.current || !user?.id) return;
    dataFetched.current = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const [templateRes, studentsData] = await Promise.all([
          api.get(`/templates/mesocycles/${templateId}`),
          getCoachStudents(user.id),
        ]);

        setTemplate(templateRes.data);
        
        // Transformar datos de estudiantes al formato esperado
        const transformedStudents: Student[] = (studentsData as StudentFromAPI[]).map((s) => ({
          id: s.id,
          user: {
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            email: s.email || "",
          },
        }));
        
        setStudents(transformedStudents);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos");
        dataFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [templateId, user?.id]);

  const loadStudentMacros = async (studentId: number) => {
    try {
      const { data } = await api.get(`/macrocycle/student/${studentId}`);
      return data || [];
    } catch (error) {
      console.error("Error loading macros:", error);
      return [];
    }
  };

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setNewMacroName(`${template?.templateName || "Rutina"} - ${student.user.name}`);
    
    // Cargar macrociclos del alumno
    const macros = await loadStudentMacros(student.id);
    setSelectedStudent({ ...student, macrocycles: macros });
    
    setStep("configure");
  };

  const handleAssign = async () => {
    if (!selectedStudent) {
      toast.error("Seleccioná un alumno");
      return;
    }

    if (mode === "existing_macro" && !selectedMacroId) {
      toast.error("Seleccioná un macrociclo existente");
      return;
    }

    if (mode === "new_macro" && !newMacroName.trim()) {
      toast.error("Ingresá un nombre para el nuevo macrociclo");
      return;
    }

    setAssigning(true);
    try {
      await api.post(`/templates/mesocycles/${templateId}/assign`, {
        studentId: selectedStudent.id,
        mode,
        existingMacrocycleId: mode === "existing_macro" ? selectedMacroId : undefined,
        newMacroName: mode === "new_macro" ? newMacroName : undefined,
        startDate,
      });

      toast.success(`Plantilla asignada a ${selectedStudent.user.name}`);
      router.push(`/coach/students/${selectedStudent.id}/routine`);
    } catch (error: any) {
      console.error("Error assigning template:", error);
      toast.error(error.response?.data?.message || "Error al asignar plantilla");
    } finally {
      setAssigning(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cargando..." backHref={`/coach/templates/${templateId}`} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Error" backHref="/coach/templates" />
        <div className="px-4 py-8 text-center">
          <p className="text-text-muted">No se encontró la plantilla</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Asignar Plantilla"
        subtitle={template.templateName}
        backHref={step === "configure" ? undefined : `/coach/templates/${templateId}`}
        onBack={step === "configure" ? () => setStep("select_student") : undefined}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Template Info */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <LayoutTemplate className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-text">{template.templateName}</h2>
                <p className="text-sm text-text-muted">
                  {template.microcycles?.length || 0} microciclos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Select Student */}
        {step === "select_student" && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Buscar alumno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface"
              />
            </div>

            <p className="text-sm text-text-muted">
              Seleccioná el alumno al que querés asignar esta plantilla:
            </p>

            <div className="space-y-2">
              {filteredStudents.length === 0 ? (
                <Card className="bg-surface/50 border-border">
                  <CardContent className="p-6 text-center">
                    <User className="w-10 h-10 text-text-muted mx-auto mb-2" />
                    <p className="text-text-muted">No se encontraron alumnos</p>
                  </CardContent>
                </Card>
              ) : (
                filteredStudents.map((student) => (
                  <Card
                    key={student.id}
                    className="bg-surface border-border cursor-pointer hover:bg-surface/80 transition-colors"
                    onClick={() => handleSelectStudent(student)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text">{student.user.name}</p>
                        <p className="text-sm text-text-muted">{student.user.email}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {/* Step 2: Configure */}
        {step === "configure" && selectedStudent && (
          <>
            {/* Selected Student */}
            <Card className="bg-surface border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-text-muted">Alumno seleccionado</p>
                  <p className="font-medium text-text">{selectedStudent.user.name}</p>
                </div>
              </CardContent>
            </Card>

            {/* Mode Selection */}
            <div className="space-y-3">
              <Label className="text-text">¿Dónde agregar la rutina?</Label>
              
              <Card
                className={cn(
                  "bg-surface border-2 cursor-pointer transition-colors",
                  mode === "new_macro" ? "border-primary" : "border-border"
                )}
                onClick={() => setMode("new_macro")}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    mode === "new_macro" ? "border-primary bg-primary" : "border-text-muted"
                  )}>
                    {mode === "new_macro" && <Check className="w-3 h-3 text-black" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      <p className="font-medium text-text">Crear nuevo programa</p>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Se creará un nuevo macrociclo para el alumno
                    </p>
                  </div>
                </CardContent>
              </Card>

              {selectedStudent.macrocycles && selectedStudent.macrocycles.length > 0 && (
                <Card
                  className={cn(
                    "bg-surface border-2 cursor-pointer transition-colors",
                    mode === "existing_macro" ? "border-primary" : "border-border"
                  )}
                  onClick={() => setMode("existing_macro")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      mode === "existing_macro" ? "border-primary bg-primary" : "border-text-muted"
                    )}>
                      {mode === "existing_macro" && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <p className="font-medium text-text">Agregar a programa existente</p>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Se agregará como nuevo mesociclo
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* New Macro Name */}
            {mode === "new_macro" && (
              <div className="space-y-2">
                <Label className="text-text-muted">Nombre del programa</Label>
                <Input
                  value={newMacroName}
                  onChange={(e) => setNewMacroName(e.target.value)}
                  placeholder="Ej: Programa de Hipertrofia"
                  className="bg-background"
                />
              </div>
            )}

            {/* Existing Macro Selection */}
            {mode === "existing_macro" && selectedStudent.macrocycles && (
              <div className="space-y-2">
                <Label className="text-text-muted">Seleccionar programa</Label>
                <Select
                  value={selectedMacroId?.toString() || ""}
                  onValueChange={(v) => setSelectedMacroId(parseInt(v))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Elegir macrociclo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedStudent.macrocycles.map((macro) => (
                      <SelectItem key={macro.id} value={macro.id.toString()}>
                        {macro.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-text-muted">Fecha de inicio</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted z-10 pointer-events-none" />
                {/* Texto formateado encima del input */}
                <div className="absolute left-10 top-1/2 -translate-y-1/2 text-text pointer-events-none z-10">
                  {startDate ? format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                </div>
                {/* Input date real pero con texto transparente */}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-background text-transparent cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>

            {/* Info Message */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 La rutina se creará en estado <strong>borrador</strong>. El alumno no la verá hasta que la publiques o actives desde la configuración del mesociclo.
              </p>
            </div>

            {/* Assign Button */}
            <Button
              className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-base"
              onClick={handleAssign}
              disabled={assigning}
            >
              {assigning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Asignar a {selectedStudent.user.name}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

