
// Reemplazar con la URL base de tu API de backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Tipos de datos para el cliente de API de Reuniones, basados en el esquema relacional.
 */

// Corresponde a la tabla 'meeting_series'
export interface MeetingSeries {
  series_id: number;
  series_name: string;
  frequency: string; // "OneTime", "Weekly", "Monthly"
  is_general: boolean;
  meeting_type_id: number | null;
  gdi_id: number | null;
  area_id: number | null;
  // Campos adicionales que la API podría añadir (ej. de recurrence_rules)
  default_time?: string;
  default_location?: string;
}

// Corresponde a la tabla 'meetings'
export interface Meeting {
  meeting_id: number;
  series_id: number | null;
  date: string; // YYYY-MM-DD
  is_manual: boolean;
  meeting_type_id: number | null;
  gdi_id: number | null;
  area_id: number | null;
  time: string | null;
  location: string | null;
  // Campos que la API podría añadir
  name?: string;
  description?: string;
}

// DTOs para creación y actualización
export type CreateMeetingSeriesDto = Omit<MeetingSeries, "series_id">;
export type UpdateMeetingSeriesDto = Partial<CreateMeetingSeriesDto>;
export type CreateMeetingDto = Omit<Meeting, "meeting_id">;
export type UpdateMeetingDto = Partial<CreateMeetingDto>;

// Parámetros para obtener reuniones
export interface GetMeetingsParams {
  series_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}

// Respuesta paginada
export interface PaginatedMeetingsResponse {
  instances: Meeting[];
  totalCount: number;
  totalPages: number;
}

// Función de ayuda genérica para fetch
async function fetchApi(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Error desconocido" }));
    throw new Error(errorBody.message || "Error en la petición a la API");
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

// ============================================
// CLIENTE DE API PARA REUNIONES Y SERIES
// ============================================

export const meetingApiClient = {
  // --- Series de Reuniones ---
  getAllSeries: async (params?: { gdi_id?: number, area_id?: number }): Promise<MeetingSeries[]> => {
    const query = new URLSearchParams();
    if (params?.gdi_id) query.append("gdi_id", params.gdi_id.toString());
    if (params?.area_id) query.append("area_id", params.area_id.toString());
    return fetchApi(`${API_BASE_URL}/meeting-series?${query.toString()}`);
  },
  getSeriesById: async (id: number): Promise<MeetingSeries | null> => {
    return fetchApi(`${API_BASE_URL}/meeting-series/${id}`);
  },
  createSeries: async (seriesData: CreateMeetingSeriesDto): Promise<MeetingSeries> => {
    return fetchApi(`${API_BASE_URL}/meeting-series`, {
      method: "POST",
      body: JSON.stringify(seriesData),
    });
  },
  updateSeries: async (id: number, updates: UpdateMeetingSeriesDto): Promise<MeetingSeries> => {
    return fetchApi(`${API_BASE_URL}/meeting-series/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },
  deleteSeries: async (id: number): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/meeting-series/${id}`, {
      method: "DELETE",
    });
  },

  // --- Instancias de Reuniones ---
  getMeetings: async (params: GetMeetingsParams): Promise<PaginatedMeetingsResponse> => {
    const query = new URLSearchParams();
    if (params.series_id) query.append("series_id", params.series_id.toString());
    if (params.start_date) query.append("start_date", params.start_date);
    if (params.end_date) query.append("end_date", params.end_date);
    if (params.page) query.append("page", params.page.toString());
    if (params.pageSize) query.append("pageSize", params.pageSize.toString());
    return fetchApi(`${API_BASE_URL}/meetings?${query.toString()}`);
  },
  getMeetingById: async (id: number): Promise<Meeting | null> => {
    return fetchApi(`${API_BASE_URL}/meetings/${id}`);
  },
  createMeeting: async (meetingData: CreateMeetingDto): Promise<Meeting> => {
    return fetchApi(`${API_BASE_URL}/meetings`, {
      method: "POST",
      body: JSON.stringify(meetingData),
    });
  },
  updateMeeting: async (id: number, updates: UpdateMeetingDto): Promise<Meeting> => {
    return fetchApi(`${API_BASE_URL}/meetings/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },
  deleteMeeting: async (id: number): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/meetings/${id}`, {
      method: "DELETE",
    });
  },
};
