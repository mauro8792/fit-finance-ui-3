"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { createWeight } from "@/lib/api/student";
import { addManualSteps, getStepsByDate } from "@/lib/api/cardio";
import { getWeightByDate } from "@/lib/api/health";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Scale, Footprints, Loader2, Check, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Obtener fecha de hoy en formato yyyy-mm-dd
const getTodayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export default function DailyRecordPage() {
  const router = useRouter();
  const { student } = useAuthStore();

  const [activeTab, setActiveTab] = useState("weight");
  
  // Weight state
  const [weight, setWeight] = useState("");
  const [weightNotes, setWeightNotes] = useState("");
  const [weightLoading, setWeightLoading] = useState(false);
  const [weightSuccess, setWeightSuccess] = useState(false);
  const [existingWeight, setExistingWeight] = useState<{ weight: number; id: number } | null>(null);
  const [checkingWeight, setCheckingWeight] = useState(false);

  // Steps state
  const [steps, setSteps] = useState("");
  const [stepsNotes, setStepsNotes] = useState("");
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsSuccess, setStepsSuccess] = useState(false);
  const [existingSteps, setExistingSteps] = useState<{ steps: number; id: number } | null>(null);
  const [checkingSteps, setCheckingSteps] = useState(false);

  // Verificar registros existentes para hoy
  const checkExistingRecords = useCallback(async (studentId: number) => {
    const today = getTodayISO();
    
    // Verificar peso
    setCheckingWeight(true);
    try {
      const existingW = await getWeightByDate(studentId, today);
      setExistingWeight(existingW);
      if (existingW && existingW.weight > 0) {
        setWeight(existingW.weight.toFixed(2));
      }
    } catch (error) {
      console.error("Error checking existing weight:", error);
    } finally {
      setCheckingWeight(false);
    }

    // Verificar pasos
    setCheckingSteps(true);
    try {
      const existingS = await getStepsByDate(studentId, today);
      setExistingSteps(existingS);
      if (existingS && existingS.steps > 0) {
        setSteps(existingS.steps.toString());
      }
    } catch (error) {
      console.error("Error checking existing steps:", error);
    } finally {
      setCheckingSteps(false);
    }
  }, []);

  // Verificar al montar el componente
  useEffect(() => {
    if (student?.id) {
      checkExistingRecords(student.id);
    }
  }, [student?.id, checkExistingRecords]);

  const handleWeightSubmit = async () => {
    if (!student?.id || !weight) return;

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      toast.error("Ingresá un peso válido");
      return;
    }

    setWeightLoading(true);
    try {
      await createWeight(student.id, weightNum, getTodayISO(), weightNotes || undefined);
      setWeightSuccess(true);
      toast.success(existingWeight ? "Peso actualizado correctamente" : "Peso registrado correctamente");
      setTimeout(() => {
        router.push("/student");
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar peso");
    } finally {
      setWeightLoading(false);
    }
  };

  const handleStepsSubmit = async () => {
    if (!student?.id || !steps) return;

    const stepsNum = parseInt(steps);
    if (isNaN(stepsNum) || stepsNum < 0 || stepsNum > 100000) {
      toast.error("Ingresá una cantidad de pasos válida");
      return;
    }

    setStepsLoading(true);
    try {
      await addManualSteps(student.id, { steps: stepsNum, date: getTodayISO(), replace: true });
      setStepsSuccess(true);
      toast.success(existingSteps ? "Pasos actualizados correctamente" : "Pasos registrados correctamente");
      setTimeout(() => {
        router.push("/student");
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar pasos");
    } finally {
      setStepsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Registro Diario"
        subtitle="Cargá tus datos de hoy"
        showBack
        backHref="/student"
      />

      <div className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-surface border border-border">
            <TabsTrigger
              value="weight"
              className={cn(
                "data-[state=active]:bg-primary data-[state=active]:text-black",
                "flex items-center gap-2"
              )}
            >
              <Scale className="w-4 h-4" />
              Peso
            </TabsTrigger>
            <TabsTrigger
              value="steps"
              className={cn(
                "data-[state=active]:bg-accent data-[state=active]:text-black",
                "flex items-center gap-2"
              )}
            >
              <Footprints className="w-4 h-4" />
              Pasos
            </TabsTrigger>
          </TabsList>

          {/* Weight Tab */}
          <TabsContent value="weight" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
                      <Scale className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-text">Peso de hoy</h2>
                        {checkingWeight && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        )}
                        {!checkingWeight && existingWeight && (
                          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Ya registrado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted font-normal">
                        {new Date().toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weightSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <p className="text-lg font-semibold text-text">{weight} kg registrado</p>
                      <p className="text-sm text-text-muted">Redirigiendo...</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="weight" className="text-text-secondary">
                          Peso (kg)
                        </Label>
                        <div className="relative">
                          <Input
                            id="weight"
                            type="number"
                            step="0.01"
                            min="0"
                            max="500"
                            placeholder="Ej: 75.5"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="text-2xl h-14 bg-background/50 border-border text-center font-bold"
                            disabled={weightLoading}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                            kg
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weightNotes" className="text-text-secondary">
                          Notas (opcional)
                        </Label>
                        <Input
                          id="weightNotes"
                          placeholder="Ej: Después de entrenar"
                          value={weightNotes}
                          onChange={(e) => setWeightNotes(e.target.value)}
                          className="bg-background/50 border-border"
                          disabled={weightLoading}
                        />
                      </div>

                      <Button
                        onClick={handleWeightSubmit}
                        disabled={!weight || weightLoading || checkingWeight}
                        className="w-full h-12 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold"
                      >
                        {weightLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : existingWeight ? (
                          <>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Actualizar Peso
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Registrar Peso
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-surface/50 border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-text-secondary">
                    💡 <strong>Tip:</strong> Pesate siempre a la misma hora, idealmente en ayunas y después de ir al baño.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center">
                      <Footprints className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-text">Pasos de hoy</h2>
                        {checkingSteps && (
                          <Loader2 className="w-4 h-4 text-accent animate-spin" />
                        )}
                        {!checkingSteps && existingSteps && (
                          <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Ya registrado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted font-normal">
                        {new Date().toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stepsSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <p className="text-lg font-semibold text-text">
                        {parseInt(steps).toLocaleString()} pasos registrados
                      </p>
                      <p className="text-sm text-text-muted">Redirigiendo...</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="steps" className="text-text-secondary">
                          Cantidad de pasos
                        </Label>
                        <div className="relative">
                          <Input
                            id="steps"
                            type="number"
                            min="0"
                            max="100000"
                            placeholder="Ej: 8500"
                            value={steps}
                            onChange={(e) => setSteps(e.target.value)}
                            className="text-2xl h-14 bg-background/50 border-border text-center font-bold"
                            disabled={stepsLoading}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                            pasos
                          </span>
                        </div>
                      </div>

                      {student?.dailyStepsGoal && (
                        <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
                          <span>Meta diaria:</span>
                          <span className="font-semibold text-accent">
                            {student.dailyStepsGoal.toLocaleString()} pasos
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="stepsNotes" className="text-text-secondary">
                          Notas (opcional)
                        </Label>
                        <Input
                          id="stepsNotes"
                          placeholder="Ej: Caminata por el parque"
                          value={stepsNotes}
                          onChange={(e) => setStepsNotes(e.target.value)}
                          className="bg-background/50 border-border"
                          disabled={stepsLoading}
                        />
                      </div>

                      <Button
                        onClick={handleStepsSubmit}
                        disabled={!steps || stepsLoading || checkingSteps}
                        className="w-full h-12 bg-gradient-to-r from-accent to-success text-black font-semibold"
                      >
                        {stepsLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : existingSteps ? (
                          <>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Actualizar Pasos
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Registrar Pasos
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-surface/50 border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-text-secondary">
                    💡 <strong>Tip:</strong> Podés ver los pasos en tu celular (Samsung Health, Google Fit, Apple Health) o smartwatch.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

