
// Reemplazar con la URL base de tu API de backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Tipos de datos para el cliente de API de Miembros, basados en el esquema relacional.
 */

// Corresponde a la tabla 'members'
export interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  contact: string | null;
  status: string | null; // 'Active', 'Inactive', 'New', etc.
  birth_date: string | null; // Formato YYYY-MM-DD
  baptism_date: string | null;
  join_date: string | null;
  address: string | null;
  bible_study: string | null;
  type_bible_study: string | null;
  // Estos campos pueden venir de joins en el backend
  roles?: string[];
  gdi_id?: number | null;
  area_ids?: number[];
}

// Tipo para crear un nuevo miembro. `member_id` es autogenerado.
export type CreateMemberDto = Omit<Member, "member_id" | "roles">;

// Tipo para actualizar un miembro.
export type UpdateMemberDto = Partial<CreateMemberDto>;

// Parámetros de consulta para obtener miembros con filtros y paginación
export interface GetMembersParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: string[];
  role?: string[];
  gdi_id?: number[];
  area_id?: number[];
}

// Respuesta esperada de la API para una lista paginada
export interface PaginatedMembersResponse {
  members: Member[];
  totalMembers: number;
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
// FUNCIONES DEL CLIENTE DE API PARA MIEMBROS
// ============================================

export const memberApiClient = {
  /**
   * Obtiene una lista paginada y filtrada de miembros.
   */
  getAll: async (params: GetMembersParams): Promise<PaginatedMembersResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.pageSize) query.append("pageSize", params.pageSize.toString());
    if (params.searchTerm) query.append("searchTerm", params.searchTerm);
    params.status?.forEach(s => query.append("status", s));
    params.role?.forEach(r => query.append("role", r));
    params.gdi_id?.forEach(id => query.append("gdi_id", id.toString()));
    params.area_id?.forEach(id => query.append("area_id", id.toString()));

    return fetchApi(`${API_BASE_URL}/members?${query.toString()}`);
  },

  /**
   * Obtiene todos los miembros sin paginación (para selectores, etc.).
   */
  getAllNonPaginated: async (): Promise<Member[]> => {
    return fetchApi(`${API_BASE_URL}/members/all`);
  },

  /**
   * Obtiene un miembro por su ID.
   */
  getById: async (id: number): Promise<Member | null> => {
    return fetchApi(`${API_BASE_URL}/members/${id}`);
  },

  /**
   * Crea un nuevo miembro.
   */
  create: async (memberData: CreateMemberDto): Promise<Member> => {
    return fetchApi(`${API_BASE_URL}/members`, {
      method: "POST",
      body: JSON.stringify(memberData),
    });
  },

  /**
   * Actualiza un miembro existente.
   */
  update: async (id: number, updates: UpdateMemberDto): Promise<Member> => {
    return fetchApi(`${API_BASE_URL}/members/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Elimina un miembro por su ID.
   */
  delete: async (id: number): Promise<void> => {
    await fetchApi(`${API_BASE_URL}/members/${id}`, {
      method: "DELETE",
    });
  },
};
