"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, User, Mail, Phone, Users, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getStudentById, updateStudent, getAllCoaches } from "@/lib/api/admin";

interface Coach {
  id: number;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
}

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    coachId: "",
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [student, coachesList] = await Promise.all([
        getStudentById(studentId),
        getAllCoaches(),
      ]);
      
      setCoaches(coachesList);
      setFormData({
        firstName: student.user?.fullName?.split(" ")[0] || student.firstName || "",
        lastName: student.user?.fullName?.split(" ").slice(1).join(" ") || student.lastName || "",
        email: student.user?.email || "",
        phone: student.phone || "",
        coachId: student.coachId?.toString() || "",
        isActive: student.isActive ?? true,
      });
    } catch (error) {
      console.error("Error loading student:", error);
      toast.error("Error al cargar los datos del alumno");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      await updateStudent(studentId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        coachId: formData.coachId ? Number(formData.coachId) : undefined,
        isActive: formData.isActive,
      });
      
      toast.success("Alumno actualizado correctamente");
      router.push("/admin/students");
    } catch (error: any) {
      console.error("Error updating student:", error);
      toast.error(error.response?.data?.message || "Error al actualizar el alumno");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-background to-card border-b border-border/50 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Editar Alumno</h1>
            <p className="text-sm text-muted-foreground">
              {formData.firstName} {formData.lastName}
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Datos personales */}
        <div className="bg-card rounded-xl p-4 space-y-4 border border-border/50">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Datos personales
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Pérez"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="pl-10 opacity-60"
              />
            </div>
            <p className="text-xs text-muted-foreground">El email no se puede modificar</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+54 11 1234-5678"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Coach asignado */}
        <div className="bg-card rounded-xl p-4 space-y-4 border border-border/50">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Coach asignado
          </h3>
          
          <div className="space-y-2">
            <Label>Seleccionar coach</Label>
            <Select
              value={formData.coachId}
              onValueChange={(value) => setFormData({ ...formData, coachId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id.toString()}>
                    {coach.user?.fullName || "Sin nombre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estado */}
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Estado del alumno</h3>
              <p className="text-sm text-muted-foreground">
                {formData.isActive ? "El alumno está activo" : "El alumno está inactivo"}
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

