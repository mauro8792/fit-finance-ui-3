"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { addWeightLog, getWeightByDate } from "@/lib/api/health";
import { getWeightHistory } from "@/lib/api/student";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scale, Plus, Minus, Calendar, Save, Edit3, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// Obtener fecha de hoy en formato yyyy-mm-dd (local, sin UTC)
const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Cambiar fecha por días (positivo = adelante, negativo = atrás)
const addDays = (isoDate: string, days: number): string => {
  const date = new Date(isoDate + 'T12:00:00');
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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

// Cache key for sessionStorage
const WEIGHT_CACHE_KEY = 'weight_cache';

// Helper functions for sessionStorage cache
const getWeightCache = (): Record<string, { weight: number; id: number } | null> => {
  if (typeof window === 'undefined') return {};
  try {
    const cached = sessionStorage.getItem(WEIGHT_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const setWeightCache = (date: string, value: { weight: number; id: number } | null) => {
  if (typeof window === 'undefined') return;
  try {
    const cache = getWeightCache();
    cache[date] = value;
    sessionStorage.setItem(WEIGHT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
};

const hasWeightCached = (date: string): boolean => {
  const cache = getWeightCache();
  return date in cache;
};

const getCachedWeight = (date: string): { weight: number; id: number } | null => {
  const cache = getWeightCache();
  return cache[date] || null;
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
  const initialLoadDoneRef = useRef(false);

  // Verificar si existe un registro para la fecha seleccionada (con caché en sessionStorage)
  const checkExistingRecord = useCallback(async (isoDate: string, studentId: number) => {
    // Verificar caché primero (sessionStorage)
    if (hasWeightCached(isoDate)) {
      const cached = getCachedWeight(isoDate);
      setExistingRecord(cached);
      if (cached && cached.weight > 0) {
        setWeight(cached.weight.toFixed(2));
      } else {
        setWeight("");
      }
      return;
    }
    
    setCheckingExisting(true);
    try {
      const existing = await getWeightByDate(studentId, isoDate);
      // Guardar en caché (sessionStorage)
      setWeightCache(isoDate, existing);
      setExistingRecord(existing);
      if (existing && existing.weight > 0) {
        // Precargar el peso existente
        setWeight(existing.weight.toFixed(2));
      }
    } catch (error) {
      console.error("Error checking existing record:", error);
      // Guardar null en caché para no reintentar
      setWeightCache(isoDate, null);
    } finally {
      setCheckingExisting(false);
    }
  }, []);

  // Precargar últimos 10 registros al montar (solo si no hay caché)
  useEffect(() => {
    const preloadRecentWeights = async () => {
      if (!student?.id || initialLoadDoneRef.current) return;
      initialLoadDoneRef.current = true;
      
      // Verificar si ya tenemos datos en caché (sessionStorage)
      const existingCache = getWeightCache();
      const hasCachedData = Object.keys(existingCache).length > 0;
      
      // Si ya hay datos en caché, solo cargar la fecha actual desde caché
      const todayIso = formatToISO(dateDisplay);
      if (hasCachedData && hasWeightCached(todayIso)) {
        const cached = getCachedWeight(todayIso);
        setExistingRecord(cached);
        if (cached && cached.weight > 0) {
          setWeight(cached.weight.toFixed(2));
        }
        return;
      }
      
      // Si no hay caché, precargar del backend
      try {
        const recentWeights = await getWeightHistory(student.id, 10);
        // Guardar cada registro en el caché por fecha
        recentWeights.forEach((record: any) => {
          const recordDate = record.date?.split('T')[0] || record.date;
          if (recordDate && !hasWeightCached(recordDate)) {
            setWeightCache(recordDate, { 
              weight: Number(record.weight), 
              id: record.id 
            });
          }
        });
        
        // Verificar si la fecha actual está en el caché después de precargar
        if (hasWeightCached(todayIso)) {
          const cached = getCachedWeight(todayIso);
          setExistingRecord(cached);
          if (cached && cached.weight > 0) {
            setWeight(cached.weight.toFixed(2));
          }
        } else {
          // Si no está en caché, hacer la consulta individual
          checkExistingRecord(todayIso, student.id);
        }
      } catch (error) {
        console.error("Error preloading weights:", error);
        // Fallback a la consulta individual
        checkExistingRecord(todayIso, student.id);
      }
    };
    
    preloadRecentWeights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  // Verificar cuando cambia la fecha (después de la precarga inicial)
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

  // Navegar a día anterior
  const handlePrevDay = () => {
    const currentIso = formatToISO(dateDisplay);
    const prevIso = addDays(currentIso, -1);
    setWeight("");
    setExistingRecord(null);
    setDateDisplay(formatToDisplay(prevIso));
  };

  // Navegar a día siguiente (máximo hoy)
  const handleNextDay = () => {
    const currentIso = formatToISO(dateDisplay);
    const today = getTodayLocal();
    if (currentIso >= today) return; // No pasar de hoy
    const nextIso = addDays(currentIso, 1);
    setWeight("");
    setExistingRecord(null);
    setDateDisplay(formatToDisplay(nextIso));
  };

  const isToday = formatToISO(dateDisplay) === getTodayLocal();

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
      
      const wasUpdate = !!existingRecord;
      toast.success(wasUpdate 
        ? `¡Peso actualizado a ${currentWeight} kg! ✏️` 
        : `¡${currentWeight} kg registrados! 📊`
      );
      
      // No redirigir - quedarse en el formulario para cargar más datos
      // Actualizar el estado y el caché (sessionStorage) para reflejar que ahora existe un registro
      const newRecord = { weight: currentWeight, id: existingRecord?.id || 0 };
      setExistingRecord(newRecord);
      setWeightCache(isoDate, newRecord);
      
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
        {/* Date Picker with Navigation - FIRST */}
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
            
            {/* Date navigation with arrows */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handlePrevDay}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <div 
                className="relative flex items-center bg-background border border-border rounded-md px-3 py-2 cursor-pointer hover:border-primary transition-colors flex-1 overflow-hidden"
                onClick={() => dateInputRef.current?.showPicker()}
              >
                <Calendar className="w-5 h-5 text-primary mr-3" />
                <motion.span 
                  key={dateDisplay}
                  className="text-text flex-1"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {dateDisplay}
                </motion.span>
                {isToday && (
                  <Badge variant="secondary" className="text-xs ml-2">Hoy</Badge>
                )}
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
              
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handleNextDay}
                disabled={isToday}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            
            {existingRecord && (
              <p className="text-xs text-text-muted mt-2">
                💡 Ya tenés un registro para esta fecha. Se actualizará con el nuevo valor.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Weight Input - SECOND */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <motion.div 
                className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                animate={checkingExisting ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3, repeat: checkingExisting ? Infinity : 0 }}
              >
                <Scale className="w-10 h-10 text-primary" />
              </motion.div>
              <motion.p
                key={dateDisplay + "-" + weight}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
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

