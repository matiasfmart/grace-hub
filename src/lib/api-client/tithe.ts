
// Reemplazar con la URL base de tu API de backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Tipos de datos para el cliente de API de Diezmos, basados en el esquema relacional.
 */

// Corresponde a la tabla 'tithes'
export interface TitheRecord {
  id: number;
  date: string; // YYYY-MM-DD
  status: string; // 'Paid', 'Pending', etc.
  member_id: number; // Asumiendo que es un entero, no texto.
}

// DTO para crear/actualizar un registro de diezmo.
// El backend puede manejar la lógica de si es una inserción o eliminación.
export interface SaveTitheStatusDto {
  member_id: number;
  year: number;
  month: number;
  did_tithe: boolean; // true para crear/asegurar que exista, false para eliminar
}

// Parámetros para obtener registros de diezmos
export interface GetTithesParams {
  year?: number;
  month?: number;
  member_id?: number;
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
// CLIENTE DE API PARA DIEZMOS
// ============================================

export const titheApiClient = {
  /**
   * Obtiene registros de diezmos, opcionalmente filtrados.
   */
  get: async (params: GetTithesParams): Promise<TitheRecord[]> => {
    const query = new URLSearchParams();
    if (params.year) query.append("year", params.year.toString());
    if (params.month) query.append("month", params.month.toString());
    if (params.member_id) query.append("member_id", params.member_id.toString());
    return fetchApi(`${API_BASE_URL}/tithes?${query.toString()}`);
  },

  /**
   * Guarda (upsert/delete) el estado de los diezmos para un mes completo.
   */
  batchUpdateForMonth: async (updates: SaveTitheStatusDto[]): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/tithes/batch`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  },
};
