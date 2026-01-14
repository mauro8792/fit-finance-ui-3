"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dumbbell,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Users,
  Calendar,
  Target,
  Loader2,
  Check,
  FolderOpen,
  LayoutTemplate,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Template {
  id: number;
  templateName: string;
  templateDescription?: string;
  templateCategory?: string;
  templateTags?: string;
  objetivo?: string;
  microcyclesCount?: number;
  totalDays?: number;
  totalExercises?: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "fuerza", label: "💪 Fuerza", color: "bg-red-500/20 text-red-400" },
  { value: "hipertrofia", label: "🏋️ Hipertrofia", color: "bg-purple-500/20 text-purple-400" },
  { value: "definicion", label: "🔥 Definición", color: "bg-orange-500/20 text-orange-400" },
  { value: "resistencia", label: "❤️ Resistencia", color: "bg-pink-500/20 text-pink-400" },
  { value: "funcional", label: "⚡ Funcional", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "principiante", label: "🌱 Principiante", color: "bg-green-500/20 text-green-400" },
  { value: "avanzado", label: "🚀 Avanzado", color: "bg-blue-500/20 text-blue-400" },
];

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    templateName: "",
    templateDescription: "",
    templateCategory: "",
    objetivo: "hypertrophy",
    weeksCount: "4",
    daysPerWeek: "4",
  });

  // Delete state
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Duplicating state
  const [duplicating, setDuplicating] = useState<number | null>(null);

  // Ref para evitar duplicados
  const dataFetched = useRef(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.append("category", filterCategory);
      if (searchTerm) params.append("search", searchTerm);

      const { data } = await api.get(`/templates/mesocycles${params.toString() ? `?${params.toString()}` : ""}`);
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dataFetched.current && !searchTerm && !filterCategory) return;
    dataFetched.current = true;
    loadTemplates();
  }, [searchTerm, filterCategory]);

  const handleCreate = async () => {
    if (!formData.templateName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setFormLoading(true);
    try {
      const { data } = await api.post("/templates/mesocycles", {
        templateName: formData.templateName,
        templateDescription: formData.templateDescription,
        templateCategory: formData.templateCategory,
        objetivo: formData.objetivo,
        weeksCount: parseInt(formData.weeksCount) || 4,
        daysPerWeek: parseInt(formData.daysPerWeek) || 4,
      });

      toast.success("Plantilla creada");
      setShowForm(false);
      setFormData({
        templateName: "",
        templateDescription: "",
        templateCategory: "",
        objetivo: "hypertrophy",
        weeksCount: "4",
        daysPerWeek: "4",
      });
      
      // Ir a editar la plantilla
      router.push(`/coach/templates/${data.id}`);
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast.error(error.response?.data?.message || "Error al crear");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    setDeleting(true);
    try {
      await api.delete(`/templates/mesocycles/${deleteTemplate.id}`);
      toast.success("Plantilla eliminada");
      setDeleteTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (template: Template) => {
    setDuplicating(template.id);
    try {
      await api.post(`/templates/mesocycles/${template.id}/duplicate`);
      toast.success("Plantilla duplicada");
      loadTemplates();
    } catch (error) {
      console.error("Error duplicating:", error);
      toast.error("Error al duplicar");
    } finally {
      setDuplicating(null);
    }
  };

  const getCategoryStyle = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.color || "bg-gray-500/20 text-gray-400";
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.label || category;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Mis Plantillas"
        subtitle={`${templates.length} plantillas`}
        backHref="/coach/routines"
      />

      <div className="px-4 py-4 space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardContent className="p-4 text-center">
              <LayoutTemplate className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-text">{templates.length}</p>
              <p className="text-xs text-text-muted">Plantillas</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-text">
                {templates.reduce((acc, t) => acc + (t.microcyclesCount || 0), 0)}
              </p>
              <p className="text-xs text-text-muted">Microciclos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Dumbbell className="w-6 h-6 text-purple-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-text">
                {templates.reduce((acc, t) => acc + (t.totalExercises || 0), 0)}
              </p>
              <p className="text-xs text-text-muted">Ejercicios</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Button
          onClick={() => setShowForm(true)}
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold text-base rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Plantilla
        </Button>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Buscar plantilla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface rounded-xl"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 bg-surface rounded-xl">
              <FolderOpen className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer transition-colors",
              !filterCategory || filterCategory === "all"
                ? "bg-primary/20 text-primary border-primary"
                : "bg-surface text-text-muted"
            )}
            onClick={() => setFilterCategory("")}
          >
            Todas ({templates.length})
          </Badge>
          {CATEGORIES.slice(0, 4).map((cat) => {
            const count = templates.filter((t) => t.templateCategory === cat.value).length;
            if (count === 0) return null;
            return (
              <Badge
                key={cat.value}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  filterCategory === cat.value
                    ? cat.color
                    : "bg-surface text-text-muted hover:bg-surface/80"
                )}
                onClick={() => setFilterCategory(cat.value)}
              >
                {cat.label.split(" ")[0]} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="bg-surface/50 border-border">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-text mb-2">
                Sin plantillas
              </h3>
              <p className="text-text-muted text-sm mb-4">
                Creá tu primera plantilla para reutilizarla con varios alumnos
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-primary text-black">
                <Plus className="w-4 h-4 mr-2" />
                Crear Plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className="bg-surface/60 border-border hover:bg-surface/80 transition-colors cursor-pointer"
                  onClick={() => router.push(`/coach/templates/${template.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                        <LayoutTemplate className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-text truncate">
                            {template.templateName}
                          </h3>
                        </div>
                        
                        {template.templateDescription && (
                          <p className="text-xs text-text-muted line-clamp-1 mb-2">
                            {template.templateDescription}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {template.templateCategory && (
                            <Badge variant="outline" className={cn("text-xs", getCategoryStyle(template.templateCategory))}>
                              {getCategoryLabel(template.templateCategory)}
                            </Badge>
                          )}
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {template.microcyclesCount || 0} micro
                          </span>
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            {template.totalExercises || 0} ej
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(template);
                          }}
                          disabled={duplicating === template.id}
                        >
                          {duplicating === template.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Copy className="w-4 h-4 text-text-muted" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTemplate(template);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-gradient-to-b from-surface to-background border-border p-0">
          <SheetTitle className="sr-only">Nueva Plantilla</SheetTitle>
          <SheetDescription className="sr-only">Crear una nueva plantilla de rutina</SheetDescription>
          
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="w-12 h-1 bg-border/50 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                <LayoutTemplate className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">Nueva Plantilla</h2>
                <p className="text-sm text-text-muted">Creá una rutina reutilizable</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 pb-8 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Nombre */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text">
                Nombre de la plantilla
                <span className="text-red-400 ml-1">*</span>
              </Label>
              <Input
                value={formData.templateName}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                placeholder="Ej: Push Pull Legs 4 días"
                className="h-12 bg-background/50 rounded-xl"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text">
                Descripción
                <span className="text-xs text-text-muted font-normal ml-2">(opcional)</span>
              </Label>
              <Textarea
                value={formData.templateDescription}
                onChange={(e) => setFormData({ ...formData, templateDescription: e.target.value })}
                placeholder="Rutina ideal para..."
                rows={2}
                className="bg-background/50 rounded-xl resize-none"
              />
            </div>

            {/* Categoría */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-text">Categoría</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, templateCategory: cat.value })}
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                      formData.templateCategory === cat.value
                        ? cat.color + " ring-2 ring-offset-2 ring-offset-surface"
                        : "bg-background/50 text-text-muted hover:bg-background border border-border/30"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Objetivo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text">Objetivo</Label>
              <Select
                value={formData.objetivo}
                onValueChange={(v) => setFormData({ ...formData, objetivo: v })}
              >
                <SelectTrigger className="h-12 bg-background/50 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hypertrophy">🏋️ Hipertrofia</SelectItem>
                  <SelectItem value="strength">💪 Fuerza</SelectItem>
                  <SelectItem value="endurance">❤️ Resistencia</SelectItem>
                  <SelectItem value="fat_loss">🔥 Pérdida de grasa</SelectItem>
                  <SelectItem value="maintenance">⚖️ Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estructura */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Microciclos
                </Label>
                <Input
                  type="number"
                  value={formData.weeksCount}
                  onChange={(e) => setFormData({ ...formData, weeksCount: e.target.value })}
                  min={1}
                  max={16}
                  className="h-12 bg-background/50 rounded-xl text-center"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text">
                  <Target className="w-4 h-4 inline mr-1" />
                  Días/microciclo
                </Label>
                <Input
                  type="number"
                  value={formData.daysPerWeek}
                  onChange={(e) => setFormData({ ...formData, daysPerWeek: e.target.value })}
                  min={1}
                  max={7}
                  className="h-12 bg-background/50 rounded-xl text-center"
                />
              </div>
            </div>

            {/* Preview */}
            {formData.templateName && (
              <div className="p-4 rounded-xl bg-background/30 border border-border/30">
                <p className="text-xs text-text-muted uppercase mb-2">Vista previa</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <LayoutTemplate className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">{formData.templateName}</p>
                    <p className="text-xs text-text-muted">
                      {formData.weeksCount} microciclos • {formData.daysPerWeek} días/microciclo
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-black font-semibold"
                disabled={formLoading || !formData.templateName}
                onClick={handleCreate}
              >
                {formLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Crear y Editar
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text">¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-muted">
              Se eliminará "{deleteTemplate?.templateName}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

