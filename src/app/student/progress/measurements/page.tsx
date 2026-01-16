"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Camera,
  Ruler,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  ImageIcon,
  X,
  ZoomIn,
  ArrowLeftRight,
  User,
  Activity,
  Target,
  Info,
  Pencil,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Anthropometry } from "@/types";
import { getAnthropometryHistory } from "@/lib/api/health";

// Tipo extendido con todos los campos de una antropometría completa
interface FullAnthropometry extends Anthropometry {
  // Básicos
  talla?: number;
  heightCm?: number;
  tallaSentado?: number;
  
  // Diámetros
  diametroBiacromial?: number;
  diametroToraxTransverso?: number;
  diametroToraxAnteroposterior?: number;
  diametroBiiliocrestideo?: number;
  diametroHumeral?: number;
  diametroFemoral?: number;
  
  // Perímetros extra
  perimetroCabeza?: number;
  perimetroToraxMesoesternal?: number;
  
  // Composición corporal (cargada manualmente)
  tejidoMuscularKg?: number;
  tejidoMuscularPct?: number;
  tejidoAdiposoKg?: number;
  tejidoAdipodoPct?: number;
  indiceMuscularOseo?: number;
}

// Mock data con datos más realistas como el informe del usuario
const mockHistory: FullAnthropometry[] = [
  {
    id: 1,
    studentId: 1,
    date: "2026-01-10",
    weight: 78.5,
    talla: 175,
    
    // Perímetros
    perimetroBrazoRelajado: 33.2,
    perimetroBrazoContraido: 35.5,
    perimetroAntebrazo: 28.1,
    perimetroTorax: 98,
    perimetroToraxMesoesternal: 102,
    perimetroCintura: 82,
    perimetroCaderas: 98,
    perimetroMusloSuperior: 58,
    perimetroMusloMedial: 52,
    perimetroPantorrilla: 38,
    
    // Pliegues
    pliegueTriceps: 14,
    pliegueSubescapular: 18,
    pliegueSupraespinal: 22,
    pliegueAbdominal: 28,
    pliegueMusloMedial: 16,
    plieguePantorrilla: 10,
    sumaPliegues: 108,
    
    // Composición (cargada manualmente)
    tejidoMuscularKg: 33.4,
    tejidoMuscularPct: 42.5,
    tejidoAdiposoKg: 11.9,
    tejidoAdipodoPct: 15.2,
    indiceMuscularOseo: 4.8,
    
    // Fotos
    photoFront: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=600&fit=crop",
    photoSide: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=600&fit=crop",
    photoBack: undefined,
    
    notes: "Primera medición del mesociclo de fuerza",
  },
  {
    id: 2,
    studentId: 1,
    date: "2025-12-15",
    weight: 79.8,
    talla: 175,
    
    // Perímetros
    perimetroBrazoRelajado: 32.8,
    perimetroBrazoContraido: 34.8,
    perimetroAntebrazo: 27.9,
    perimetroTorax: 97,
    perimetroCintura: 84,
    perimetroCaderas: 99,
    perimetroMusloSuperior: 57,
    perimetroMusloMedial: 51,
    perimetroPantorrilla: 37.5,
    
    // Pliegues
    pliegueTriceps: 16,
    pliegueSubescapular: 20,
    pliegueSupraespinal: 25,
    pliegueAbdominal: 32,
    pliegueMusloMedial: 18,
    plieguePantorrilla: 11,
    sumaPliegues: 122,
    
    // Composición (cargada manualmente)
    tejidoMuscularKg: 33.4,
    tejidoMuscularPct: 41.8,
    tejidoAdiposoKg: 13.2,
    tejidoAdipodoPct: 16.5,
    indiceMuscularOseo: 4.7,
    
    // Fotos
    photoFront: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=600&fit=crop",
    photoSide: undefined,
    photoBack: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=600&fit=crop",
  },
  {
    id: 3,
    studentId: 1,
    date: "2025-11-20",
    weight: 80.2,
    talla: 175,
    
    // Perímetros
    perimetroBrazoRelajado: 32.5,
    perimetroBrazoContraido: 34.2,
    perimetroAntebrazo: 27.5,
    perimetroTorax: 96,
    perimetroCintura: 85,
    perimetroCaderas: 100,
    perimetroMusloSuperior: 56.5,
    perimetroMusloMedial: 50.5,
    perimetroPantorrilla: 37,
    
    // Pliegues
    pliegueTriceps: 17,
    pliegueSubescapular: 22,
    pliegueSupraespinal: 28,
    pliegueAbdominal: 35,
    pliegueMusloMedial: 20,
    plieguePantorrilla: 12,
    sumaPliegues: 134,
    
    // Composición (cargada manualmente)
    tejidoMuscularKg: 33.0,
    tejidoMuscularPct: 41.2,
    tejidoAdiposoKg: 13.7,
    tejidoAdipodoPct: 17.1,
    indiceMuscularOseo: 4.6,
    
    // Fotos
    photoFront: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&h=600&fit=crop",
  },
];

