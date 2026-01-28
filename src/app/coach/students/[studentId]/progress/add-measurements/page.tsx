"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Camera,
  X,
  Ruler,
  ChevronRight,
  ImageIcon,
  Check,
  Loader2,
  Scale,
  Activity,
  Calculator,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addAnthropometry, updateAnthropometry, getAnthropometryById, type AnthropometryInput, type Anthropometry } from "@/lib/api/health";
import { getStudentById } from "@/lib/api/coach";
import type { Student } from "@/types";

// Componente de input de medida
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

type PhotoType = "front" | "side" | "back";

interface PhotoPreview {
  file: File;
  preview: string;
}

const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatToDisplay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

const initialBasicos = { peso: "", talla: "" };

const initialPerimetros = {
  cabeza: "",
  brazoRelajado: "",
  brazoContraido: "",
  antebrazo: "",
  toraxMesoesternal: "",
  cintura: "",
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

export default function CoachAddMeasurementsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = Number(params.studentId);
  
  const [student, setStudent] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [publishing, setPublishing] = useState(false);
  const [dateDisplay, setDateDisplay] = useState(formatToDisplay(getTodayLocal()));
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Modo edición
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [editData, setEditData] = useState<Anthropometry | null>(null);

  const [photos, setPhotos] = useState<Record<PhotoType, PhotoPreview | null>>({
    front: null,
    side: null,
    back: null,
  });

  const [basicos, setBasicos] = useState(initialBasicos);
  const [perimetros, setPerimetros] = useState(initialPerimetros);
  const [pliegues, setPliegues] = useState(initialPliegues);
  const [composicion, setComposicion] = useState(initialComposicion);
  const [notes, setNotes] = useState("");

  // Cargar datos del estudiante
  useEffect(() => {
    const loadStudent = async () => {
      if (!studentId) return;
      setLoadingStudent(true);
      try {
        const data = await getStudentById(studentId);
        setStudent(data);
      } catch (error) {
        console.error("Error loading student:", error);
        toast.error("Error al cargar datos del estudiante");
      } finally {
        setLoadingStudent(false);
      }
    };
    loadStudent();
  }, [studentId]);

  // Cargar datos para edición
  useEffect(() => {
    if (isEditMode && editId) {
      setLoadingEdit(true);
      getAnthropometryById(parseInt(editId))
        .then((data) => {
          setEditData(data);
          if (data.date) {
            const dateStr = typeof data.date === 'string' ? data.date.split('T')[0] : data.date;
            setDateDisplay(formatToDisplay(dateStr));
          }
          setBasicos({
            peso: data.weight?.toString() || "",
            talla: data.heightCm?.toString() || "",
          });
          setPerimetros({
            cabeza: (data as any).perimetroCabeza?.toString() || "",
            brazoRelajado: data.perimetroBrazoRelajado?.toString() || "",
            brazoContraido: data.perimetroBrazoContraido?.toString() || "",
            antebrazo: data.perimetroAntebrazo?.toString() || "",
            toraxMesoesternal: data.perimetroTorax?.toString() || "",
            cintura: data.perimetroCintura?.toString() || "",
            caderas: data.perimetroCaderas?.toString() || "",
            musloSuperior: data.perimetroMusloSuperior?.toString() || "",
            musloMedial: data.perimetroMusloMedial?.toString() || "",
            pantorrilla: data.perimetroPantorrilla?.toString() || "",
          });
          setPliegues({
            triceps: data.pliegueTriceps?.toString() || "",
            subescapular: data.pliegueSubescapular?.toString() || "",
            supraespinal: data.pliegueSupraespinal?.toString() || "",
            abdominal: data.pliegueAbdominal?.toString() || "",
            musloMedial: data.pliegueMusloMedial?.toString() || "",
            pantorrilla: data.plieguePantorrilla?.toString() || "",
          });
          setComposicion({
            tejidoMuscularKg: (data as any).tejidoMuscularKg?.toString() || "",
            tejidoMuscularPct: (data as any).tejidoMuscularPct?.toString() || "",
            tejidoAdiposoKg: (data as any).tejidoAdiposoKg?.toString() || "",
            tejidoAdipodoPct: (data as any).tejidoAdipodoPct?.toString() || "",
          });
          setNotes(data.notes || "");
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
          router.push(`/coach/students/${studentId}/progress/measurements`);
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [isEditMode, editId, router, studentId]);

  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  const cameraInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

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

  const removePhoto = (type: PhotoType) => {
    setPhotos((prev) => ({
      ...prev,
      [type]: null,
    }));
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current.value = "";
    }
  };

  const hasData = () => {
    const hasPhotos = Object.values(photos).some((p) => p !== null);
    const hasBasicos = Object.values(basicos).some((v) => v !== "");
    const hasPerimetros = Object.values(perimetros).some((v) => v !== "");
    const hasPliegues = Object.values(pliegues).some((v) => v !== "");
    return hasPhotos || hasBasicos || hasPerimetros || hasPliegues;
  };

  const getCounts = () => {
    return {
      photos: Object.values(photos).filter((p) => p !== null).length,
      basicos: Object.values(basicos).filter((v) => v !== "").length,
      perimetros: Object.values(perimetros).filter((v) => v !== "").length,
      pliegues: Object.values(pliegues).filter((v) => v !== "").length,
    };
  };

  const counts = getCounts();

  const displayToIso = (display: string): string => {
    const [day, month, year] = display.split("/");
    return `${year}-${month}-${day}`;
  };

  const handlePublish = async () => {
    if (!studentId) return;

    if (!hasData()) {
      toast.error("Agregá al menos un dato o foto");
      return;
    }

    setPublishing(true);

    try {
      const measurementData: AnthropometryInput = {
        date: displayToIso(dateDisplay),
        status: "published",
        weight: basicos.peso ? parseFloat(basicos.peso) : undefined,
        heightCm: basicos.talla ? parseFloat(basicos.talla) : undefined,
        perimetroCabeza: perimetros.cabeza ? parseFloat(perimetros.cabeza) : undefined,
        perimetroBrazoRelajado: perimetros.brazoRelajado ? parseFloat(perimetros.brazoRelajado) : undefined,
        perimetroBrazoContraido: perimetros.brazoContraido ? parseFloat(perimetros.brazoContraido) : undefined,
        perimetroAntebrazo: perimetros.antebrazo ? parseFloat(perimetros.antebrazo) : undefined,
        perimetroTorax: perimetros.toraxMesoesternal ? parseFloat(perimetros.toraxMesoesternal) : undefined,
        perimetroCintura: perimetros.cintura ? parseFloat(perimetros.cintura) : undefined,
        perimetroCaderas: perimetros.caderas ? parseFloat(perimetros.caderas) : undefined,
        perimetroMusloSuperior: perimetros.musloSuperior ? parseFloat(perimetros.musloSuperior) : undefined,
        perimetroMusloMedial: perimetros.musloMedial ? parseFloat(perimetros.musloMedial) : undefined,
        perimetroPantorrilla: perimetros.pantorrilla ? parseFloat(perimetros.pantorrilla) : undefined,
        pliegueTriceps: pliegues.triceps ? parseFloat(pliegues.triceps) : undefined,
        pliegueSubescapular: pliegues.subescapular ? parseFloat(pliegues.subescapular) : undefined,
        pliegueSupraespinal: pliegues.supraespinal ? parseFloat(pliegues.supraespinal) : undefined,
        pliegueAbdominal: pliegues.abdominal ? parseFloat(pliegues.abdominal) : undefined,
        pliegueMusloMedial: pliegues.musloMedial ? parseFloat(pliegues.musloMedial) : undefined,
        plieguePantorrilla: pliegues.pantorrilla ? parseFloat(pliegues.pantorrilla) : undefined,
        tejidoMuscularKg: composicion.tejidoMuscularKg ? parseFloat(composicion.tejidoMuscularKg) : undefined,
        tejidoMuscularPct: composicion.tejidoMuscularPct ? parseFloat(composicion.tejidoMuscularPct) : undefined,
        tejidoAdiposoKg: composicion.tejidoAdiposoKg ? parseFloat(composicion.tejidoAdiposoKg) : undefined,
        tejidoAdipodoPct: composicion.tejidoAdipodoPct ? parseFloat(composicion.tejidoAdipodoPct) : undefined,
        notes: notes || undefined,
      };

      if (isEditMode && editData) {
        const isBase64 = (str: string | undefined) => str?.startsWith('data:image/');
        measurementData.photoFront = isBase64(photos.front?.preview) ? photos.front?.preview : (photos.front?.preview || undefined);
        measurementData.photoSide = isBase64(photos.side?.preview) ? photos.side?.preview : (photos.side?.preview || undefined);
        measurementData.photoBack = isBase64(photos.back?.preview) ? photos.back?.preview : (photos.back?.preview || undefined);
        
        await updateAnthropometry(parseInt(editId!), measurementData);
        toast.success("¡Medición actualizada!");
      } else {
        measurementData.photoFront = photos.front?.preview || undefined;
        measurementData.photoSide = photos.side?.preview || undefined;
        measurementData.photoBack = photos.back?.preview || undefined;
        
        await addAnthropometry(studentId, measurementData);
        toast.success("¡Medición guardada!");
      }
      
      router.push(`/coach/students/${studentId}/progress/measurements`);
    } catch (error) {
      console.error("Error publicando medición:", error);
      toast.error("Error al guardar");
    } finally {
      setPublishing(false);
    }
  };

  const PhotoUpload = ({ type, label }: { type: PhotoType; label: string }) => {
    const photo = photos[type];
    const isMenuOpen = photoMenuOpen === type;

    return (
      <div className="flex flex-col items-center gap-2 relative">
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
          onClick={() => setPhotoMenuOpen(isMenuOpen ? null : type)}
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

        <AnimatePresence>
          {isMenuOpen && (
            <>
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

  const photosCount = Object.values(photos).filter((p) => p !== null).length;

  if (loadingStudent || loadingEdit) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cargando..." backHref={`/coach/students/${studentId}/progress/measurements`} />
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
        subtitle={student ? `${student.firstName} ${student.lastName}` : undefined}
        backHref={`/coach/students/${studentId}/progress/measurements`} 
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

            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400">Tren Superior</CardTitle>
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

            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400">Zona Media</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <MeasureInput
                    label="Cintura (mínima)"
                    value={perimetros.cintura}
                    onChange={(v) => setPerimetros((p) => ({ ...p, cintura: v }))}
                  />
                  <MeasureInput
                    label="Caderas (máxima)"
                    value={perimetros.caderas}
                    onChange={(v) => setPerimetros((p) => ({ ...p, caderas: v }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-400">Tren Inferior</CardTitle>
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
                <CardTitle className="text-sm text-orange-400">Pliegues Cutáneos (8 sitios)</CardTitle>
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

        {/* Resumen */}
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

        {/* Botón Guardar */}
        <Button
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold text-lg rounded-xl"
          disabled={!hasData() || publishing}
          onClick={handlePublish}
        >
          {publishing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Guardando...
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
                  Guardar Medición
                </>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
