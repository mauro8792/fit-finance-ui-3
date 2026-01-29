"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { motion } from "framer-motion";
import { ArrowRight, Dumbbell, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SelectProfilePage() {
  const router = useRouter();
  const { selectProfile, user, student, coach } = useAuthStore();

  const handleSelectProfile = (type: "coach" | "student") => {
    selectProfile(type);
    router.push(type === "coach" ? "/coach" : "/student");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/30 mx-auto mb-4 overflow-hidden">
            <Image
              src="/icons/gorila.png"
              alt="BraCamp"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">
            ¡Hola, {user?.fullName?.split(" ")[0]}!
          </h1>
          <p className="text-text-secondary">
            Tenés acceso dual. ¿Con qué perfil querés ingresar?
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Coach Option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className="bg-surface/80 backdrop-blur-xl border-border hover:border-primary/50 cursor-pointer transition-all group touch-feedback"
              onClick={() => handleSelectProfile("coach")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg">
                    <Dumbbell className="w-7 h-7 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text text-lg">Entrenador</h3>
                    <p className="text-sm text-text-muted">
                      Gestionar alumnos, rutinas y más
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Student Option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className="bg-surface/80 backdrop-blur-xl border-border hover:border-accent/50 cursor-pointer transition-all group touch-feedback"
              onClick={() => handleSelectProfile("student")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center shadow-lg">
                    <User className="w-7 h-7 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text text-lg">Atleta</h3>
                    <p className="text-sm text-text-muted">
                      Ver mi rutina, nutrición y progreso
                    </p>
                    {student && (
                      <p className="text-xs text-accent mt-1">
                        {student.firstName} {student.lastName}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Note */}
        <p className="text-center text-text-muted text-xs mt-8">
          Podés cambiar de perfil en cualquier momento desde el menú
        </p>
      </motion.div>
    </div>
  );
}

