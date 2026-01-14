"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { addWeightLog, getWeightByDate } from "@/lib/api/health";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scale, Plus, Minus, Calendar, Save, Edit3, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Obtener fecha de hoy en formato yyyy-mm-dd (local, sin UTC)
const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Convertir yyyy-mm-dd a dd/mm/aaaa para mostrar
const formatToDisplay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// Convertir dd/mm/aaaa a yyyy-mm-dd para el backend
const formatToISO = (displayDate: string): string => {
  const parts = displayDate.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return getTodayLocal();
};

export default function AddWeightPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [weight, setWeight] = useState("");
  const [dateDisplay, setDateDisplay] = useState(formatToDisplay(getTodayLocal())); // dd/mm/aaaa
  const [saving, setSaving] = useState(false);
  const [existingRecord, setExistingRecord] = useState<{ weight: number; id: number } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Verificar si existe un registro para la fecha seleccionada
  const checkExistingRecord = useCallback(async (isoDate: string, studentId: number) => {
    setCheckingExisting(true);
    try {
      const existing = await getWeightByDate(studentId, isoDate);
      setExistingRecord(existing);
      if (existing && existing.weight > 0) {
        // Precargar el peso existente
        setWeight(existing.weight.toFixed(2));
      }
    } catch (error) {
      console.error("Error checking existing record:", error);
    } finally {
      setCheckingExisting(false);
    }
  }, []);

  // Verificar al montar y cuando cambia la fecha o el student
  useEffect(() => {
    if (!student?.id) return;
    const isoDate = formatToISO(dateDisplay);
    checkExistingRecord(isoDate, student.id);
  }, [dateDisplay, student?.id, checkExistingRecord]);

  const currentWeight = Number(weight) || 0;

  const handleIncrement = (amount: number) => {
    const newWeight = Math.max(0, currentWeight + amount);
    setWeight(newWeight.toFixed(2));
  };

  const handleSubmit = async () => {
    if (!student?.id) return;

    if (!weight || currentWeight <= 0) {
      toast.error("Ingresá un peso válido");
      return;
    }

    try {
      setSaving(true);
      // Convertir dd/mm/aaaa a yyyy-mm-dd para el backend
      const isoDate = formatToISO(dateDisplay);
      await addWeightLog(student.id, currentWeight, isoDate);
      toast.success(`¡${currentWeight} kg registrados! 📊`);
      router.push("/student/progress?tab=weight");
    } catch (error) {
      console.error("Error adding weight:", error);
      toast.error("Error al registrar el peso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Registrar peso" backHref="/student/progress" />

      <div className="px-4 py-4 space-y-6">
        {/* Weight Input */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Scale className="w-10 h-10 text-primary" />
              </div>
              <motion.p
                key={weight}
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-bold text-text"
              >
                {currentWeight > 0 ? currentWeight.toFixed(2) : "--"}
              </motion.p>
              <p className="text-text-muted mt-1">kilogramos</p>
            </div>

            {/* Manual Input */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={() => handleIncrement(-0.1)}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <Input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="text-center text-2xl font-semibold h-12"
                placeholder="0.00"
              />
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={() => handleIncrement(0.1)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Adjust Buttons */}
            <div className="flex justify-center gap-2">
              {[-0.5, -0.1, 0.1, 0.5].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleIncrement(amount)}
                >
                  {amount > 0 ? "+" : ""}
                  {amount}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date Picker */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-text-muted">
                Fecha
              </Label>
              {checkingExisting && (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              )}
              {!checkingExisting && existingRecord && (
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                  <Edit3 className="w-3 h-3 mr-1" />
                  Editando registro
                </Badge>
              )}
            </div>
            <div 
              className="relative flex items-center bg-background border border-border rounded-md px-3 py-2 cursor-pointer hover:border-primary transition-colors"
              onClick={() => dateInputRef.current?.showPicker()}
            >
              <Calendar className="w-5 h-5 text-primary mr-3" />
              <span className="text-text flex-1">{dateDisplay}</span>
              {/* Input oculto para el selector de fecha nativo */}
              <input
                ref={dateInputRef}
                type="date"
                value={formatToISO(dateDisplay)}
                onChange={(e) => {
                  if (e.target.value) {
                    // Limpiar el peso al cambiar la fecha para que se recargue
                    setWeight("");
                    setExistingRecord(null);
                    setDateDisplay(formatToDisplay(e.target.value));
                  }
                }}
                max={getTodayLocal()}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {existingRecord && (
              <p className="text-xs text-text-muted mt-2">
                💡 Ya tenés un registro para esta fecha. Se actualizará con el nuevo valor.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">
              💡 <strong className="text-text">Tip:</strong> Pesate siempre a la misma hora,
              preferiblemente en ayunas y después de ir al baño para obtener mediciones
              más consistentes.
            </p>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold text-lg rounded-xl"
          disabled={currentWeight <= 0 || saving || checkingExisting}
          onClick={handleSubmit}
        >
          {saving ? (
            "Guardando..."
          ) : existingRecord ? (
            <>
              <Edit3 className="w-5 h-5 mr-2" />
              Actualizar a {currentWeight > 0 && `${currentWeight.toFixed(2)} kg`}
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Registrar {currentWeight > 0 && `${currentWeight.toFixed(2)} kg`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

