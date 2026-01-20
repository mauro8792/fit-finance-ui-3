"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createStudent, getAllCoaches } from "@/lib/api/admin";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  UserCog,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

// Convertir yyyy-mm-dd a dd/mm/yyyy para mostrar
const formatToDisplay = (isoDate: string): string => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// Convertir dd/mm/yyyy a yyyy-mm-dd para el backend
const formatToISO = (displayDate: string): string => {
  if (!displayDate) return "";
  const parts = displayDate.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
};

interface Coach {
  id: number;
  userId: number;
  user: {
    fullName: string;
  };
}

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    coachId: "",
    phone: "",
    birthDate: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const loadCoaches = async () => {
      try {
        const data = await getAllCoaches();
        setCoaches(data);
      } catch (error) {
        console.error("Error loading coaches:", error);
        toast.error("Error al cargar coaches");
      } finally {
        setLoadingCoaches(false);
      }
    };
    loadCoaches();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mínimo 6 caracteres";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }
    if (!formData.coachId) {
      newErrors.coachId = "Debe asignar un coach";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Por favor corrige los errores");
      return;
    }

    try {
      setLoading(true);
      
      await createStudent({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        coachId: parseInt(formData.coachId),
        phone: formData.phone || undefined,
        birthDate: formData.birthDate ? formatToISO(formData.birthDate) : undefined,
      });

      toast.success("Alumno creado exitosamente", {
        icon: <CheckCircle2 className="w-5 h-5 text-success" />,
      });
      
      router.push("/admin/students");
    } catch (error: any) {
      console.error("Error creating student:", error);
      const message = error.response?.data?.message || "Error al crear alumno";
      toast.error(message, {
        icon: <AlertCircle className="w-5 h-5 text-error" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Nuevo Alumno"
        subtitle="Crear cuenta de alumno"
        backHref="/admin/students"
      />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Datos personales */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
                <User className="w-4 h-4" />
                Datos personales
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs text-text-muted">
                    Nombre *
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    className={errors.firstName ? "border-error" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-error">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs text-text-muted">
                    Apellido *
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Pérez"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    className={errors.lastName ? "border-error" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-error">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-text-muted">
                  Teléfono (opcional)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birthDate" className="text-xs text-text-muted">
                  Fecha de nacimiento (opcional)
                </Label>
                <div 
                  className="relative flex items-center bg-background border border-border rounded-md px-3 py-2 cursor-pointer hover:border-primary transition-colors h-10"
                  onClick={() => dateInputRef.current?.showPicker()}
                >
                  <Calendar className="w-4 h-4 text-text-muted mr-2" />
                  <span className={`flex-1 text-sm ${formData.birthDate ? "text-text" : "text-text-muted"}`}>
                    {formData.birthDate || "dd/mm/aaaa"}
                  </span>
                  {/* Input oculto para el selector de fecha nativo */}
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={formatToISO(formData.birthDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleChange("birthDate", formatToDisplay(e.target.value));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credenciales */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Credenciales de acceso
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-text-muted">
                  Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="alumno@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={`pl-10 ${errors.email ? "border-error" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-error">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-text-muted">
                  Contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? "border-error" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-error">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs text-text-muted">
                  Confirmar contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? "border-error" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-error">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Asignación de coach */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Asignar coach
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="coach" className="text-xs text-text-muted">
                  Coach responsable *
                </Label>
                <Select
                  value={formData.coachId}
                  onValueChange={(value) => handleChange("coachId", value)}
                  disabled={loadingCoaches}
                >
                  <SelectTrigger className={errors.coachId ? "border-error" : ""}>
                    <SelectValue placeholder={loadingCoaches ? "Cargando..." : "Seleccionar coach"} />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id.toString()}>
                        {coach.user?.fullName || `Coach ${coach.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.coachId && (
                  <p className="text-xs text-error">{errors.coachId}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Botón de submit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Crear alumno
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}

