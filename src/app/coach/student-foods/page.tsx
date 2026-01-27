"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  UtensilsCrossed,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
  Apple,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getStudentCustomFoods,
  StudentCustomFoodsResponse,
  StudentFoodsGroup,
} from "@/lib/api/nutrition";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CATEGORY_LABELS: Record<string, string> = {
  carnes_pescados: "🥩 Carnes",
  frutas_verduras: "🥗 Frutas/Verduras",
  legumbres: "🫘 Legumbres",
  cereales_varios: "🌾 Cereales",
  lacteos: "🥛 Lácteos",
  aceites_grasas: "🫒 Aceites",
  suplementos: "💊 Suplementos",
  otros: "📦 Otros",
};

export default function StudentFoodsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightFoodId = searchParams.get("foodId");
  
  const [data, setData] = useState<StudentCustomFoodsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  // Si viene de una notificación con foodId, expandir el alumno correspondiente
  useEffect(() => {
    if (highlightFoodId && data) {
      const foodIdNum = parseInt(highlightFoodId);
      const studentGroup = data.byStudent.find((g) =>
        g.foods.some((f) => f.id === foodIdNum)
      );
      if (studentGroup) {
        setExpandedStudents((prev) => new Set([...prev, studentGroup.studentId]));
        // Scroll al elemento después de un pequeño delay
        setTimeout(() => {
          const element = document.getElementById(`food-${highlightFoodId}`);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [highlightFoodId, data]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getStudentCustomFoods();
      setData(result);
      
      // Expandir todos por defecto si hay pocos alumnos
      if (result.byStudent.length <= 3) {
        setExpandedStudents(new Set(result.byStudent.map((g) => g.studentId)));
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar los alimentos");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId: number) => {
    setExpandedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-green-500/10 to-background px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Apple className="w-6 h-6 text-green-500" />
            <h1 className="text-xl font-bold text-text">
              Alimentos de Alumnos
            </h1>
          </div>
        </div>
        <p className="text-sm text-text-muted pl-11">
          Alimentos personalizados creados por tus alumnos
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" />
            <p className="text-text-muted text-sm">Cargando...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && data && data.foods.length === 0 && (
          <Card className="bg-surface/80 border-border border-dashed">
            <CardContent className="py-8 text-center">
              <UtensilsCrossed className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <h3 className="font-semibold text-text mb-1">
                Sin alimentos personalizados
              </h3>
              <p className="text-sm text-text-muted">
                Tus alumnos aún no han creado alimentos propios
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {!loading && data && data.foods.length > 0 && (
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/30"
            >
              {data.foods.length} alimentos
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-400 border-blue-500/30"
            >
              {data.byStudent.length} alumnos
            </Badge>
          </div>
        )}

        {/* Lista agrupada por alumno */}
        {!loading && data && data.byStudent.length > 0 && (
          <div className="space-y-3">
            {data.byStudent.map((group) => (
              <StudentFoodGroup
                key={group.studentId}
                group={group}
                isExpanded={expandedStudents.has(group.studentId)}
                onToggle={() => toggleStudent(group.studentId)}
                highlightFoodId={highlightFoodId ? parseInt(highlightFoodId) : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentFoodGroup({
  group,
  isExpanded,
  onToggle,
  highlightFoodId,
}: {
  group: StudentFoodsGroup;
  isExpanded: boolean;
  onToggle: () => void;
  highlightFoodId: number | null;
}) {
  return (
    <Card className="bg-surface/80 border-border overflow-hidden">
      {/* Header del alumno */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface/90 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-text">{group.studentName}</h3>
            <p className="text-xs text-text-muted">
              {group.foods.length} alimento{group.foods.length !== 1 ? "s" : ""} creado{group.foods.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-muted" />
        )}
      </div>

      {/* Lista de alimentos */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-3 space-y-2">
              {group.foods.map((food) => (
                <motion.div
                  key={food.id}
                  id={`food-${food.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border transition-all ${
                    highlightFoodId === food.id
                      ? "bg-green-500/20 border-green-500/50"
                      : "bg-background/50 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-text truncate">
                          {food.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {CATEGORY_LABELS[food.category]?.split(" ")[0] || "📦"}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Creado {format(new Date(food.createdAt), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <div className="bg-surface/80 rounded p-1.5">
                      <p className="text-[10px] text-blue-400 font-medium">Prot</p>
                      <p className="text-xs text-text font-semibold">
                        {food.proteinPer100g}g
                      </p>
                    </div>
                    <div className="bg-surface/80 rounded p-1.5">
                      <p className="text-[10px] text-yellow-400 font-medium">Carbs</p>
                      <p className="text-xs text-text font-semibold">
                        {food.carbsPer100g}g
                      </p>
                    </div>
                    <div className="bg-surface/80 rounded p-1.5">
                      <p className="text-[10px] text-pink-400 font-medium">Grasas</p>
                      <p className="text-xs text-text font-semibold">
                        {food.fatPer100g}g
                      </p>
                    </div>
                    <div className="bg-surface/80 rounded p-1.5">
                      <p className="text-[10px] text-orange-400 font-medium">Kcal</p>
                      <p className="text-xs text-text font-semibold">
                        {food.caloriesPer100g}
                      </p>
                    </div>
                  </div>

                  {/* Fibra y Sodio si están disponibles */}
                  {(food.fiberPer100g || food.sodiumPer100g) && (
                    <div className="flex gap-4 mt-2 text-xs">
                      {food.fiberPer100g && food.fiberPer100g > 0 && (
                        <span className="text-green-400">
                          Fibra: {food.fiberPer100g}g
                        </span>
                      )}
                      {food.sodiumPer100g && food.sodiumPer100g > 0 && (
                        <span className="text-cyan-400">
                          Sodio: {food.sodiumPer100g}mg
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
