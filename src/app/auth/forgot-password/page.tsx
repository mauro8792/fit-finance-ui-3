"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Ingresá tu email");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setIsSuccess(true);
      toast.success("¡Revisá tu email!");
    } catch (error: any) {
      // Siempre mostramos éxito por seguridad (el backend también lo hace)
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

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
                ¡Revisá tu email! 📧
              </h2>
              
              <p className="text-text-muted mb-6">
                Si <strong className="text-text">{email}</strong> está registrado en nuestro sistema, 
                recibirás un correo con instrucciones para restablecer tu contraseña.
              </p>
              
              <div className="bg-background/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-text-muted">
                  💡 <strong>Tips:</strong>
                </p>
                <ul className="text-sm text-text-muted mt-2 space-y-1">
                  <li>• Revisá la carpeta de spam</li>
                  <li>• El enlace expira en 2 horas</li>
                  <li>• Si no recibís el email, esperá unos minutos</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsSuccess(false)}
                >
                  Enviar de nuevo
                </Button>
                
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
          <h1 className="text-2xl font-bold text-text">¿Olvidaste tu contraseña?</h1>
          <p className="text-text-muted mt-2">
            No te preocupes, te ayudamos a recuperarla 💪
          </p>
        </div>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg">Recuperar contraseña</CardTitle>
            <CardDescription>
              Ingresá el email con el que te registraste y te enviaremos instrucciones.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-text-muted">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-border"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar instrucciones
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
