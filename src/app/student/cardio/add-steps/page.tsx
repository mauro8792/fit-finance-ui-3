"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { addManualSteps, getStepsByDate } from "@/lib/api/cardio";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Footprints, Plus, Minus, Calendar, Edit3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn, getTodayString } from "@/lib/utils";

const QUICK_ADD = [1000, 2000, 5000, 8000, 10000];

// Helper to convert yyyy-mm-dd to dd/mm/yyyy for display
const formatDateForDisplay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// Helper to convert dd/mm/yyyy to yyyy-mm-dd for backend
const parseDisplayDate = (displayDate: string): string => {
  const parts = displayDate.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return getTodayString();
};

export default function AddStepsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { student } = useAuthStore();
  
  // Leer fecha de URL o usar hoy
  const dateFromUrl = searchParams.get("date");
  const initialDate = dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl) 
    ? dateFromUrl 
    : getTodayString();
  
  const [steps, setSteps] = useState(0);
  const [dateDisplay, setDateDisplay] = useState(formatDateForDisplay(initialDate));
  const [saving, setSaving] = useState(false);
  const [existingRecord, setExistingRecord] = useState<{ steps: number; id: number } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Actualizar fecha si cambia el parámetro URL
  useEffect(() => {
    if (dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl)) {
      setDateDisplay(formatDateForDisplay(dateFromUrl));
    }
  }, [dateFromUrl]);

  // Verificar si existe un registro para la fecha seleccionada
  const checkExistingRecord = useCallback(async (isoDate: string, studentId: number) => {
    setCheckingExisting(true);
    try {
      const existing = await getStepsByDate(studentId, isoDate);
      setExistingRecord(existing);
      if (existing && existing.steps > 0) {
        // Precargar los pasos existentes
        setSteps(existing.steps);
      } else if (initialized) {
        // Solo resetear si ya se inicializó (para evitar flicker)
        setSteps(0);
      }
    } catch (error) {
      console.error("Error checking existing record:", error);
    } finally {
      setCheckingExisting(false);
      setInitialized(true);
    }
  }, [initialized]);

  // Verificar al montar y cuando cambia la fecha o el student
  useEffect(() => {
    if (!student?.id) return;
    const isoDate = parseDisplayDate(dateDisplay);
    checkExistingRecord(isoDate, student.id);
  }, [dateDisplay, student?.id, checkExistingRecord]);

  const handleQuickAdd = (amount: number) => {
    setSteps(amount);
  };

  const handleIncrement = (amount: number) => {
    setSteps(Math.max(0, steps + amount));
  };

  const handleSubmit = async () => {
    if (!student?.id || steps <= 0) {
      toast.error("Ingresá la cantidad de pasos");
      return;
    }

    // Convert display date (dd/mm/yyyy) to ISO format (yyyy-mm-dd) for backend
    const isoDate = parseDisplayDate(dateDisplay);

    try {
      setSaving(true);
      // Si ya existe, reemplazamos (replace: true)
      await addManualSteps(student.id, { steps, date: isoDate, replace: true });
      toast.success(existingRecord 
        ? `¡Pasos actualizados a ${steps.toLocaleString()}! 📊` 
        : `¡${steps.toLocaleString()} pasos registrados! 🎉`
      );
      // Volver al calendario o a cardio según de dónde vino
      router.push(dateFromUrl ? "/student/cardio/calendar" : "/student/cardio");
    } catch (error) {
      console.error("Error adding steps:", error);
      toast.error("Error al registrar los pasos");
    } finally {
      setSaving(false);
    }
  };

  // Determinar a dónde volver
  const backHref = dateFromUrl ? "/student/cardio/calendar" : "/student/cardio";

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Cargar pasos" backHref={backHref} />

      <div className="px-4 py-4 space-y-6">
        {/* Steps Input */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Footprints className="w-10 h-10 text-primary" />
              </div>
              <motion.p
                key={steps}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-bold text-text"
              >
                {steps.toLocaleString()}
              </motion.p>
              <p className="text-text-muted mt-1">pasos</p>
            </div>

            {/* Manual Input */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={() => handleIncrement(-500)}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <Input
                type="number"
                value={steps || ""}
                onChange={(e) => setSteps(Number(e.target.value) || 0)}
                className="text-center text-2xl font-semibold h-12"
                placeholder="0"
              />
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={() => handleIncrement(500)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {QUICK_ADD.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs",
                    steps === amount && "bg-primary/20 border-primary text-primary"
                  )}
                  onClick={() => handleQuickAdd(amount)}
                >
                  {amount >= 1000 ? `${amount / 1000}k` : amount}
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
                value={parseDisplayDate(dateDisplay)}
                onChange={(e) => {
                  if (e.target.value) {
                    // Limpiar pasos al cambiar la fecha para que se recargue
                    setSteps(0);
                    setExistingRecord(null);
                    setDateDisplay(formatDateForDisplay(e.target.value));
                  }
                }}
                max={getTodayString()}
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

        {/* Submit Button */}
        <Button
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold text-lg rounded-xl"
          disabled={steps <= 0 || saving || checkingExisting}
          onClick={handleSubmit}
        >
          {saving ? (
            "Guardando..."
          ) : existingRecord ? (
            <>
              <Edit3 className="w-5 h-5 mr-2" />
              Actualizar a {steps > 0 && steps.toLocaleString()} pasos
            </>
          ) : (
            <>
              <Footprints className="w-5 h-5 mr-2" />
              Registrar {steps > 0 && steps.toLocaleString()} pasos
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

