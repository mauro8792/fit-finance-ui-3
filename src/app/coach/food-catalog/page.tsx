"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Plus,
  Edit2,
  Trash2,
  UtensilsCrossed,
  Loader2,
  X,
  Download,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCoachFoodItems,
  getCategories,
  createCoachFoodItem,
  updateCoachFoodItem,
  deleteCoachFoodItem,
  initializeCoachCatalog,
  FoodItem,
  FoodCategory,
} from "@/lib/api/nutrition";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  carnes_pescados: "🥩 Carnes y Pescados",
  frutas_verduras: "🥗 Frutas y Verduras",
  legumbres: "🫘 Legumbres",
  cereales_varios: "🌾 Cereales",
  lacteos: "🥛 Lácteos",
  aceites_grasas: "🫒 Aceites y Grasas",
  suplementos: "💊 Suplementos",
  otros: "📦 Otros",
};

const CATEGORY_COLORS: Record<string, string> = {
  carnes_pescados: "bg-red-500/20 text-red-400 border-red-500/30",
  frutas_verduras: "bg-green-500/20 text-green-400 border-green-500/30",
  legumbres: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cereales_varios: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  lacteos: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  aceites_grasas: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  suplementos: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  otros: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function CoachFoodCatalogPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "otros",
    carbsPer100g: "",
    proteinPer100g: "",
    fatPer100g: "",
    portionGrams: "100",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [foodsData, categoriesData] = await Promise.all([
        getCoachFoodItems(),
        getCategories(),
      ]);
      setFoods(foodsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar el catálogo");
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const matchesSearch = food.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || food.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [foods, searchTerm, categoryFilter]);

  const handleOpenModal = (food: FoodItem | null = null) => {
    if (food) {
      setEditingFood(food);
      setFormData({
        name: food.name,
        category: food.category,
        carbsPer100g: String(food.carbsPer100g),
        proteinPer100g: String(food.proteinPer100g),
        fatPer100g: String(food.fatPer100g),
        portionGrams: String(food.portionGrams),
      });
    } else {
      setEditingFood(null);
      setFormData({
        name: "",
        category: "otros",
        carbsPer100g: "",
        proteinPer100g: "",
        fatPer100g: "",
        portionGrams: "100",
      });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingFood(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        carbsPer100g: parseFloat(formData.carbsPer100g) || 0,
        proteinPer100g: parseFloat(formData.proteinPer100g) || 0,
        fatPer100g: parseFloat(formData.fatPer100g) || 0,
        portionGrams: parseInt(formData.portionGrams) || 100,
      };

      if (editingFood) {
        await updateCoachFoodItem(editingFood.id, payload);
        toast.success("Alimento actualizado");
      } else {
        await createCoachFoodItem(payload);
        toast.success("Alimento creado");
      }

      handleCloseModal();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (food: FoodItem) => {
    if (!confirm(`¿Eliminar "${food.name}" del catálogo?`)) return;

    try {
      await deleteCoachFoodItem(food.id);
      toast.success("Alimento eliminado");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar");
    }
  };

  const handleInitialize = async () => {
    if (!confirm("¿Inicializar el catálogo con ~60 alimentos predefinidos?"))
      return;

    try {
      setInitializing(true);
      const result = await initializeCoachCatalog();
      toast.success(`✅ Se crearon ${result.created} alimentos en tu catálogo`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error al inicializar");
    } finally {
      setInitializing(false);
    }
  };

  const calculateCalories = () => {
    const p = parseFloat(formData.proteinPer100g) || 0;
    const c = parseFloat(formData.carbsPer100g) || 0;
    const f = parseFloat(formData.fatPer100g) || 0;
    return (p * 4 + c * 4 + f * 9).toFixed(0);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-500/10 to-background px-4 pt-4 pb-6">
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
            <UtensilsCrossed className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-bold text-text">
              Mi Catálogo de Alimentos
            </h1>
          </div>
        </div>
        <p className="text-sm text-text-muted pl-11">
          Estos alimentos estarán disponibles para{" "}
          <strong className="text-text">todos tus alumnos</strong>
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* Filtros */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Buscar alimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1 bg-background border-border">
                  <Filter className="w-4 h-4 mr-2 text-text-muted" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => handleOpenModal()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuevo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Badge
          variant="outline"
          className="bg-orange-500/10 text-orange-500 border-orange-500/30"
        >
          {filteredFoods.length} alimentos en tu catálogo
        </Badge>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
            <p className="text-text-muted text-sm">Cargando catálogo...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && foods.length === 0 && (
          <Card className="bg-surface/80 border-border border-dashed">
            <CardContent className="py-8 text-center">
              <UtensilsCrossed className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <h3 className="font-semibold text-text mb-1">
                No hay alimentos en tu catálogo
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Agregá alimentos para que tus alumnos los puedan usar
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleInitialize}
                  disabled={initializing}
                >
                  {initializing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {initializing ? "Cargando..." : "🚀 Cargar 60+ alimentos base"}
                </Button>
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-500"
                  onClick={() => handleOpenModal()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Alimentos */}
        {!loading && filteredFoods.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredFoods.map((food, index) => (
                <motion.div
                  key={food.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="bg-surface/80 border-border hover:border-orange-500/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text truncate">
                            {food.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-xs mt-1 ${
                              CATEGORY_COLORS[food.category] ||
                              CATEGORY_COLORS.otros
                            }`}
                          >
                            {CATEGORY_LABELS[food.category]?.split(" ")[0] ||
                              "📦"}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-text-muted hover:text-green-500"
                            onClick={() => handleOpenModal(food)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-text-muted hover:text-red-500"
                            onClick={() => handleDelete(food)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                        <div className="bg-background/50 rounded-lg p-2">
                          <p className="text-xs text-blue-400 font-medium">
                            Prot
                          </p>
                          <p className="text-sm text-text font-semibold">
                            {food.proteinPer100g}g
                          </p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <p className="text-xs text-yellow-400 font-medium">
                            Carbs
                          </p>
                          <p className="text-sm text-text font-semibold">
                            {food.carbsPer100g}g
                          </p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <p className="text-xs text-pink-400 font-medium">
                            Grasas
                          </p>
                          <p className="text-sm text-text font-semibold">
                            {food.fatPer100g}g
                          </p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <p className="text-xs text-text-muted font-medium">
                            Kcal
                          </p>
                          <p className="text-sm text-text font-semibold">
                            {food.caloriesPer100g}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingFood ? "✏️ Editar Alimento" : "➕ Nuevo Alimento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-text-muted">Nombre del alimento *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Pollo grillado"
                className="mt-1 bg-background border-border"
              />
            </div>

            <div>
              <Label className="text-text-muted">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="mt-1 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-orange-500 text-sm font-medium">
                Valores por cada 100g:
              </Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <Label className="text-xs text-blue-400">Proteínas (g)</Label>
                  <Input
                    type="number"
                    value={formData.proteinPer100g}
                    onChange={(e) =>
                      setFormData({ ...formData, proteinPer100g: e.target.value })
                    }
                    placeholder="0"
                    className="mt-1 bg-background border-border text-blue-400"
                  />
                </div>
                <div>
                  <Label className="text-xs text-yellow-400">Carbos (g)</Label>
                  <Input
                    type="number"
                    value={formData.carbsPer100g}
                    onChange={(e) =>
                      setFormData({ ...formData, carbsPer100g: e.target.value })
                    }
                    placeholder="0"
                    className="mt-1 bg-background border-border text-yellow-400"
                  />
                </div>
                <div>
                  <Label className="text-xs text-pink-400">Grasas (g)</Label>
                  <Input
                    type="number"
                    value={formData.fatPer100g}
                    onChange={(e) =>
                      setFormData({ ...formData, fatPer100g: e.target.value })
                    }
                    placeholder="0"
                    className="mt-1 bg-background border-border text-pink-400"
                  />
                </div>
              </div>
            </div>

            <div className="bg-orange-500/10 rounded-lg p-3 text-center">
              <p className="text-xs text-text-muted">Calorías calculadas:</p>
              <p className="text-2xl font-bold text-orange-500">
                {calculateCalories()} kcal
              </p>
            </div>

            <div>
              <Label className="text-text-muted">Porción estándar (g)</Label>
              <Input
                type="number"
                value={formData.portionGrams}
                onChange={(e) =>
                  setFormData({ ...formData, portionGrams: e.target.value })
                }
                className="mt-1 bg-background border-border"
              />
              <p className="text-xs text-text-muted mt-1">
                Porción sugerida para el alumno
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCloseModal}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleSubmit}
                disabled={saving || !formData.name.trim()}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {editingFood ? "Guardar Cambios" : "Crear Alimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

