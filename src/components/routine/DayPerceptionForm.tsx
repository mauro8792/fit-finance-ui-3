"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateMyDayPerception } from "@/lib/api/routine-v2";
import { cn } from "@/lib/utils";
import { Battery, BatteryFull, BatteryLow, BatteryMedium, Check, Flame, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DayPerceptionFormProps {
  dayId: string;
  initialReadiness?: number;
  initialEffort?: number;
  onUpdate?: (readiness?: number, effort?: number) => void;
  compact?: boolean;
}

export function DayPerceptionForm({
  dayId,
  initialReadiness,
  initialEffort,
  onUpdate,
  compact = false,
}: DayPerceptionFormProps) {
  const [readiness, setReadiness] = useState<number | undefined>(initialReadiness);
  const [effort, setEffort] = useState<number | undefined>(initialEffort);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setReadiness(initialReadiness);
    setEffort(initialEffort);
  }, [initialReadiness, initialEffort]);

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setSaving(true);
    try {
      await updateMyDayPerception(dayId, {
        readinessPre: readiness,
        postWorkoutEffort: effort,
      });
      toast.success("Percepción guardada");
      setHasChanges(false);
      onUpdate?.(readiness, effort);
    } catch (error) {
      console.error("Error saving perception:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReadinessChange = (value: number) => {
    setReadiness(value);
    setHasChanges(true);
  };

  const handleEffortChange = (value: number) => {
    setEffort(value);
    setHasChanges(true);
  };

  const getReadinessColor = (value: number) => {
    if (value >= 8) return "text-emerald-400 bg-emerald-500/20 border-emerald-500/50";
    if (value >= 6) return "text-amber-400 bg-amber-500/20 border-amber-500/50";
    if (value >= 4) return "text-orange-400 bg-orange-500/20 border-orange-500/50";
    return "text-red-400 bg-red-500/20 border-red-500/50";
  };

  const getEffortColor = (value: number) => {
    if (value >= 9) return "text-red-400 bg-red-500/20 border-red-500/50";
    if (value >= 7) return "text-orange-400 bg-orange-500/20 border-orange-500/50";
    if (value >= 5) return "text-amber-400 bg-amber-500/20 border-amber-500/50";
    return "text-emerald-400 bg-emerald-500/20 border-emerald-500/50";
  };

  const getReadinessIcon = (value?: number) => {
    if (!value) return <Battery className="w-5 h-5" />;
    if (value >= 7) return <BatteryFull className="w-5 h-5" />;
    if (value >= 4) return <BatteryMedium className="w-5 h-5" />;
    return <BatteryLow className="w-5 h-5" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {/* PRS compacto */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">PRS:</span>
          <select
            value={readiness || ""}
            onChange={(e) => handleReadinessChange(Number(e.target.value))}
            className="bg-[#1a1a24] border border-[#2a2a35] rounded px-2 py-1 text-sm text-white"
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        
        {/* Esfuerzo compacto */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Esfuerzo:</span>
          <select
            value={effort || ""}
            onChange={(e) => handleEffortChange(Number(e.target.value))}
            className="bg-[#1a1a24] border border-[#2a2a35] rounded px-2 py-1 text-sm text-white"
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-[#13131a] border-[#1e1e2a]">
      <CardContent className="p-4 space-y-4">
        {/* PRS - Readiness Pre-Entrenamiento */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg",
                readiness ? getReadinessColor(readiness) : "bg-gray-800"
              )}>
                {getReadinessIcon(readiness)}
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">PRS - Readiness</h4>
                <p className="text-[10px] text-gray-500">¿Cómo te sentís antes de entrenar?</p>
              </div>
            </div>
            {readiness && (
              <span className={cn(
                "text-2xl font-bold",
                getReadinessColor(readiness).split(" ")[0]
              )}>
                {readiness}
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => handleReadinessChange(n)}
                className={cn(
                  "flex-1 h-8 rounded text-xs font-medium transition-all",
                  readiness === n
                    ? getReadinessColor(n)
                    : "bg-[#1a1a24] text-gray-500 hover:bg-[#252530] border border-transparent"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-gray-600">
            <span>Muy cansado</span>
            <span>Excelente</span>
          </div>
        </div>

        {/* Esfuerzo Post-Entrenamiento */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg",
                effort ? getEffortColor(effort) : "bg-gray-800"
              )}>
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Esfuerzo Post</h4>
                <p className="text-[10px] text-gray-500">¿Qué tan duro fue el entreno?</p>
              </div>
            </div>
            {effort && (
              <span className={cn(
                "text-2xl font-bold",
                getEffortColor(effort).split(" ")[0]
              )}>
                {effort}
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => handleEffortChange(n)}
                className={cn(
                  "flex-1 h-8 rounded text-xs font-medium transition-all",
                  effort === n
                    ? getEffortColor(n)
                    : "bg-[#1a1a24] text-gray-500 hover:bg-[#252530] border border-transparent"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-gray-600">
            <span>Muy fácil</span>
            <span>Máximo esfuerzo</span>
          </div>
        </div>

        {/* Botón guardar */}
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-10 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Guardar Percepción
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
