
// Reemplazar con la URL base de tu API de backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Tipos de datos para el cliente de API de GDI, basados en el esquema relacional.
 */

// Corresponde a la tabla 'gdis'
export interface Gdi {
  gdi_id: number;
  name: string;
  guide_id: number | null;
  mentor_id: number | null;
}

// Corresponde a la tabla 'members' (versión simplificada)
export interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
}

// Tipo para crear un nuevo GDI. `gdi_id` es autogenerado.
export type CreateGdiDto = Omit<Gdi, "gdi_id"> & {
  member_ids?: number[];
};

// Tipo para actualizar un GDI. Todos los campos son opcionales.
export type UpdateGdiDto = Partial<CreateGdiDto>;

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
// FUNCIONES DEL CLIENTE DE API PARA GDIS
// ============================================

export const gdiApiClient = {
  /**
   * Obtiene todos los GDIs.
   */
  getAll: async (): Promise<Gdi[]> => {
    return fetchApi(`${API_BASE_URL}/gdis`);
  },

  /**
   * Obtiene un GDI por su ID.
   */
  getById: async (id: number): Promise<Gdi | null> => {
    return fetchApi(`${API_BASE_URL}/gdis/${id}`);
  },

  /**
   * Crea un nuevo GDI.
   */
  create: async (gdiData: CreateGdiDto): Promise<Gdi> => {
    return fetchApi(`${API_BASE_URL}/gdis`, {
      method: "POST",
      body: JSON.stringify(gdiData),
    });
  },

  /**
   * Actualiza un GDI existente.
   */
  update: async (id: number, updates: UpdateGdiDto): Promise<Gdi> => {
    return fetchApi(`${API_BASE_URL}/gdis/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Elimina un GDI por su ID.
   */
  delete: async (id: number): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/gdis/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Obtiene los miembros de un GDI específico.
   */
  getMembers: async (id: number): Promise<Member[]> => {
    return fetchApi(`${API_BASE_URL}/gdis/${id}/members`);
  },

  /**
   * Reemplaza todos los miembros de un GDI.
   */
  setMembers: async (id: number, memberIds: number[]): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/gdis/${id}/members`, {
      method: "PUT",
      body: JSON.stringify({ member_ids: memberIds }),
    });
  },
};
