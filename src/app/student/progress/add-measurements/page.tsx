"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { addAnthropometry, getAnthropometryById, updateAnthropometry, type Anthropometry, type AnthropometryInput } from "@/lib/api/health";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { AnimatePresence, motion } from "framer-motion";
import {
    Activity,
    Calculator,
    Camera,
    Check,
    ChevronRight,
    Cloud,
    CloudOff,
    FileEdit,
    ImageIcon,
    Loader2,
    Ruler,
    Save,
    Scale,
    Send,
    Trash2,
    User,
    X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Key para localStorage
const DRAFT_STORAGE_KEY = "anthropometry_draft";

// Componente de input de medida FUERA del componente principal para evitar re-renders
const MeasureInput = ({
  label,
  value,
  onChange,
  unit = "cm",
  placeholder = "0.0",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <Label className="text-xs text-text-muted">{label}</Label>
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(",", "."))}
        placeholder={placeholder}
        className="pr-10 text-right"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
        {unit}
      </span>
    </div>
  </div>
);

// Tipos de fotos
type PhotoType = "front" | "side" | "back";

interface PhotoPreview {
  file: File;
  preview: string;
}

// Obtener fecha de hoy en formato yyyy-mm-dd
const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Convertir yyyy-mm-dd a dd/mm/aaaa para mostrar
const formatToDisplay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// Interfaz del borrador
interface DraftData {
  date: string;
  basicos: typeof initialBasicos;
  perimetros: typeof initialPerimetros;
  pliegues: typeof initialPliegues;
  photosPreviews: Record<PhotoType, string | null>;
  notes: string;
  lastSaved: string;
}

// Estados iniciales
const initialBasicos = {
  peso: "",
  talla: "",
};

const initialPerimetros = {
  cabeza: "",
  brazoRelajado: "",
  brazoContraido: "",
  antebrazo: "",
  toraxMesoesternal: "",
  cintura: "",
  ombligo: "",
  caderas: "",
  musloSuperior: "",
  musloMedial: "",
  pantorrilla: "",
};

const initialPliegues = {
  triceps: "",
  biceps: "",
  subescapular: "",
  crestaIliaca: "",
  supraespinal: "",
  abdominal: "",
  musloMedial: "",
  pantorrilla: "",
};

const initialComposicion = {
  tejidoMuscularKg: "",
  tejidoMuscularPct: "",
  tejidoAdiposoKg: "",
  tejidoAdipodoPct: "",
};

