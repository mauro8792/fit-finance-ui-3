"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validar token al cargar
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const { data } = await api.get(`/auth/validate-reset-token?token=${token}`);
        setIsTokenValid(data.valid);
        setMaskedEmail(data.email || null);
      } catch (error) {
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Validación de contraseña
  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", valid: password.length >= 8 },
    { label: "Al menos una mayúscula", valid: /[A-Z]/.test(password) },
    { label: "Al menos una minúscula", valid: /[a-z]/.test(password) },
    { label: "Al menos un número", valid: /\d/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every(r => r.valid);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      toast.error("La contraseña no cumple los requisitos");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: password,
      });
      setIsSuccess(true);
      toast.success("¡Contraseña actualizada!");
    } catch (error: any) {
      const message = error.response?.data?.message || "Error al restablecer la contraseña";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-surface border-border">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Validando enlace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired token
  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md bg-surface border-border">
            <CardContent className="pt-8 pb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <XCircle className="w-10 h-10 text-error" />
              </motion.div>

              <h2 className="text-2xl font-bold text-text mb-2">
                Enlace inválido o expirado
              </h2>

              <p className="text-text-muted mb-6">
                Este enlace de recuperación ya no es válido. Puede haber expirado o ya fue utilizado.
              </p>

              <div className="bg-background/50 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-muted">
                    Los enlaces de recuperación expiran después de 2 horas por seguridad.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/auth/forgot-password">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Solicitar nuevo enlace
                  </Button>
                </Link>

                <Link href="/auth/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md bg-surface border-border">
            <CardContent className="pt-8 pb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-success" />
              </motion.div>

              <h2 className="text-2xl font-bold text-text mb-2">
                ¡Contraseña actualizada! 🎉
              </h2>

              <p className="text-text-muted mb-6">
                Tu contraseña ha sido cambiada exitosamente. Ya podés iniciar sesión con tu nueva contraseña.
              </p>

              <Link href="/auth/login">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Iniciar sesión
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/icons/logo.png"
            alt="BraCamp Bodybuilding"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-text">Nueva contraseña</h1>
          {maskedEmail && (
            <p className="text-text-muted mt-2">
              Para la cuenta: <strong className="text-primary">{maskedEmail}</strong>
            </p>
          )}
        </div>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg">Crear nueva contraseña</CardTitle>
            <CardDescription>
              Ingresá tu nueva contraseña. Asegurate de que sea segura.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nueva contraseña */}
              <div className="space-y-2">
                <label className="text-sm text-text-muted">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-border"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Requisitos de contraseña */}
              {password.length > 0 && (
                <div className="bg-background/50 rounded-lg p-3 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.valid ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-text-muted" />
                      )}
                      <span className={req.valid ? "text-success" : "text-text-muted"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmar contraseña */}
              <div className="space-y-2">
                <label className="text-sm text-text-muted">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-border"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-success">Las contraseñas coinciden</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-error" />
                        <span className="text-error">Las contraseñas no coinciden</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading || !allRequirementsMet || !passwordsMatch}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Cambiar contraseña
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="text-sm text-primary hover:underline inline-flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver al login
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-text-muted mt-6">
          © {new Date().getFullYear()} BraCamp. Todos los derechos reservados.
        </p>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
