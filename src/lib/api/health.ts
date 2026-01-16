import api from "@/lib/api";

// ========== WEIGHT ==========

export const getWeightLogs = async (studentId: number, limit = 30) => {
  const { data } = await api.get(`/health/weight/${studentId}?limit=${limit}`);
  return data;
};

export const addWeightLog = async (studentId: number, weight: number, date?: string) => {
  const { data } = await api.post(`/health/weight/${studentId}`, {
    weight,
    date: date || (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
  });
  return data;
};

// Obtener peso de una fecha específica (si existe)
export const getWeightByDate = async (studentId: number, date: string): Promise<{ weight: number; id: number } | null> => {
  try {
    const { data } = await api.get(`/health/weight/${studentId}?limit=100`);
    // La API puede devolver { value: [...] } o directamente el array
    let logs = [];
    if (Array.isArray(data)) {
      logs = data;
    } else if (data?.value && Array.isArray(data.value)) {
      logs = data.value;
    } else if (data && typeof data === 'object') {
      // Puede ser un objeto con los logs en otra propiedad
      logs = Object.values(data).find(v => Array.isArray(v)) || [];
    }
    
    // Buscar el registro que coincida con la fecha
    const found = logs.find((log: any) => {
      if (!log?.date) return false;
      const logDate = typeof log.date === 'string' ? log.date.split('T')[0] : '';
      return logDate === date;
    });
    
    if (found) {
      return { weight: Number(found.weight), id: found.id };
    }
    return null;
  } catch (error) {
    console.error('Error fetching weight by date:', error);
    return null;
  }
};

export const getWeightStats = async (studentId: number) => {
  const { data } = await api.get(`/health/weight/${studentId}/stats`);
  return data;
};

export const getWeightWeeklyStats = async (studentId: number) => {
  const { data } = await api.get(`/health/weight/${studentId}/weekly-stats`);
  return data;
};

export const updateWeightGoal = async (studentId: number, weeklyGoal: number) => {
  const { data } = await api.put(`/health/goals/${studentId}/weight`, { weeklyGoal });
  return data;
};

// ========== ANTHROPOMETRY ==========

export type AnthropometryStatus = 'draft' | 'published';

export interface AnthropometryInput {
  date: string;
  status?: AnthropometryStatus;
  // Datos básicos
  weight?: number;
  heightCm?: number;
  // Perímetros (cm)
  perimetroCabeza?: number;
  perimetroBrazoRelajado?: number;
  perimetroBrazoContraido?: number;
  perimetroAntebrazo?: number;
  perimetroTorax?: number;
  perimetroCintura?: number;
  perimetroCaderas?: number;
  perimetroMusloSuperior?: number;
  perimetroMusloMedial?: number;
  perimetroPantorrilla?: number;
  // Pliegues (mm)
  plieguePantorrilla?: number;
  pliegueTriceps?: number;
  pliegueSubescapular?: number;
  pliegueSupraespinal?: number;
  pliegueAbdominal?: number;
  pliegueMusloMedial?: number;
  // Fotos (URLs o base64 para upload)
  photoFront?: string;
  photoSide?: string;
  photoBack?: string;
  // Composición corporal (carga manual)
  tejidoMuscularKg?: number;
  tejidoMuscularPct?: number;
  tejidoAdiposoKg?: number;
  tejidoAdipodoPct?: number;
  notes?: string;
}

export interface Anthropometry extends AnthropometryInput {
  id: number;
  studentId?: number;
  // Valores calculados
  sumaPliegues?: number;
  porcentajeGrasa?: number;
  porcentajeMuscular?: number;
  masaGrasaKg?: number;
  masaMagraKg?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Obtener historial de antropometría de un estudiante
 * @param studentId - ID del estudiante
 * @param includeDrafts - Si true, incluye borradores. Por defecto false (solo publicados)
 */
export const getAnthropometryHistory = async (studentId: number, includeDrafts = false): Promise<Anthropometry[]> => {
  try {
    const { data } = await api.get(`/health/anthropometry/${studentId}?includeDrafts=${includeDrafts}`);
    return data || [];
  } catch (error) {
    console.error('Error fetching anthropometry:', error);
    return [];
  }
};

/**
 * Obtener el borrador pendiente de un estudiante (si existe)
 */
export const getDraftAnthropometry = async (studentId: number): Promise<Anthropometry | null> => {
  try {
    const { data } = await api.get(`/health/anthropometry/${studentId}/draft`);
    return data;
  } catch (error) {
    console.error('Error fetching draft:', error);
    return null;
  }
};

/**
 * Obtener detalle de una medición específica
 */
export const getAnthropometryById = async (id: number): Promise<Anthropometry> => {
  const { data } = await api.get(`/health/anthropometry/detail/${id}`);
  return data;
};

/**
 * Crear nueva medición de antropometría
 * Soporta fotos en base64 que se suben a Cloudinary
 */
export const addAnthropometry = async (
  studentId: number,
  measurements: AnthropometryInput
): Promise<Anthropometry> => {
  const { data } = await api.post(`/health/anthropometry/${studentId}`, measurements);
  return data;
};

/**
 * Actualizar medición existente
 */
export const updateAnthropometry = async (
  id: number,
  measurements: Partial<AnthropometryInput>
): Promise<Anthropometry> => {
  const { data } = await api.put(`/health/anthropometry/${id}`, measurements);
  return data;
};

/**
 * Publicar una medición (cambiar de draft a published)
 */
export const publishAnthropometry = async (id: number): Promise<Anthropometry> => {
  const { data } = await api.post(`/health/anthropometry/${id}/publish`);
  return data;
};

/**
 * Eliminar medición
 */
export const deleteAnthropometry = async (id: number) => {
  const { data } = await api.delete(`/health/anthropometry/${id}`);
  return data;
};

// ========== MOCK DATA (temporal hasta conectar backend) ==========
export const getMockAnthropometryHistory = (): any[] => {
  return [
    {
      id: 1,
      date: '2026-01-10',
      weight: 78.5,
      perimetroBrazoContraido: 35.5,
      perimetroCintura: 82,
      perimetroCaderas: 98,
      perimetroMusloSuperior: 58,
      photoFront: '/mock/progress-front-1.jpg',
      photoSide: '/mock/progress-side-1.jpg',
      photoBack: null,
      porcentajeGrasa: 15.2,
      masaMagraKg: 66.6,
    },
    {
      id: 2,
      date: '2025-12-15',
      weight: 79.8,
      perimetroBrazoContraido: 34.8,
      perimetroCintura: 84,
      perimetroCaderas: 99,
      perimetroMusloSuperior: 57,
      photoFront: '/mock/progress-front-2.jpg',
      photoSide: null,
      photoBack: '/mock/progress-back-2.jpg',
      porcentajeGrasa: 16.5,
      masaMagraKg: 66.6,
    },
  ];
};

// ========== DASHBOARD ==========

export const getHealthDashboard = async (studentId: number) => {
  const { data } = await api.get(`/health/dashboard/${studentId}`);
  return data;
};

