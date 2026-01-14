"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getRecipes } from "@/lib/api/nutrition";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  ChefHat,
  Flame,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Recipe {
  id: number;
  name: string;
  description?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  totalGrams: number;
  ingredients?: Array<{
    id: number;
    name: string;
    quantity: number;
  }>;
}

export default function RecipesPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    const loadRecipes = async () => {
      if (!student?.id) return;

      try {
        setLoading(true);
        const data = await getRecipes(student.id);
        setRecipes(data?.value || data || []);
      } catch (error) {
        console.error("Error loading recipes:", error);
        toast.error("Error al cargar las recetas");
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, [student?.id]);

  const handleDelete = async (recipeId: number) => {
    if (!confirm("¿Estás seguro de eliminar esta receta?")) return;

    try {
      setDeleting(recipeId);
      await api.delete(`/nutrition/recipes/${recipeId}`);
      setRecipes(recipes.filter((r) => r.id !== recipeId));
      toast.success("Receta eliminada");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Error al eliminar la receta");
    } finally {
      setDeleting(null);
    }
  };

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Mis Recetas" backHref="/student/nutrition" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Mis Recetas" backHref="/student/nutrition" />

      <div className="px-4 py-4 space-y-4">
        {/* Search & Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar receta..."
              className="pl-10 bg-surface border-border"
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearchTerm("")}
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            )}
          </div>
          <Button
            className="bg-primary text-black font-semibold"
            onClick={() => router.push("/student/nutrition/recipes/new")}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Recipes List */}
        {filteredRecipes.length === 0 ? (
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-8 text-center">
              <ChefHat className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="font-semibold text-text mb-2">
                {searchTerm ? "No se encontraron recetas" : "No tenés recetas"}
              </h3>
              <p className="text-text-muted text-sm mb-4">
                {searchTerm
                  ? "Probá con otro término de búsqueda"
                  : "Creá tu primera receta para agilizar el registro de comidas"}
              </p>
              {!searchTerm && (
                <Button
                  variant="outline"
                  className="border-primary text-primary"
                  onClick={() => router.push("/student/nutrition/recipes/new")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primera receta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-surface/80 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text truncate">
                          {recipe.name}
                        </h3>
                        {recipe.description && (
                          <p className="text-sm text-text-muted line-clamp-2 mt-1">
                            {recipe.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            router.push(`/student/nutrition/recipes/${recipe.id}/edit`)
                          }
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(recipe.id)}
                          disabled={deleting === recipe.id}
                        >
                          {deleting === recipe.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Macros */}
                    <div className="flex gap-2 flex-wrap mb-3">
                      <Badge className="bg-orange-500/20 text-orange-400 border-0">
                        <Flame className="w-3 h-3 mr-1" />
                        {Math.round(recipe.caloriesPer100g)} kcal
                      </Badge>
                      <Badge className="bg-red-500/20 text-red-400 border-0">
                        P: {Math.round(recipe.proteinPer100g)}g
                      </Badge>
                      <Badge className="bg-amber-500/20 text-amber-400 border-0">
                        C: {Math.round(recipe.carbsPer100g)}g
                      </Badge>
                      <Badge className="bg-blue-500/20 text-blue-400 border-0">
                        G: {Math.round(recipe.fatPer100g)}g
                      </Badge>
                    </div>

                    {/* Info */}
                    <p className="text-xs text-text-muted">
                      {recipe.ingredients?.length || 0} ingredientes •{" "}
                      {recipe.totalGrams}g total
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

