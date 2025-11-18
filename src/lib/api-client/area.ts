
// Reemplazar con la URL base de tu API de backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Tipos de datos para el cliente de API, basados en el nuevo esquema relacional.
 * Estos deberían coincidir con lo que la API de NestJS espera y devuelve.
 */

// Corresponde a la tabla 'areas'
export interface Area {
  area_id: number;
  name: string;
  leader_id: number | null;
  mentor_id: number | null;
  // Opcional: La API podría devolver los objetos completos
  // leader?: Member;
  // mentor?: Member;
}

// Corresponde a la tabla 'members' (versión simplificada)
export interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
}

// Tipo para crear una nueva área. `area_id` es autogenerado.
export type CreateAreaDto = Omit<Area, "area_id"> & {
  member_ids?: number[]; // Para manejar la asignación de miembros en la creación
};

// Tipo para actualizar un área. Todos los campos son opcionales.
export type UpdateAreaDto = Partial<CreateAreaDto>;

// Función de ayuda para manejar las respuestas de la API
async function fetchApi(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Intenta parsear el error del cuerpo de la respuesta
    const errorBody = await response.json().catch(() => ({
      message: "Error desconocido en la API",
    }));
    console.error("Error en la llamada a la API:", errorBody);
    throw new Error(errorBody.message || "Error en la petición a la API");
  }

  // Si la respuesta no tiene contenido (ej. en un DELETE), no intentes parsear JSON
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================
// FUNCIONES DEL CLIENTE DE API PARA AREAS
// ============================================

export const areaApiClient = {
  /**
   * Obtiene todas las áreas de ministerio.
   */
  getAll: async (): Promise<Area[]> => {
    return fetchApi(`${API_BASE_URL}/areas`);
  },

  /**
   * Obtiene un área de ministerio por su ID.
   */
  getById: async (id: number): Promise<Area | null> => {
    return fetchApi(`${API_BASE_URL}/areas/${id}`);
  },

  /**
   * Crea una nueva área de ministerio.
   */
  create: async (areaData: CreateAreaDto): Promise<Area> => {
    return fetchApi(`${API_BASE_URL}/areas`, {
      method: "POST",
      body: JSON.stringify(areaData),
    });
  },

  /**
   * Actualiza un área de ministerio existente.
   */
  update: async (id: number, updates: UpdateAreaDto): Promise<Area> => {
    return fetchApi(`${API_BASE_URL}/areas/${id}`, {
      method: "PUT", // o 'PATCH' dependiendo de tu implementación de API
      body: JSON.stringify(updates),
    });
  },

  /**
   * Elimina un área de ministerio por su ID.
   */
  delete: async (id: number): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/areas/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Obtiene los miembros de un área específica.
   */
  getMembers: async (id: number): Promise<Member[]> => {
    return fetchApi(`${API_BASE_URL}/areas/${id}/members`);
  },

  /**
   * Reemplaza todos los miembros de un área.
   */
  setMembers: async (id: number, memberIds: number[]): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/areas/${id}/members`, {
      method: "PUT",
      body: JSON.stringify({ member_ids: memberIds }),
    });
  },
};
