"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createCoach } from "@/lib/api/admin";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Lock,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function NewCoachPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    paymentAlias: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      
      await createCoach({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      toast.success("Coach creado exitosamente", {
        icon: <CheckCircle2 className="w-5 h-5 text-success" />,
      });
      
      router.push("/admin/coaches");
    } catch (error: any) {
      console.error("Error creating coach:", error);
      const message = error.response?.data?.message || "Error al crear coach";
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
        title="Nuevo Coach"
        subtitle="Crear cuenta de entrenador"
        backHref="/admin/coaches"
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
                    placeholder="coach@email.com"
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
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className={`pl-10 ${errors.password ? "border-error" : ""}`}
                  />
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
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className={`pl-10 ${errors.confirmPassword ? "border-error" : ""}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-error">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Configuración de pagos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Configuración de pagos (opcional)
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="paymentAlias" className="text-xs text-text-muted">
                  Alias de pago (Mercado Pago, etc.)
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    id="paymentAlias"
                    placeholder="mi.alias.mp"
                    value={formData.paymentAlias}
                    onChange={(e) => handleChange("paymentAlias", e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-text-muted">
                  El coach puede configurar esto después desde su perfil
                </p>
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
            className="w-full h-12 bg-accent hover:bg-accent/90 text-black font-semibold"
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
                Crear coach
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}

