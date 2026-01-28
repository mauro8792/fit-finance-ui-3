"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { addSleepLog, getSleepLogs, type SleepQuality, type SleepLogInput } from "@/lib/api/health";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Moon, Plus, Minus, Calendar, Save, Edit3, Loader2, ChevronLeft, ChevronRight, Clock, Battery, BatteryLow, BatteryMedium, BatteryFull } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

// Helper para obtener el color según las horas
const getSleepColor = (hours: number, minutes: number): string => {
  const decimal = hours + minutes / 60;
  if (decimal >= 8) return "#22c55e"; // Verde oscuro
  if (decimal >= 7) return "#4ade80"; // Verde claro
  if (decimal >= 6) return "#eab308"; // Amarillo
  if (decimal >= 5) return "#f97316"; // Naranja
  return "#ef4444"; // Rojo
};

// Helper para obtener el label del estado
const getSleepLabel = (hours: number, minutes: number): string => {
  const decimal = hours + minutes / 60;
  if (decimal >= 8) return "Óptimo";
  if (decimal >= 7) return "Bien";
  if (decimal >= 6) return "Medio";
  if (decimal >= 5) return "Bajo";
  return "Déficit";
};

// Cache key for sessionStorage
const SLEEP_CACHE_KEY = 'sleep_cache';

interface CachedSleepRecord {
  id: number;
  sleepHours: number;
  sleepMinutes: number;
  bedtime?: string;
  quality: SleepQuality;
  notes?: string;
}