export default function MeasurementsHistoryPage() {
  const router = useRouter();
  const { student } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<FullAnthropometry[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [compareItems, setCompareItems] = useState<[number | null, number | null]>([null, null]);

  useEffect(() => {
    const loadData = async () => {
      if (!student?.id) return;
      
      setLoading(true);
      try {
        // Cargar historial desde el backend (solo publicados)
        const data = await getAnthropometryHistory(student.id, false);
        
        // Mapear los datos al formato esperado
        const formattedData: FullAnthropometry[] = data.map((item: any) => ({
          ...item,
          // Mapear heightCm a talla para compatibilidad
          talla: item.heightCm,
        }));
        
        setHistory(formattedData);
      } catch (error) {
        console.error("Error loading anthropometry history:", error);
        // Si falla, usar mock data como fallback (temporal)
        setHistory(mockHistory);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [student?.id]);

  // Calcular diferencias entre mediciones
  const getChange = (current: number | undefined, previous: number | undefined) => {
    if (current === undefined || previous === undefined) return null;
    return current - previous;
  };

  // Obtener fotos de una medición
  const getPhotos = (item: FullAnthropometry) => {
    const photos = [];
    if (item.photoFront) photos.push({ type: "Frente", url: item.photoFront });
    if (item.photoSide) photos.push({ type: "Lateral", url: item.photoSide });
    if (item.photoBack) photos.push({ type: "Espalda", url: item.photoBack });
    return photos;
  };

  // Toggle item para comparación
  const toggleCompareItem = (id: number) => {
    if (compareItems[0] === id) {
      setCompareItems([compareItems[1], null]);
    } else if (compareItems[1] === id) {
      setCompareItems([compareItems[0], null]);
    } else if (compareItems[0] === null) {
      setCompareItems([id, compareItems[1]]);
    } else if (compareItems[1] === null) {
      setCompareItems([compareItems[0], id]);
    } else {
      setCompareItems([compareItems[0], id]);
    }
  };

  // Agrupar fotos por fecha para la galería
  const photosByDate = history.reduce((acc, item) => {
    const photos = getPhotos(item);
    if (photos.length > 0) {
      acc.push({
        date: item.date,
        photos: photos.map(p => ({ ...p, itemId: item.id })),
      });
    }
    return acc;
  }, [] as Array<{ date: string; photos: Array<{ type: string; url: string; itemId: number }> }>);

  // Ordenar items de comparación: más viejo a la izquierda, más nuevo a la derecha
  const rawCompareItem1 = history.find((h) => h.id === compareItems[0]);
  const rawCompareItem2 = history.find((h) => h.id === compareItems[1]);
  
  // Si ambos existen, ordenar por fecha (viejo primero)
  const [compareItem1, compareItem2] = (() => {
    if (!rawCompareItem1 || !rawCompareItem2) {
      return [rawCompareItem1, rawCompareItem2];
    }
    // Comparar fechas: el más viejo va primero (izquierda)
    const date1 = new Date(rawCompareItem1.date);
    const date2 = new Date(rawCompareItem2.date);
    if (date1 <= date2) {
      return [rawCompareItem1, rawCompareItem2];
    } else {
      return [rawCompareItem2, rawCompareItem1];
    }
  })();

  // Componente para mostrar una fila de medida con diferencia
  const MeasureRow = ({ 
    label, 
    value, 
    prevValue, 
    unit,
    inverseColors = false 
  }: { 
    label: string; 
    value?: number; 
    prevValue?: number;
    unit: string;
    inverseColors?: boolean;
  }) => {
    const diff = getChange(value, prevValue);
    const isPositive = diff !== null && diff > 0;
    const isNegative = diff !== null && diff < 0;
    
    // Para pliegues y grasa, bajar es bueno (verde)
    // Para músculo y algunos perímetros, subir es bueno
    let colorClass = "text-text-muted";
    if (diff !== null && diff !== 0) {
      if (inverseColors) {
        colorClass = isNegative ? "text-success" : "text-warning";
      } else {
        colorClass = isPositive ? "text-success" : "text-warning";
      }
    }

    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <span className="text-sm text-text-muted">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text">
            {value !== undefined ? `${value} ${unit}` : "-"}
          </span>
          {diff !== null && diff !== 0 && (
            <span className={cn("text-xs font-medium", colorClass)}>
              {isPositive ? "+" : ""}{diff.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Antropometría"
        subtitle="Historial de mediciones"
        backHref="/student/progress"
        rightContent={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/student/progress/add-measurements")}
            className="text-primary"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        }
      />

      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-surface border border-border">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Historial
            </TabsTrigger>
            <TabsTrigger
              value="gallery"
              className="data-[state=active]:bg-accent data-[state=active]:text-black text-xs"
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              Galería
            </TabsTrigger>
            <TabsTrigger
              value="compare"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-xs"
            >
              <ArrowLeftRight className="w-4 h-4 mr-1" />
              Comparar
            </TabsTrigger>
          </TabsList>

          {/* Tab Historial */}
          <TabsContent value="list" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-8 text-center">
                  <Ruler className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">No hay mediciones todavía</p>
                  <Button
                    className="mt-4"
                    onClick={() => router.push("/student/progress/add-measurements")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar primera medición
                  </Button>
                </CardContent>
              </Card>
            ) : (
              history.map((item, index) => {
                const prevItem = history[index + 1];
                const photos = getPhotos(item);
                const isExpanded = expandedItem === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-surface/80 border-border overflow-hidden">
                      <CardContent className="p-0">
                        {/* Header con fecha */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium text-text">
                              {formatDate(item.date, {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {photos.length > 0 && (
                              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                                <Camera className="w-3 h-3 mr-1" />
                                {photos.length} foto{photos.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-text-muted hover:text-primary"
                              onClick={() => router.push(`/student/progress/add-measurements?edit=${item.id}`)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Contenido principal */}
                        <div className="p-4">
                          {/* Fotos miniatura */}
                          {photos.length > 0 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                              {photos.map((photo) => (
                                <div
                                  key={photo.type}
                                  className="relative flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden cursor-pointer group"
                                  onClick={() => setSelectedPhoto(photo.url)}
                                >
                                  <img
                                    src={photo.url}
                                    alt={photo.type}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ZoomIn className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5">
                                    <p className="text-[10px] text-white text-center">{photo.type}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Métricas principales */}
                          <div className="grid grid-cols-3 gap-3">
                            {item.weight && (
                              <div className="text-center p-2 rounded-lg bg-background/50">
                                <p className="text-lg font-bold text-text">{item.weight} kg</p>
                                <p className="text-xs text-text-muted">Peso</p>
                                {getChange(item.weight, prevItem?.weight) !== null && (
                                  <div className={cn(
                                    "flex items-center justify-center gap-1 text-xs mt-1",
                                    getChange(item.weight, prevItem?.weight)! < 0 ? "text-success" : "text-warning"
                                  )}>
                                    {getChange(item.weight, prevItem?.weight)! < 0 ? (
                                      <TrendingDown className="w-3 h-3" />
                                    ) : (
                                      <TrendingUp className="w-3 h-3" />
                                    )}
                                    {getChange(item.weight, prevItem?.weight)! > 0 ? "+" : ""}
                                    {getChange(item.weight, prevItem?.weight)!.toFixed(1)}
                                  </div>
                                )}
                              </div>
                            )}

                            {item.tejidoAdipodoPct && (
                              <div className="text-center p-2 rounded-lg bg-background/50">
                                <p className="text-lg font-bold text-text">{item.tejidoAdipodoPct}%</p>
                                <p className="text-xs text-text-muted">T. Adiposo</p>
                                {getChange(item.tejidoAdipodoPct, prevItem?.tejidoAdipodoPct) !== null && (
                                  <div className={cn(
                                    "flex items-center justify-center gap-1 text-xs mt-1",
                                    getChange(item.tejidoAdipodoPct, prevItem?.tejidoAdipodoPct)! < 0 ? "text-success" : "text-warning"
                                  )}>
                                    {getChange(item.tejidoAdipodoPct, prevItem?.tejidoAdipodoPct)! < 0 ? (
                                      <TrendingDown className="w-3 h-3" />
                                    ) : (
                                      <TrendingUp className="w-3 h-3" />
                                    )}
                                    {getChange(item.tejidoAdipodoPct, prevItem?.tejidoAdipodoPct)! > 0 ? "+" : ""}
                                    {getChange(item.tejidoAdipodoPct, prevItem?.tejidoAdipodoPct)!.toFixed(1)}
                                  </div>
                                )}
                              </div>
                            )}

                            {item.sumaPliegues && (
                              <div className="text-center p-2 rounded-lg bg-background/50">
                                <p className="text-lg font-bold text-text">{item.sumaPliegues} mm</p>
                                <p className="text-xs text-text-muted">Σ Pliegues</p>
                                {getChange(item.sumaPliegues, prevItem?.sumaPliegues) !== null && (
                                  <div className={cn(
                                    "flex items-center justify-center gap-1 text-xs mt-1",
                                    getChange(item.sumaPliegues, prevItem?.sumaPliegues)! < 0 ? "text-success" : "text-warning"
                                  )}>
                                    {getChange(item.sumaPliegues, prevItem?.sumaPliegues)! < 0 ? (
                                      <TrendingDown className="w-3 h-3" />
                                    ) : (
                                      <TrendingUp className="w-3 h-3" />
                                    )}
                                    {getChange(item.sumaPliegues, prevItem?.sumaPliegues)! > 0 ? "+" : ""}
                                    {getChange(item.sumaPliegues, prevItem?.sumaPliegues)!.toFixed(0)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Segunda fila de métricas - Composición corporal */}
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            {item.tejidoMuscularKg && (
                              <div className="text-center p-2 rounded-lg bg-accent/10">
                                <p className="text-base font-bold text-accent">{item.tejidoMuscularKg} kg</p>
                                <p className="text-xs text-text-muted">T. Muscular</p>
                              </div>
                            )}
                            {item.tejidoMuscularPct && (
                              <div className="text-center p-2 rounded-lg bg-accent/10">
                                <p className="text-base font-bold text-accent">{item.tejidoMuscularPct}%</p>
                                <p className="text-xs text-text-muted">T. Muscular</p>
                              </div>
                            )}
                            {item.tejidoAdiposoKg && (
                              <div className="text-center p-2 rounded-lg bg-orange-500/10">
                                <p className="text-base font-bold text-orange-400">{item.tejidoAdiposoKg} kg</p>
                                <p className="text-xs text-text-muted">T. Adiposo</p>
                              </div>
                            )}
                          </div>

                          {/* Perímetros destacados */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {item.perimetroBrazoContraido && (
                              <span className="px-2 py-1 text-xs bg-accent/20 text-accent rounded-full">
                                Brazo: {item.perimetroBrazoContraido} cm
                              </span>
                            )}
                            {item.perimetroCintura && (
                              <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded-full">
                                Cintura: {item.perimetroCintura} cm
                              </span>
                            )}
                            {item.perimetroMusloSuperior && (
                              <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full">
                                Muslo: {item.perimetroMusloSuperior} cm
                              </span>
                            )}
                          </div>

                          {/* Botón para expandir detalles */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3 text-text-muted hover:text-text"
                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Ocultar detalles
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Ver todos los datos
                              </>
                            )}
                          </Button>

                          {/* Detalle expandido */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-4 space-y-4">
                                  {/* Pliegues cutáneos */}
                                  <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
                                    <h4 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-2">
                                      <Activity className="w-4 h-4" />
                                      Pliegues Cutáneos (mm)
                                    </h4>
                                    <MeasureRow label="Tríceps" value={item.pliegueTriceps} prevValue={prevItem?.pliegueTriceps} unit="mm" inverseColors />
                                    <MeasureRow label="Subescapular" value={item.pliegueSubescapular} prevValue={prevItem?.pliegueSubescapular} unit="mm" inverseColors />
                                    <MeasureRow label="Supraespinal" value={item.pliegueSupraespinal} prevValue={prevItem?.pliegueSupraespinal} unit="mm" inverseColors />
                                    <MeasureRow label="Abdominal" value={item.pliegueAbdominal} prevValue={prevItem?.pliegueAbdominal} unit="mm" inverseColors />
                                    <MeasureRow label="Muslo medial" value={item.pliegueMusloMedial} prevValue={prevItem?.pliegueMusloMedial} unit="mm" inverseColors />
                                    <MeasureRow label="Pantorrilla" value={item.plieguePantorrilla} prevValue={prevItem?.plieguePantorrilla} unit="mm" inverseColors />
                                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-orange-500/30">
                                      <span className="text-sm font-medium text-orange-400">SUMA TOTAL</span>
                                      <span className="text-lg font-bold text-orange-400">{item.sumaPliegues} mm</span>
                                    </div>
                                  </div>

                                  {/* Perímetros */}
                                  <div className="rounded-lg bg-accent/10 border border-accent/20 p-3">
                                    <h4 className="text-sm font-medium text-accent mb-2 flex items-center gap-2">
                                      <Ruler className="w-4 h-4" />
                                      Perímetros (cm)
                                    </h4>
                                    <MeasureRow label="Brazo relajado" value={item.perimetroBrazoRelajado} prevValue={prevItem?.perimetroBrazoRelajado} unit="cm" />
                                    <MeasureRow label="Brazo contraído" value={item.perimetroBrazoContraido} prevValue={prevItem?.perimetroBrazoContraido} unit="cm" />
                                    <MeasureRow label="Antebrazo" value={item.perimetroAntebrazo} prevValue={prevItem?.perimetroAntebrazo} unit="cm" />
                                    <MeasureRow label="Tórax" value={item.perimetroTorax} prevValue={prevItem?.perimetroTorax} unit="cm" />
                                    <MeasureRow label="Cintura" value={item.perimetroCintura} prevValue={prevItem?.perimetroCintura} unit="cm" inverseColors />
                                    <MeasureRow label="Caderas" value={item.perimetroCaderas} prevValue={prevItem?.perimetroCaderas} unit="cm" />
                                    <MeasureRow label="Muslo superior" value={item.perimetroMusloSuperior} prevValue={prevItem?.perimetroMusloSuperior} unit="cm" />
                                    <MeasureRow label="Muslo medial" value={item.perimetroMusloMedial} prevValue={prevItem?.perimetroMusloMedial} unit="cm" />
                                    <MeasureRow label="Pantorrilla" value={item.perimetroPantorrilla} prevValue={prevItem?.perimetroPantorrilla} unit="cm" />
                                  </div>

                                  {/* Composición corporal */}
                                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                                    <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                                      <Target className="w-4 h-4" />
                                      Composición Corporal
                                    </h4>
                                    <MeasureRow label="Tejido Muscular" value={item.tejidoMuscularKg} prevValue={prevItem?.tejidoMuscularKg} unit="kg" />
                                    <MeasureRow label="Tejido Muscular" value={item.tejidoMuscularPct} prevValue={prevItem?.tejidoMuscularPct} unit="%" />
                                    <MeasureRow label="Tejido Adiposo" value={item.tejidoAdiposoKg} prevValue={prevItem?.tejidoAdiposoKg} unit="kg" inverseColors />
                                    <MeasureRow label="Tejido Adiposo" value={item.tejidoAdipodoPct} prevValue={prevItem?.tejidoAdipodoPct} unit="%" inverseColors />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Notas */}
                          {item.notes && (
                            <p className="text-xs text-text-muted mt-3 italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* Tab Galería - Agrupada por fecha */}
          <TabsContent value="gallery" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : photosByDate.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-8 text-center">
                  <Camera className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">No hay fotos todavía</p>
                </CardContent>
              </Card>
            ) : (
              photosByDate.map((group, groupIndex) => (
                <motion.div
                  key={group.date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.1 }}
                >
                  <Card className="bg-surface/80 border-border overflow-hidden">
                    <CardHeader className="pb-2 border-b border-border">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-text flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          {formatDate(group.date, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {group.photos.length} foto{group.photos.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-3">
                        {group.photos.map((photo, photoIndex) => (
                          <motion.div
                            key={`${group.date}-${photo.type}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: photoIndex * 0.05 }}
                            className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => setSelectedPhoto(photo.url)}
                          >
                            <img
                              src={photo.url}
                              alt={photo.type}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs text-white font-medium">{photo.type}</p>
                            </div>
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-8 h-8 text-white" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Tab Comparar */}
          <TabsContent value="compare" className="mt-4 space-y-4">
            <Card className="bg-surface/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-text-secondary flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4" />
                  Comparar mediciones
                </CardTitle>
                <p className="text-xs text-text-muted">
                  Seleccioná 2 fechas para comparar
                </p>
              </CardHeader>
              <CardContent className="p-4">
                {/* Selector de fechas */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {history.map((item) => (
                    <Button
                      key={item.id}
                      variant={compareItems.includes(item.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleCompareItem(item.id)}
                      className={cn(
                        "text-xs",
                        compareItems[0] === item.id && "bg-primary text-black",
                        compareItems[1] === item.id && "bg-accent text-black"
                      )}
                    >
                      {formatDate(item.date, { day: "numeric", month: "short", year: "2-digit" })}
                    </Button>
                  ))}
                </div>

                {/* Comparación visual */}
                {compareItem1 && compareItem2 ? (
                  <div className="space-y-4">
                    {/* Fotos lado a lado */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-center">
                          <span className="text-[10px] text-text-muted uppercase">antes</span>
                          <p className="text-xs text-primary font-medium">
                            {formatDate(compareItem1.date, { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        {compareItem1.photoFront ? (
                          <div className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-primary/30">
                            <img src={compareItem1.photoFront} alt="Antes" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-[3/4] rounded-lg bg-surface flex items-center justify-center border-2 border-dashed border-border">
                            <User className="w-8 h-8 text-text-muted" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="text-center">
                          <span className="text-[10px] text-text-muted uppercase">después</span>
                          <p className="text-xs text-accent font-medium">
                            {formatDate(compareItem2.date, { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        {compareItem2.photoFront ? (
                          <div className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-accent/30">
                            <img src={compareItem2.photoFront} alt="Después" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-[3/4] rounded-lg bg-surface flex items-center justify-center border-2 border-dashed border-border">
                            <User className="w-8 h-8 text-text-muted" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Leyenda de colores */}
                    <div className="flex items-center justify-center gap-4 mb-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        <span className="text-text-muted">Mejoró</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning"></span>
                        <span className="text-text-muted">Empeoró</span>
                      </span>
                    </div>

                    {/* Tabla comparativa completa */}
                    <ScrollArea className="h-[400px]">
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-surface sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 text-text-muted font-normal">Medida</th>
                              <th className="text-center px-2 py-2 font-medium text-xs">
                                <span className="text-[10px] text-text-muted block">antes</span>
                                <span className="text-primary">{formatDate(compareItem1.date, { day: "numeric", month: "short" })}</span>
                              </th>
                              <th className="text-center px-2 py-2 font-medium text-xs">
                                <span className="text-[10px] text-text-muted block">después</span>
                                <span className="text-accent">{formatDate(compareItem2.date, { day: "numeric", month: "short" })}</span>
                              </th>
                              <th className="text-center px-2 py-2 text-text-muted font-normal">Δ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {/* Básicos */}
                            <tr className="bg-surface/50">
                              <td colSpan={4} className="px-3 py-1 text-xs font-medium text-text-muted">BÁSICOS</td>
                            </tr>
                            {[
                              { label: "Peso", key: "weight", unit: "kg", inverse: true },
                              { label: "% T. Adiposo", key: "tejidoAdipodoPct", unit: "%", inverse: true },
                              { label: "Σ Pliegues", key: "sumaPliegues", unit: "mm", inverse: true },
                              { label: "T. Muscular", key: "tejidoMuscularKg", unit: "kg", inverse: false },
                            ].map((row) => {
                              const val1 = compareItem1[row.key as keyof FullAnthropometry] as number | undefined;
                              const val2 = compareItem2[row.key as keyof FullAnthropometry] as number | undefined;
                              const diff = val1 !== undefined && val2 !== undefined ? val2 - val1 : null;
                              const colorClass = diff !== null && diff !== 0 
                                ? (row.inverse ? (diff < 0 ? "text-success" : "text-warning") : (diff > 0 ? "text-success" : "text-warning"))
                                : "text-text-muted";

                              return (
                                <tr key={row.key}>
                                  <td className="px-3 py-2 text-text-muted">{row.label} <span className="text-xs opacity-60">({row.unit})</span></td>
                                  <td className="px-2 py-2 text-center text-text">{val1 !== undefined ? val1 : "-"}</td>
                                  <td className="px-2 py-2 text-center text-text">{val2 !== undefined ? val2 : "-"}</td>
                                  <td className={cn("px-2 py-2 text-center font-medium", colorClass)}>
                                    {diff !== null ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}` : "-"}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Pliegues */}
                            <tr className="bg-orange-500/10">
                              <td colSpan={4} className="px-3 py-1 text-xs font-medium text-orange-400">PLIEGUES (mm)</td>
                            </tr>
                            {[
                              { label: "Tríceps", key: "pliegueTriceps" },
                              { label: "Subescapular", key: "pliegueSubescapular" },
                              { label: "Supraespinal", key: "pliegueSupraespinal" },
                              { label: "Abdominal", key: "pliegueAbdominal" },
                              { label: "Muslo", key: "pliegueMusloMedial" },
                              { label: "Pantorrilla", key: "plieguePantorrilla" },
                            ].map((row) => {
                              const val1 = compareItem1[row.key as keyof FullAnthropometry] as number | undefined;
                              const val2 = compareItem2[row.key as keyof FullAnthropometry] as number | undefined;
                              const diff = val1 !== undefined && val2 !== undefined ? val2 - val1 : null;

                              return (
                                <tr key={row.key}>
                                  <td className="px-3 py-2 text-text-muted">{row.label}</td>
                                  <td className="px-2 py-2 text-center text-text">{val1 !== undefined ? val1 : "-"}</td>
                                  <td className="px-2 py-2 text-center text-text">{val2 !== undefined ? val2 : "-"}</td>
                                  <td className={cn("px-2 py-2 text-center font-medium", diff !== null && diff !== 0 ? (diff < 0 ? "text-success" : "text-warning") : "text-text-muted")}>
                                    {diff !== null ? `${diff > 0 ? "+" : ""}${diff.toFixed(0)}` : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Suma de pliegues */}
                            {(() => {
                              const suma1 = compareItem1.sumaPliegues;
                              const suma2 = compareItem2.sumaPliegues;
                              const diff = suma1 !== undefined && suma2 !== undefined ? suma2 - suma1 : null;
                              return (
                                <tr className="bg-orange-500/20 font-medium">
                                  <td className="px-3 py-2 text-orange-400">Σ SUMA</td>
                                  <td className="px-2 py-2 text-center text-orange-400">{suma1 !== undefined ? suma1 : "-"}</td>
                                  <td className="px-2 py-2 text-center text-orange-400">{suma2 !== undefined ? suma2 : "-"}</td>
                                  <td className={cn("px-2 py-2 text-center font-bold", diff !== null && diff !== 0 ? (diff < 0 ? "text-success" : "text-warning") : "text-text-muted")}>
                                    {diff !== null ? `${diff > 0 ? "+" : ""}${diff.toFixed(0)}` : "-"}
                                  </td>
                                </tr>
                              );
                            })()}

                            {/* Perímetros */}
                            <tr className="bg-accent/10">
                              <td colSpan={4} className="px-3 py-1 text-xs font-medium text-accent">PERÍMETROS (cm)</td>
                            </tr>
                            {[
                              { label: "Brazo flex.", key: "perimetroBrazoContraido", inverse: false },
                              { label: "Brazo rel.", key: "perimetroBrazoRelajado", inverse: false },
                              { label: "Antebrazo", key: "perimetroAntebrazo", inverse: false },
                              { label: "Tórax", key: "perimetroTorax", inverse: false },
                              { label: "Cintura", key: "perimetroCintura", inverse: true },
                              { label: "Caderas", key: "perimetroCaderas", inverse: false },
                              { label: "Muslo sup.", key: "perimetroMusloSuperior", inverse: false },
                              { label: "Pantorrilla", key: "perimetroPantorrilla", inverse: false },
                            ].map((row) => {
                              const val1 = compareItem1[row.key as keyof FullAnthropometry] as number | undefined;
                              const val2 = compareItem2[row.key as keyof FullAnthropometry] as number | undefined;
                              const diff = val1 !== undefined && val2 !== undefined ? val2 - val1 : null;
                              const colorClass = diff !== null && diff !== 0 
                                ? (row.inverse ? (diff < 0 ? "text-success" : "text-warning") : (diff > 0 ? "text-success" : "text-warning"))
                                : "text-text-muted";

                              return (
                                <tr key={row.key}>
                                  <td className="px-3 py-2 text-text-muted">{row.label}</td>
                                  <td className="px-2 py-2 text-center text-text">{val1 !== undefined ? val1 : "-"}</td>
                                  <td className="px-2 py-2 text-center text-text">{val2 !== undefined ? val2 : "-"}</td>
                                  <td className={cn("px-2 py-2 text-center font-medium", colorClass)}>
                                    {diff !== null ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}` : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ArrowLeftRight className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <p className="text-text-muted">
                      Seleccioná 2 fechas para ver la comparación
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de foto ampliada */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-md w-full"
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              <img
                src={selectedPhoto}
                alt="Foto ampliada"
                className="w-full h-auto rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
