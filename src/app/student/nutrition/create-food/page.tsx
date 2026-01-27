"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { createFoodItem } from "@/lib/api/nutrition";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FOOD_CATEGORIES = [
  { value: "carnes_pescados", label: "🥩 Carnes y Pescados", icon: "🥩" },
  { value: "frutas_verduras", label: "🥬 Frutas y Verduras", icon: "🥬" },
  { value: "legumbres", label: "🫘 Legumbres", icon: "🫘" },
  { value: "cereales_varios", label: "🌾 Cereales y Varios", icon: "🌾" },
  { value: "lacteos", label: "🥛 Lácteos", icon: "🥛" },
  { value: "aceites_grasas", label: "🥑 Aceites y Grasas", icon: "🥑" },
  { value: "suplementos", label: "💊 Suplementos", icon: "💊" },
  { value: "otros", label: "📦 Otros", icon: "📦" },
];

export default function CreateFoodPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "otros",
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    fiberPer100g: 0,
    sodiumPer100g: 0,
    portionGrams: 100,
  });

  // Calcular calorías automáticamente: P*4 + C*4 + G*9
  const calculatedCalories = useMemo(() => {
    return Math.round(
      formData.proteinPer100g * 4 +
      formData.carbsPer100g * 4 +
      formData.fatPer100g * 9
    );
  }, [formData.proteinPer100g, formData.carbsPer100g, formData.fatPer100g]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!student?.id) return;

    if (!formData.name.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }

    if (calculatedCalories <= 0) {
      toast.error("Ingresá al menos un macronutriente");
      return;
    }

    setSaving(true);
    try {
      await createFoodItem(student.id, {
        name: formData.name.trim(),
        category: formData.category,
        portionGrams: formData.portionGrams,
        caloriesPer100g: calculatedCalories,
        proteinPer100g: formData.proteinPer100g,
        carbsPer100g: formData.carbsPer100g,
        fatPer100g: formData.fatPer100g,
        fiberPer100g: formData.fiberPer100g,
        sodiumPer100g: formData.sodiumPer100g,
      });
      
      toast.success("Alimento creado exitosamente");
      router.push("/student/nutrition/add-food");
    } catch (error) {
      console.error("Error creating food:", error);
      toast.error("Error al crear el alimento");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    router.push("/student/nutrition/add-food");
  };

  const selectedCategory = FOOD_CATEGORIES.find(c => c.value === formData.category);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Crear alimento" backHref="/student/nutrition/add-food" />

      <Dialog open={showModal} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Nuevo Alimento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-text-muted text-sm">
                Nombre del alimento *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ej: Pollo grillado"
                className="bg-background/50 border-border"
                autoFocus
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label className="text-text-muted text-sm">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange("category", value)}
              >
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span>{selectedCategory?.icon}</span>
                      <span>{selectedCategory?.label.split(" ")[1]}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {FOOD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Macros */}
            <div className="space-y-2">
              <Label className="text-text-muted text-sm">Valores por cada 100g:</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="protein" className="text-xs text-purple-400">
                    Proteínas (g)
                  </Label>
                  <Input
                    id="protein"
                    type="number"
                    step="0.1"
                    value={formData.proteinPer100g || ""}
                    onChange={(e) => handleChange("proteinPer100g", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-background/50 border-border h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="carbs" className="text-xs text-amber-400">
                    Carbos (g)
                  </Label>
                  <Input
                    id="carbs"
                    type="number"
                    step="0.1"
                    value={formData.carbsPer100g || ""}
                    onChange={(e) => handleChange("carbsPer100g", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-background/50 border-border h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fat" className="text-xs text-blue-400">
                    Grasas (g)
                  </Label>
                  <Input
                    id="fat"
                    type="number"
                    step="0.1"
                    value={formData.fatPer100g || ""}
                    onChange={(e) => handleChange("fatPer100g", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-background/50 border-border h-10"
                  />
                </div>
              </div>
              {/* Fibra y Sodio */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1">
                  <Label htmlFor="fiber" className="text-xs text-green-400">
                    Fibra (g)
                  </Label>
                  <Input
                    id="fiber"
                    type="number"
                    step="0.1"
                    value={formData.fiberPer100g || ""}
                    onChange={(e) => handleChange("fiberPer100g", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-background/50 border-border h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sodium" className="text-xs text-cyan-400">
                    Sodio (mg)
                  </Label>
                  <Input
                    id="sodium"
                    type="number"
                    step="1"
                    value={formData.sodiumPer100g || ""}
                    onChange={(e) => handleChange("sodiumPer100g", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-background/50 border-border h-10"
                  />
                </div>
              </div>
            </div>

            {/* Calorías calculadas */}
            <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-text-muted mb-1">Calorías calculadas:</p>
                <p className="text-3xl font-bold text-orange-400">
                  {calculatedCalories} kcal
                </p>
              </CardContent>
            </Card>

            {/* Porción estándar */}
            <div className="space-y-2">
              <Label htmlFor="portion" className="text-text-muted text-sm">
                Porción estándar (g)
              </Label>
              <Input
                id="portion"
                type="number"
                value={formData.portionGrams}
                onChange={(e) => handleChange("portionGrams", parseInt(e.target.value) || 100)}
                placeholder="100"
                className="bg-background/50 border-border"
              />
              <p className="text-xs text-text-muted">
                Porción sugerida para el alumno
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !formData.name.trim() || calculatedCalories <= 0}
                className="flex-1 bg-primary hover:bg-primary-hover text-black"
              >
                {saving ? "Creando..." : "Crear Alimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