// Helper functions for sessionStorage cache
const getSleepCache = (): Record<string, CachedSleepRecord | null> => {
  if (typeof window === 'undefined') return {};
  try {
    const cached = sessionStorage.getItem(SLEEP_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const setSleepCache = (date: string, value: CachedSleepRecord | null) => {
  if (typeof window === 'undefined') return;
  try {
    const cache = getSleepCache();
    cache[date] = value;
    sessionStorage.setItem(SLEEP_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
};

const hasSleepCached = (date: string): boolean => {
  const cache = getSleepCache();
  return date in cache;
};

const getCachedSleep = (date: string): CachedSleepRecord | null => {
  const cache = getSleepCache();
  return cache[date] || null;
};

const qualityOptions: { value: SleepQuality; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "PLENO", label: "Pleno", icon: <BatteryFull className="w-5 h-5" />, description: "Dormí de corrido" },
  { value: "ENTRECORTADO", label: "Irregular", icon: <BatteryMedium className="w-5 h-5" />, description: "Me desperté varias veces" },
  { value: "DIFICULTAD_DORMIR", label: "Difícil", icon: <BatteryLow className="w-5 h-5" />, description: "Me costó conciliar el sueño" },
];

export default function AddSleepPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [bedtime, setBedtime] = useState("");
  const [quality, setQuality] = useState<SleepQuality>("PLENO");
  const [notes, setNotes] = useState("");
  const [dateDisplay, setDateDisplay] = useState(formatToDisplay(getTodayLocal())); // dd/mm/aaaa
  const [saving, setSaving] = useState(false);
  const [existingRecord, setExistingRecord] = useState<CachedSleepRecord | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const initialLoadDoneRef = useRef(false);

  // Verificar si existe un registro para la fecha seleccionada
  const checkExistingRecord = useCallback(async (isoDate: string, studentId: number) => {
    // Verificar caché primero
    if (hasSleepCached(isoDate)) {
      const cached = getCachedSleep(isoDate);
      setExistingRecord(cached);
      if (cached) {
        setSleepHours(cached.sleepHours);
        setSleepMinutes(cached.sleepMinutes);
        setBedtime(cached.bedtime || "");
        setQuality(cached.quality);
        setNotes(cached.notes || "");
      } else {
        // Reset a valores default si no hay registro
        setSleepHours(7);
        setSleepMinutes(0);
        setBedtime("");
        setQuality("PLENO");
        setNotes("");
      }
      return;
    }
    
    setCheckingExisting(true);
    try {
      // Buscar en los últimos registros
      const logs = await getSleepLogs(studentId, 30);
      const existing = logs.find(log => log.date === isoDate);
      
      if (existing) {
        const record: CachedSleepRecord = {
          id: existing.id,
          sleepHours: existing.sleepHours,
          sleepMinutes: existing.sleepMinutes,
          bedtime: existing.bedtime,
          quality: existing.quality,
          notes: existing.notes,
        };
        setSleepCache(isoDate, record);
        setExistingRecord(record);
        setSleepHours(record.sleepHours);
        setSleepMinutes(record.sleepMinutes);
        setBedtime(record.bedtime || "");
        setQuality(record.quality);
        setNotes(record.notes || "");
      } else {
        setSleepCache(isoDate, null);
        setExistingRecord(null);
      }
    } catch (error) {
      console.error("Error checking existing record:", error);
      setSleepCache(isoDate, null);
    } finally {
      setCheckingExisting(false);
    }
  }, []);

  // Precargar al montar
  useEffect(() => {
    const preloadRecentSleep = async () => {
      if (!student?.id || initialLoadDoneRef.current) return;
      initialLoadDoneRef.current = true;
      
      const todayIso = formatToISO(dateDisplay);
      
      // Si ya hay datos en caché
      if (hasSleepCached(todayIso)) {
        const cached = getCachedSleep(todayIso);
        setExistingRecord(cached);
        if (cached) {
          setSleepHours(cached.sleepHours);
          setSleepMinutes(cached.sleepMinutes);
          setBedtime(cached.bedtime || "");
          setQuality(cached.quality);
          setNotes(cached.notes || "");
        }
        return;
      }
      
      // Si no hay caché, precargar del backend
      try {
        const recentLogs = await getSleepLogs(student.id, 30);
        recentLogs.forEach((record) => {
          if (!hasSleepCached(record.date)) {
            setSleepCache(record.date, {
              id: record.id,
              sleepHours: record.sleepHours,
              sleepMinutes: record.sleepMinutes,
              bedtime: record.bedtime,
              quality: record.quality,
              notes: record.notes,
            });
          }
        });
        
        // Verificar si la fecha actual está en el caché
        if (hasSleepCached(todayIso)) {
          const cached = getCachedSleep(todayIso);
          setExistingRecord(cached);
          if (cached) {
            setSleepHours(cached.sleepHours);
            setSleepMinutes(cached.sleepMinutes);
            setBedtime(cached.bedtime || "");
            setQuality(cached.quality);
            setNotes(cached.notes || "");
          }
        }
      } catch (error) {
        console.error("Error preloading sleep logs:", error);
      }
    };
    
    preloadRecentSleep();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  // Verificar cuando cambia la fecha
  useEffect(() => {
    if (!student?.id) return;
    const isoDate = formatToISO(dateDisplay);
    checkExistingRecord(isoDate, student.id);
  }, [dateDisplay, student?.id, checkExistingRecord]);

  const handleHoursChange = (delta: number) => {
    setSleepHours(prev => Math.max(0, Math.min(24, prev + delta)));
  };

  const handleMinutesChange = (delta: number) => {
    setSleepMinutes(prev => {
      const newVal = prev + delta;
      if (newVal >= 60) return 0;
      if (newVal < 0) return 45;
      return newVal;
    });
  };

  // Navegar a día anterior
  const handlePrevDay = () => {
    const currentIso = formatToISO(dateDisplay);
    const prevIso = addDays(currentIso, -1);
    setExistingRecord(null);
    setSleepHours(7);
    setSleepMinutes(0);
    setBedtime("");
    setQuality("PLENO");
    setNotes("");
    setDateDisplay(formatToDisplay(prevIso));
  };

  // Navegar a día siguiente (máximo hoy)
  const handleNextDay = () => {
    const currentIso = formatToISO(dateDisplay);
    const today = getTodayLocal();
    if (currentIso >= today) return;
    const nextIso = addDays(currentIso, 1);
    setExistingRecord(null);
    setSleepHours(7);
    setSleepMinutes(0);
    setBedtime("");
    setQuality("PLENO");
    setNotes("");
    setDateDisplay(formatToDisplay(nextIso));
  };

  const isToday = formatToISO(dateDisplay) === getTodayLocal();
  const displayFormat = sleepMinutes > 0 ? `${sleepHours}h ${sleepMinutes}m` : `${sleepHours}h`;
  const sleepColor = getSleepColor(sleepHours, sleepMinutes);
  const sleepLabel = getSleepLabel(sleepHours, sleepMinutes);

  const handleSubmit = async () => {
    if (!student?.id) return;

    if (sleepHours === 0 && sleepMinutes === 0) {
      toast.error("Ingresá las horas de sueño");
      return;
    }

    try {
      setSaving(true);
      const isoDate = formatToISO(dateDisplay);
      
      const sleepData: SleepLogInput = {
        date: isoDate,
        sleepHours,
        sleepMinutes,
        bedtime: bedtime || undefined,
        quality,
        notes: notes || undefined,
      };
      
      const result = await addSleepLog(student.id, sleepData);
      
      const wasUpdate = !!existingRecord;
      toast.success(wasUpdate 
        ? `¡Sueño actualizado a ${displayFormat}! ✏️` 
        : `¡${displayFormat} registrados! 🌙`
      );
      
      // Actualizar el caché
      const newRecord: CachedSleepRecord = {
        id: result.id,
        sleepHours,
        sleepMinutes,
        bedtime: bedtime || undefined,
        quality,
        notes: notes || undefined,
      };
      setExistingRecord(newRecord);
      setSleepCache(isoDate, newRecord);
      
    } catch (error: any) {
      console.error("Error adding sleep:", error);
      if (error?.response?.status === 400) {
        toast.error("Ya existe un registro para esta fecha");
      } else {
        toast.error("Error al registrar el sueño");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Registrar sueño" backHref="/student/progress" />

      <div className="px-4 py-4 space-y-4">
        {/* Date Picker with Navigation */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-text-muted">
                Fecha (sueño de anoche)
              </Label>
              {checkingExisting && (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              )}
              {!checkingExisting && existingRecord && (
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                  <Edit3 className="w-3 h-3 mr-1" />
                  Editando
                </Badge>
              )}
            </div>
            
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
                <input
                  ref={dateInputRef}
                  type="date"
                  value={formatToISO(dateDisplay)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setExistingRecord(null);
                      setSleepHours(7);
                      setSleepMinutes(0);
                      setBedtime("");
                      setQuality("PLENO");
                      setNotes("");
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
          </CardContent>
        </Card>

        {/* Sleep Hours Input */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <motion.div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${sleepColor}20` }}
                animate={checkingExisting ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3, repeat: checkingExisting ? Infinity : 0 }}
              >
                <Moon className="w-10 h-10" style={{ color: sleepColor }} />
              </motion.div>
              <motion.p
                key={`${sleepHours}-${sleepMinutes}`}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-5xl font-bold text-text"
              >
                {displayFormat}
              </motion.p>
              <Badge 
                className="mt-2"
                style={{ backgroundColor: `${sleepColor}30`, color: sleepColor, borderColor: sleepColor }}
              >
                {sleepLabel}
              </Badge>
            </div>

            {/* Hours and Minutes selectors */}
            <div className="grid grid-cols-2 gap-4">
              {/* Hours */}
              <div className="text-center">
                <Label className="text-text-muted text-sm mb-2 block">Horas</Label>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-full"
                    onClick={() => handleHoursChange(-1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-3xl font-bold text-text w-12">{sleepHours}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-full"
                    onClick={() => handleHoursChange(1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Minutes */}
              <div className="text-center">
                <Label className="text-text-muted text-sm mb-2 block">Minutos</Label>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-full"
                    onClick={() => handleMinutesChange(-15)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-3xl font-bold text-text w-12">{sleepMinutes.toString().padStart(2, '0')}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-full"
                    onClick={() => handleMinutesChange(15)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[6, 7, 8, 9].map((h) => (
                <Button
                  key={h}
                  variant={sleepHours === h && sleepMinutes === 0 ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => { setSleepHours(h); setSleepMinutes(0); }}
                >
                  {h}h
                </Button>
              ))}
              <Button
                variant={sleepHours === 7 && sleepMinutes === 30 ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => { setSleepHours(7); setSleepMinutes(30); }}
              >
                7h 30m
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sleep Quality */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <Label className="text-text-muted text-sm mb-3 block">Calidad del sueño</Label>
            <div className="grid grid-cols-3 gap-2">
              {qualityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setQuality(option.value)}
                  className={cn(
                    "p-3 rounded-lg border transition-all text-center",
                    quality === option.value
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  <div className="flex justify-center mb-1">
                    {option.icon}
                  </div>
                  <p className="text-xs font-medium">{option.label}</p>
                  <p className="text-[10px] text-text-muted mt-0.5 hidden sm:block">{option.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bedtime (optional) */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <Label className="text-text-muted text-sm mb-2 block">
              <Clock className="w-4 h-4 inline mr-1" />
              Hora de acostarte (opcional)
            </Label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text"
            />
          </CardContent>
        </Card>

        {/* Notes (optional) */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <Label className="text-text-muted text-sm mb-2 block">
              Notas (opcional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Me desperté 2 veces, tomé café tarde..."
              className="min-h-[60px] resize-none"
            />
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-indigo-500/10 border-indigo-500/20">
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">
              🌙 <strong className="text-text">Tip:</strong> Registrá tu sueño apenas te levantes para no olvidar los detalles. Lo ideal es dormir entre 7-9 horas.
            </p>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg rounded-xl"
          disabled={(sleepHours === 0 && sleepMinutes === 0) || saving || checkingExisting}
          onClick={handleSubmit}
        >
          {saving ? (
            "Guardando..."
          ) : existingRecord ? (
            <>
              <Edit3 className="w-5 h-5 mr-2" />
              Actualizar a {displayFormat}
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Registrar {displayFormat}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