export default function AddMeasurementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { student } = useAuthStore();
  const [activeTab, setActiveTab] = useState("basic");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dateDisplay, setDateDisplay] = useState(formatToDisplay(getTodayLocal()));
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Modo edición
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [editData, setEditData] = useState<Anthropometry | null>(null);

  // Estados del borrador
  const [isDraft, setIsDraft] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);

  // Estado de fotos
  const [photos, setPhotos] = useState<Record<PhotoType, PhotoPreview | null>>({
    front: null,
    side: null,
    back: null,
  });

  // Datos básicos
  const [basicos, setBasicos] = useState(initialBasicos);

  // Estado de medidas - Perímetros
  const [perimetros, setPerimetros] = useState(initialPerimetros);

  // Estado de medidas - Pliegues
  const [pliegues, setPliegues] = useState(initialPliegues);
  const [composicion, setComposicion] = useState(initialComposicion);

  // Notas
  const [notes, setNotes] = useState("");

  // Cargar datos para edición
  useEffect(() => {
    if (isEditMode && editId) {
      setLoadingEdit(true);
      getAnthropometryById(parseInt(editId))
        .then((data) => {
          setEditData(data);
          // Cargar la fecha
          if (data.date) {
            const dateStr = typeof data.date === 'string' ? data.date.split('T')[0] : data.date;
            setDateDisplay(formatToDisplay(dateStr));
          }
          // Cargar básicos
          setBasicos({
            peso: data.weight?.toString() || "",
            talla: data.heightCm?.toString() || "",
          });
          // Cargar perímetros
          setPerimetros({
            cabeza: data.perimetroCabeza?.toString() || "",
            brazoRelajado: data.perimetroBrazoRelajado?.toString() || "",
            brazoContraido: data.perimetroBrazoContraido?.toString() || "",
            antebrazo: data.perimetroAntebrazo?.toString() || "",
            toraxMesoesternal: data.perimetroTorax?.toString() || "",
            cintura: data.perimetroCintura?.toString() || "",
            ombligo: data.perimetroOmbligo?.toString() || "",
            caderas: data.perimetroCaderas?.toString() || "",
            musloSuperior: data.perimetroMusloSuperior?.toString() || "",
            musloMedial: data.perimetroMusloMedial?.toString() || "",
            pantorrilla: data.perimetroPantorrilla?.toString() || "",
          });
          // Cargar pliegues
          setPliegues({
            triceps: data.pliegueTriceps?.toString() || "",
            biceps: (data as any).pliegueBiceps?.toString() || "",
            subescapular: data.pliegueSubescapular?.toString() || "",
            crestaIliaca: (data as any).pliegueCrestaIliaca?.toString() || "",
            supraespinal: data.pliegueSupraespinal?.toString() || "",
            abdominal: data.pliegueAbdominal?.toString() || "",
            musloMedial: data.pliegueMusloMedial?.toString() || "",
            pantorrilla: data.plieguePantorrilla?.toString() || "",
          });
          // Cargar composición
          setComposicion({
            tejidoMuscularKg: (data as any).tejidoMuscularKg?.toString() || "",
            tejidoMuscularPct: (data as any).tejidoMuscularPct?.toString() || "",
            tejidoAdiposoKg: (data as any).tejidoAdiposoKg?.toString() || "",
            tejidoAdipodoPct: (data as any).tejidoAdipodoPct?.toString() || "",
          });
          // Cargar notas
          setNotes(data.notes || "");
          // Cargar fotos existentes (URLs, no base64)
          if (data.photoFront || data.photoSide || data.photoBack) {
            setPhotos({
              front: data.photoFront ? { file: new File([], "existing"), preview: data.photoFront } : null,
              side: data.photoSide ? { file: new File([], "existing"), preview: data.photoSide } : null,
              back: data.photoBack ? { file: new File([], "existing"), preview: data.photoBack } : null,
            });
          }
        })
        .catch((err) => {
          console.error("Error loading anthropometry:", err);
          toast.error("Error al cargar los datos");
          router.push("/student/progress/measurements");
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [isEditMode, editId, router]);

  // Guardar borrador en localStorage
  const saveDraft = useCallback(() => {
    if (!student?.id) return;
    
    const draftData: DraftData = {
      date: dateDisplay,
      basicos,
      perimetros,
      pliegues,
      photosPreviews: {
        front: photos.front?.preview || null,
        side: photos.side?.preview || null,
        back: photos.back?.preview || null,
      },
      notes,
      lastSaved: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`${DRAFT_STORAGE_KEY}_${student.id}`, JSON.stringify(draftData));
      setLastSavedTime(new Date());
      setAutoSaveStatus("saved");
    } catch {
      setAutoSaveStatus("error");
    }
  }, [student?.id, dateDisplay, basicos, perimetros, pliegues, photos, notes]);

  // Cargar borrador desde localStorage
  const loadDraft = useCallback(() => {
    if (!student?.id) return null;
    
    try {
      const saved = localStorage.getItem(`${DRAFT_STORAGE_KEY}_${student.id}`);
      if (saved) {
        return JSON.parse(saved) as DraftData;
      }
    } catch {
      console.error("Error loading draft");
    }
    return null;
  }, [student?.id]);

  // Eliminar borrador
  const deleteDraft = useCallback(() => {
    if (!student?.id) return;
    localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${student.id}`);
    setIsDraft(true);
    setLastSavedTime(null);
    setAutoSaveStatus("idle");
  }, [student?.id]);

  // Aplicar borrador a los estados
  const applyDraft = useCallback((draft: DraftData) => {
    setDateDisplay(draft.date);
    setBasicos(draft.basicos);
    setPerimetros(draft.perimetros);
    setPliegues(draft.pliegues);
    setNotes(draft.notes);
    
    // Restaurar previews de fotos (sin el File original, pero con la preview)
    const restoredPhotos: Record<PhotoType, PhotoPreview | null> = {
      front: null,
      side: null,
      back: null,
    };
    
    if (draft.photosPreviews.front) {
      restoredPhotos.front = { file: new File([], "restored"), preview: draft.photosPreviews.front };
    }
    if (draft.photosPreviews.side) {
      restoredPhotos.side = { file: new File([], "restored"), preview: draft.photosPreviews.side };
    }
    if (draft.photosPreviews.back) {
      restoredPhotos.back = { file: new File([], "restored"), preview: draft.photosPreviews.back };
    }
    
    setPhotos(restoredPhotos);
    setLastSavedTime(new Date(draft.lastSaved));
    setAutoSaveStatus("saved");
  }, []);

  // Verificar si hay un borrador al cargar (solo si no estamos editando)
  useEffect(() => {
    if (isEditMode) return; // No mostrar diálogo de borrador en modo edición
    
    const draft = loadDraft();
    if (draft) {
      setPendingDraft(draft);
      setShowDraftDialog(true);
    }
  }, [loadDraft, isEditMode]);

  // Auto-guardar cuando cambien los datos (debounced)
  useEffect(() => {
    // Solo guardar si hay datos
    const hasAnyData = 
      Object.values(basicos).some(v => v !== "") ||
      Object.values(perimetros).some(v => v !== "") ||
      Object.values(pliegues).some(v => v !== "") ||
      Object.values(photos).some(p => p !== null) ||
      notes !== "";

    if (!hasAnyData) return;

    setAutoSaveStatus("saving");
    
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 1500); // Guardar después de 1.5 segundos de inactividad

    return () => clearTimeout(timeoutId);
  }, [basicos, perimetros, pliegues, photos, notes, dateDisplay, saveDraft]);

  // Refs para inputs de archivo (galería)
  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  // Refs para inputs de cámara
  const cameraInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  // Estado para mostrar menú de selección de foto
  const [photoMenuOpen, setPhotoMenuOpen] = useState<PhotoType | null>(null);

  // Calcular suma de pliegues (Σ6 y Σ8)
  const sumasPliegues = useMemo(() => {
    // Σ6: Los 6 pliegues clásicos
    const valores6 = [
      pliegues.triceps,
      pliegues.subescapular,
      pliegues.supraespinal,
      pliegues.abdominal,
      pliegues.musloMedial,
      pliegues.pantorrilla,
    ]
      .map((v) => parseFloat(v) || 0)
      .filter((v) => v > 0);

    // Σ8: Los 8 pliegues (incluye bíceps y cresta ilíaca)
    const valores8 = [
      pliegues.triceps,
      pliegues.biceps,
      pliegues.subescapular,
      pliegues.crestaIliaca,
      pliegues.supraespinal,
      pliegues.abdominal,
      pliegues.musloMedial,
      pliegues.pantorrilla,
    ]
      .map((v) => parseFloat(v) || 0)
      .filter((v) => v > 0);

    return {
      suma6: valores6.length > 0 ? valores6.reduce((a, b) => a + b, 0) : null,
      suma8: valores8.length > 0 ? valores8.reduce((a, b) => a + b, 0) : null,
      count6: valores6.length,
      count8: valores8.length,
    };
  }, [pliegues]);


  // Manejar selección de foto
  const handlePhotoSelect = (type: PhotoType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((prev) => ({
        ...prev,
        [type]: {
          file,
          preview: reader.result as string,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  // Eliminar foto
  const removePhoto = (type: PhotoType) => {
    setPhotos((prev) => ({
      ...prev,
      [type]: null,
    }));
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current.value = "";
    }
  };

  // Verificar si hay datos para guardar
  const hasData = () => {
    const hasPhotos = Object.values(photos).some((p) => p !== null);
    const hasBasicos = Object.values(basicos).some((v) => v !== "");
    const hasPerimetros = Object.values(perimetros).some((v) => v !== "");
    const hasPliegues = Object.values(pliegues).some((v) => v !== "");
    return hasPhotos || hasBasicos || hasPerimetros || hasPliegues;
  };

  // Contar datos ingresados por sección
  const getCounts = () => {
    return {
      photos: Object.values(photos).filter((p) => p !== null).length,
      basicos: Object.values(basicos).filter((v) => v !== "").length,
      perimetros: Object.values(perimetros).filter((v) => v !== "").length,
      pliegues: Object.values(pliegues).filter((v) => v !== "").length,
    };
  };

  const counts = getCounts();

  // Guardar borrador manualmente
  const handleSaveDraft = async () => {
    if (!student?.id) return;

    if (!hasData()) {
      toast.error("Agregá al menos un dato o foto");
      return;
    }

    setSaving(true);

    // Simular guardado
    await new Promise((resolve) => setTimeout(resolve, 800));
    saveDraft();

    toast.success("Borrador guardado 💾", {
      description: "Podés continuar más tarde",
    });
    setSaving(false);
  };

  // Convertir fecha de display (dd/mm/yyyy) a ISO (yyyy-mm-dd)
  const displayToIso = (display: string): string => {
    const [day, month, year] = display.split("/");
    return `${year}-${month}-${day}`;
  };

  // Publicar medición (guardar definitivamente en el backend)
  const handlePublish = async () => {
    if (!student?.id) return;

    if (!hasData()) {
      toast.error("Agregá al menos un dato o foto");
      return;
    }

    setPublishing(true);

    try {
      // Preparar los datos para enviar al backend
      const measurementData: AnthropometryInput = {
        date: displayToIso(dateDisplay),
        status: "published",
        // Datos básicos
        weight: basicos.peso ? parseFloat(basicos.peso) : undefined,
        heightCm: basicos.talla ? parseFloat(basicos.talla) : undefined,
        // Perímetros
        perimetroCabeza: perimetros.cabeza ? parseFloat(perimetros.cabeza) : undefined,
        perimetroBrazoRelajado: perimetros.brazoRelajado ? parseFloat(perimetros.brazoRelajado) : undefined,
        perimetroBrazoContraido: perimetros.brazoContraido ? parseFloat(perimetros.brazoContraido) : undefined,
        perimetroAntebrazo: perimetros.antebrazo ? parseFloat(perimetros.antebrazo) : undefined,
        perimetroTorax: perimetros.toraxMesoesternal ? parseFloat(perimetros.toraxMesoesternal) : undefined,
        perimetroCintura: perimetros.cintura ? parseFloat(perimetros.cintura) : undefined,
        perimetroOmbligo: perimetros.ombligo ? parseFloat(perimetros.ombligo) : undefined,
        perimetroCaderas: perimetros.caderas ? parseFloat(perimetros.caderas) : undefined,
        perimetroMusloSuperior: perimetros.musloSuperior ? parseFloat(perimetros.musloSuperior) : undefined,
        perimetroMusloMedial: perimetros.musloMedial ? parseFloat(perimetros.musloMedial) : undefined,
        perimetroPantorrilla: perimetros.pantorrilla ? parseFloat(perimetros.pantorrilla) : undefined,
        // Pliegues
        pliegueTriceps: pliegues.triceps ? parseFloat(pliegues.triceps) : undefined,
        pliegueBiceps: pliegues.biceps ? parseFloat(pliegues.biceps) : undefined,
        pliegueSubescapular: pliegues.subescapular ? parseFloat(pliegues.subescapular) : undefined,
        pliegueCrestaIliaca: pliegues.crestaIliaca ? parseFloat(pliegues.crestaIliaca) : undefined,
        pliegueSupraespinal: pliegues.supraespinal ? parseFloat(pliegues.supraespinal) : undefined,
        pliegueAbdominal: pliegues.abdominal ? parseFloat(pliegues.abdominal) : undefined,
        pliegueMusloMedial: pliegues.musloMedial ? parseFloat(pliegues.musloMedial) : undefined,
        plieguePantorrilla: pliegues.pantorrilla ? parseFloat(pliegues.pantorrilla) : undefined,
        // Composición corporal (carga manual)
        tejidoMuscularKg: composicion.tejidoMuscularKg ? parseFloat(composicion.tejidoMuscularKg) : undefined,
        tejidoMuscularPct: composicion.tejidoMuscularPct ? parseFloat(composicion.tejidoMuscularPct) : undefined,
        tejidoAdiposoKg: composicion.tejidoAdiposoKg ? parseFloat(composicion.tejidoAdiposoKg) : undefined,
        tejidoAdipodoPct: composicion.tejidoAdipodoPct ? parseFloat(composicion.tejidoAdipodoPct) : undefined,
        // Notas
        notes: notes || undefined,
      };

      // Si estamos editando, verificar si las fotos cambiaron
      // Solo enviar fotos si son nuevas (base64) o si queremos mantener las existentes
      if (isEditMode && editData) {
        // Si la foto es una URL de Cloudinary (no base64), no la enviamos para no resubirla
        const isBase64 = (str: string | undefined) => str?.startsWith('data:image/');
        measurementData.photoFront = isBase64(photos.front?.preview) ? photos.front?.preview : (photos.front?.preview || undefined);
        measurementData.photoSide = isBase64(photos.side?.preview) ? photos.side?.preview : (photos.side?.preview || undefined);
        measurementData.photoBack = isBase64(photos.back?.preview) ? photos.back?.preview : (photos.back?.preview || undefined);
        
        // Actualizar medición existente
        await updateAnthropometry(parseInt(editId!), measurementData);
        toast.success("¡Medición actualizada! ✏️", {
          description: "Los cambios se guardaron correctamente",
        });
      } else {
        // Fotos en base64 (se suben a Cloudinary en el backend)
        measurementData.photoFront = photos.front?.preview || undefined;
        measurementData.photoSide = photos.side?.preview || undefined;
        measurementData.photoBack = photos.back?.preview || undefined;
        
        // Crear nueva medición
        await addAnthropometry(student.id, measurementData);
        
        // Eliminar el borrador local después de publicar
        deleteDraft();
        
        toast.success("¡Medición publicada! 📏", {
          description: "Ya está visible en tu historial",
        });
      }
      
      setIsDraft(false);
      router.push("/student/progress/measurements");
    } catch (error) {
      console.error("Error publicando medición:", error);
      toast.error("Error al guardar", {
        description: "Intentá de nuevo más tarde",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Descartar borrador y empezar de nuevo
  const handleDiscardDraft = () => {
    deleteDraft();
    setBasicos(initialBasicos);
    setPerimetros(initialPerimetros);
    setPliegues(initialPliegues);
    setPhotos({ front: null, side: null, back: null });
    setNotes("");
    setDateDisplay(formatToDisplay(getTodayLocal()));
    setShowDiscardDialog(false);
    toast.info("Borrador descartado");
  };

  // Componente de upload de foto
  const PhotoUpload = ({ type, label }: { type: PhotoType; label: string }) => {
    const photo = photos[type];
    const isMenuOpen = photoMenuOpen === type;

    return (
      <div className="flex flex-col items-center gap-2 relative">
        {/* Input para galería */}
        <input
          ref={fileInputRefs[type]}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handlePhotoSelect(type, e);
            setPhotoMenuOpen(null);
          }}
        />
        {/* Input para cámara */}
        <input
          ref={cameraInputRefs[type]}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handlePhotoSelect(type, e);
            setPhotoMenuOpen(null);
          }}
        />

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative w-28 h-36 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all",
            photo
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 bg-surface/50"
          )}
          onClick={() => {
            if (photo) {
              // Si ya hay foto, abrir menú para reemplazar
              setPhotoMenuOpen(isMenuOpen ? null : type);
            } else {
              // Si no hay foto, mostrar menú de opciones
              setPhotoMenuOpen(isMenuOpen ? null : type);
            }
          }}
        >
          {photo ? (
            <>
              <img
                src={photo.preview}
                alt={label}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(type);
                  setPhotoMenuOpen(null);
                }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1">
                <p className="text-xs text-white text-center">{label}</p>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                <Camera className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-xs text-text-muted text-center">{label}</p>
            </div>
          )}
        </motion.div>

        {/* Menú de selección */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Overlay para cerrar el menú */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setPhotoMenuOpen(null)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full mt-2 z-50 bg-surface border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px]"
              >
                <button
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 flex items-center gap-3 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRefs[type].current?.click();
                  }}
                >
                  <Camera className="w-5 h-5 text-primary" />
                  <span>Tomar foto</span>
                </button>
                <div className="border-t border-border" />
                <button
                  className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 flex items-center gap-3 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRefs[type].current?.click();
                  }}
                >
                  <ImageIcon className="w-5 h-5 text-accent" />
                  <span>Elegir de galería</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Componente de input de medida

  const photosCount = Object.values(photos).filter((p) => p !== null).length;

  // Loading state para modo edición
  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cargando..." backHref="/student/progress/measurements" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title={isEditMode ? "Editar Medición" : "Nueva Medición"} 
        backHref="/student/progress/measurements" 
      />

      <div className="px-4 py-4 space-y-4">
        {/* Fecha */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Label className="text-text-muted">Fecha de medición</Label>
              <div
                className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                onClick={() => dateInputRef.current?.showPicker()}
              >
                <span className="text-text font-medium">{dateDisplay}</span>
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <input
                  ref={dateInputRef}
                  type="date"
                  value={displayToIso(dateDisplay)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateDisplay(formatToDisplay(e.target.value));
                    }
                  }}
                  max={getTodayLocal()}
                  className="absolute opacity-0 w-0 h-0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de contenido */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-surface border border-border">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs gap-1 px-2"
            >
              <Scale className="w-3 h-3" />
              <span className="hidden sm:inline">Básico</span>
              {counts.basicos > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 text-[10px] bg-success">{counts.basicos}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="data-[state=active]:bg-accent data-[state=active]:text-black text-xs gap-1 px-2"
            >
              <Camera className="w-3 h-3" />
              <span className="hidden sm:inline">Fotos</span>
              {photosCount > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 text-[10px] bg-success">{photosCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="perimetros"
              className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs gap-1 px-2"
            >
              <Ruler className="w-3 h-3" />
              <span className="hidden sm:inline">Perím.</span>
              {counts.perimetros > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 text-[10px] bg-success">{counts.perimetros}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="pliegues"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-xs gap-1 px-2"
            >
              <Activity className="w-3 h-3" />
              <span className="hidden sm:inline">Plieg.</span>
              {counts.pliegues > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 text-[10px] bg-success">{counts.pliegues}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Básico */}
          <TabsContent value="basic" className="mt-4 space-y-4">
            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-text-secondary flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Datos Básicos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Peso corporal"
                    value={basicos.peso}
                    onChange={(v) => setBasicos((p) => ({ ...p, peso: v }))}
                    unit="kg"
                  />
                  <MeasureInput
                    label="Talla (altura)"
                    value={basicos.talla}
                    onChange={(v) => setBasicos((p) => ({ ...p, talla: v }))}
                    unit="cm"
                  />
                </div>

              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm text-text-muted">
                  💡 <strong className="text-text">Tip:</strong> Pesate siempre a la misma hora,
                  preferiblemente en ayunas, para obtener mediciones consistentes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Fotos */}
          <TabsContent value="photos" className="mt-4">
            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-text-secondary flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Fotos de Progreso
                </CardTitle>
                <p className="text-xs text-text-muted">
                  Subí fotos desde tu cámara o galería (opcional)
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex justify-center gap-4">
                  <PhotoUpload type="front" label="Frente" />
                  <PhotoUpload type="side" label="Lateral" />
                  <PhotoUpload type="back" label="Espalda" />
                </div>

                <div className="mt-6 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs text-text-muted">
                    💡 <strong className="text-text">Tips para mejores fotos:</strong>
                  </p>
                  <ul className="text-xs text-text-muted mt-2 space-y-1 list-disc list-inside">
                    <li>Misma pose y lugar cada vez</li>
                    <li>Buena iluminación (natural si es posible)</li>
                    <li>Ropa ajustada o similar cada medición</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Perímetros */}
          <TabsContent value="perimetros" className="mt-4 space-y-4">
            {/* Título de sección */}
            <div className="flex items-center gap-2 px-1">
              <Ruler className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-text">Perímetros</h2>
            </div>

            {/* Tren Superior */}
            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400">
                  Tren Superior
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Brazo relajado"
                    value={perimetros.brazoRelajado}
                    onChange={(v) => setPerimetros((p) => ({ ...p, brazoRelajado: v }))}
                  />
                  <MeasureInput
                    label="Brazo contraído"
                    value={perimetros.brazoContraido}
                    onChange={(v) => setPerimetros((p) => ({ ...p, brazoContraido: v }))}
                  />
                  <MeasureInput
                    label="Antebrazo"
                    value={perimetros.antebrazo}
                    onChange={(v) => setPerimetros((p) => ({ ...p, antebrazo: v }))}
                  />
                  <MeasureInput
                    label="Tórax mesoesternal"
                    value={perimetros.toraxMesoesternal}
                    onChange={(v) => setPerimetros((p) => ({ ...p, toraxMesoesternal: v }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Zona Media */}
            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400">
                  Zona Media
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Cintura (mínima)"
                    value={perimetros.cintura}
                    onChange={(v) => setPerimetros((p) => ({ ...p, cintura: v }))}
                  />
                  <MeasureInput
                    label="Onfálico (ombligo)"
                    value={perimetros.ombligo}
                    onChange={(v) => setPerimetros((p) => ({ ...p, ombligo: v }))}
                  />
                  <MeasureInput
                    label="Caderas (máxima)"
                    value={perimetros.caderas}
                    onChange={(v) => setPerimetros((p) => ({ ...p, caderas: v }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tren Inferior */}
            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400">
                  Tren Inferior
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Muslo superior"
                    value={perimetros.musloSuperior}
                    onChange={(v) => setPerimetros((p) => ({ ...p, musloSuperior: v }))}
                  />
                  <MeasureInput
                    label="Muslo medial"
                    value={perimetros.musloMedial}
                    onChange={(v) => setPerimetros((p) => ({ ...p, musloMedial: v }))}
                  />
                  <MeasureInput
                    label="Pantorrilla (máx)"
                    value={perimetros.pantorrilla}
                    onChange={(v) => setPerimetros((p) => ({ ...p, pantorrilla: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Pliegues */}
          <TabsContent value="pliegues" className="mt-4 space-y-4">
            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-400">
                  Pliegues Cutáneos (8 sitios)
                </CardTitle>
                <p className="text-xs text-text-muted">
                  Medidos con plicómetro - Para cálculo de % grasa
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Tríceps"
                    value={pliegues.triceps}
                    onChange={(v) => setPliegues((p) => ({ ...p, triceps: v }))}
                    unit="mm"
                  />
                  <MeasureInput
                    label="Bíceps"
                    value={pliegues.biceps}
                    onChange={(v) => setPliegues((p) => ({ ...p, biceps: v }))}
                    unit="mm"
                  />
                  <MeasureInput
                    label="Subescapular"
                    value={pliegues.subescapular}
                    onChange={(v) => setPliegues((p) => ({ ...p, subescapular: v }))}
                    unit="mm"
                  />
                  <MeasureInput
                    label="Cresta ilíaca"
                    value={pliegues.crestaIliaca}
                    onChange={(v) => setPliegues((p) => ({ ...p, crestaIliaca: v }))}
                    unit="mm"
                  />
                  <MeasureInput
                    label="Supraespinal"
                    value={pliegues.supraespinal}
                    onChange={(v) => setPliegues((p) => ({ ...p, supraespinal: v }))}
                    unit="mm"
                  />
                  <MeasureInput
                    label="Abdominal"
                    value={pliegues.abdominal}
                    onChange={(v) => setPliegues((p) => ({ ...p, abdominal: v }))}
                    unit="mm"
                  />
                  <MeasureInput
                    label="Muslo medial"
                    value={pliegues.musloMedial}
                    onChange={(v) => setPliegues((p) => ({ ...p, musloMedial: v }))}
                    unit="mm"
                  />
                  <MeasureInput
                    label="Pantorrilla"
                    value={pliegues.pantorrilla}
                    onChange={(v) => setPliegues((p) => ({ ...p, pantorrilla: v }))}
                    unit="mm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Suma de pliegues (calculado automático) */}
            {(sumasPliegues.suma6 !== null || sumasPliegues.suma8 !== null) && (
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {sumasPliegues.suma6 !== null && (
                      <div className="text-center p-3 rounded-lg bg-background/50">
                        <p className="text-2xl font-bold text-orange-400">{sumasPliegues.suma6.toFixed(1)} mm</p>
                        <p className="text-xs text-text-muted">Σ6 pliegues</p>
                      </div>
                    )}
                    {sumasPliegues.suma8 !== null && sumasPliegues.count8 > sumasPliegues.count6 && (
                      <div className="text-center p-3 rounded-lg bg-background/50">
                        <p className="text-2xl font-bold text-orange-300">{sumasPliegues.suma8.toFixed(1)} mm</p>
                        <p className="text-xs text-text-muted">Σ8 pliegues</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Composición Corporal (carga manual) */}
            <Card className="bg-green-500/10 border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-400">
                  <Calculator className="w-4 h-4" />
                  Composición Corporal
                </CardTitle>
                <p className="text-xs text-text-muted">
                  Valores calculados externamente (opcional)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Tejido Muscular"
                    value={composicion.tejidoMuscularKg}
                    onChange={(v) => setComposicion((p) => ({ ...p, tejidoMuscularKg: v }))}
                    unit="kg"
                  />
                  <MeasureInput
                    label="Tejido Muscular"
                    value={composicion.tejidoMuscularPct}
                    onChange={(v) => setComposicion((p) => ({ ...p, tejidoMuscularPct: v }))}
                    unit="%"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Tejido Adiposo"
                    value={composicion.tejidoAdiposoKg}
                    onChange={(v) => setComposicion((p) => ({ ...p, tejidoAdiposoKg: v }))}
                    unit="kg"
                  />
                  <MeasureInput
                    label="Tejido Adiposo"
                    value={composicion.tejidoAdipodoPct}
                    onChange={(v) => setComposicion((p) => ({ ...p, tejidoAdipodoPct: v }))}
                    unit="%"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Notas */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <Label className="text-text-muted text-sm">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Medición post-descanso, buena hidratación..."
              className="mt-2 min-h-[80px]"
            />
          </CardContent>
        </Card>

        {/* Resumen de lo que se va a guardar */}
        {hasData() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-success/10 border-success/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-text">Listo para guardar:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {counts.basicos > 0 && (
                    <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded-full">
                      Peso/Talla
                    </span>
                  )}
                  {photosCount > 0 && (
                    <span className="px-2 py-1 text-xs bg-accent/20 text-accent rounded-full">
                      {photosCount} foto{photosCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {counts.perimetros > 0 && (
                    <span className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                      {counts.perimetros} perímetros
                    </span>
                  )}
                  {counts.pliegues > 0 && (
                    <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full">
                      {counts.pliegues} pliegues
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Estado de auto-guardado */}
        {hasData() && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 rounded-xl bg-surface/80 border border-border"
          >
            <div className="flex items-center gap-2">
              {autoSaveStatus === "saving" && (
                <>
                  <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                  <span className="text-sm text-text-muted">Guardando borrador...</span>
                </>
              )}
              {autoSaveStatus === "saved" && (
                <>
                  <Cloud className="w-4 h-4 text-success" />
                  <span className="text-sm text-success">Borrador guardado</span>
                </>
              )}
              {autoSaveStatus === "error" && (
                <>
                  <CloudOff className="w-4 h-4 text-warning" />
                  <span className="text-sm text-warning">Error al guardar</span>
                </>
              )}
              {autoSaveStatus === "idle" && (
                <>
                  <FileEdit className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-muted">Nuevo borrador</span>
                </>
              )}
            </div>
            
            {lastSavedTime && (
              <span className="text-xs text-text-muted">
                {lastSavedTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </motion.div>
        )}

        {/* Botones de acción */}
        <div className="space-y-3">
          {/* Botón Publicar (principal) */}
          <Button
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold text-lg rounded-xl"
            disabled={!hasData() || publishing || saving}
            onClick={handlePublish}
          >
            {publishing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isEditMode ? "Guardando..." : "Publicando..."}
              </>
            ) : (
              <>
                {isEditMode ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Guardar Cambios
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Publicar Medición
                  </>
                )}
              </>
            )}
          </Button>

          {/* Botones secundarios - solo mostrar en modo crear */}
          {!isEditMode && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12 border-border text-text"
              disabled={!hasData() || saving || publishing}
              onClick={handleSaveDraft}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar borrador
            </Button>
            
            {hasData() && (
              <Button
                variant="outline"
                className="h-12 border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => setShowDiscardDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Dialog para continuar borrador */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-primary" />
              Tenés un borrador guardado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-muted">
              {pendingDraft && (
                <>
                  Guardado el {new Date(pendingDraft.lastSaved).toLocaleDateString("es-AR")} a las{" "}
                  {new Date(pendingDraft.lastSaved).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  <br />
                  ¿Querés continuar donde lo dejaste?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-border text-text"
              onClick={() => {
                deleteDraft();
                setShowDraftDialog(false);
              }}
            >
              Empezar de nuevo
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-black hover:bg-primary-hover"
              onClick={() => {
                if (pendingDraft) {
                  applyDraft(pendingDraft);
                }
                setShowDraftDialog(false);
              }}
            >
              Continuar borrador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para descartar */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              ¿Descartar borrador?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-muted">
              Se eliminarán todos los datos que cargaste. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-text">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleDiscardDraft}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
