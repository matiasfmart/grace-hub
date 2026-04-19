/**
 * API Client
 *
 * Centralized HTTP client for backend communication.
 * Handles request/response, error handling, and configuration.
 */

import type { ApiErrorResponse } from './types';

// ==============================================
// CONFIGURATION
// ==============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const API_PREFIX = '/api/v1';

// ==============================================
// ERROR HANDLING
// ==============================================

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorMessage: string | string[],
    public readonly errorType?: string
  ) {
    const message = Array.isArray(errorMessage) 
      ? errorMessage.join(', ') 
      : errorMessage;
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: ApiErrorResponse): ApiError {
    return new ApiError(
      response.statusCode,
      response.message,
      response.error
    );
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isValidationError(): boolean {
    return this.statusCode === 400;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }
}

// ==============================================
// REQUEST HELPERS
// ==============================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestParams {
  [key: string]: string | number | boolean | undefined;
}

function buildUrl(endpoint: string, params?: RequestParams): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

async function handleResponse<T>(response: Response): Promise<T> {
  // For non-content responses (e.g., 204 No Content)
  if (response.status === 204) {
    return null as T;
  }

  if (response.ok) {
    return response.json();
  }

  // Try to parse error response
  try {
    const errorBody = await response.json() as ApiErrorResponse;
    throw ApiError.fromResponse(errorBody);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // If we can't parse the error body, create a generic error
    throw new ApiError(
      response.status,
      response.statusText || 'Unknown error',
      'UnknownError'
    );
  }
}

// ==============================================
// API CLIENT
// ==============================================

export const apiClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: RequestParams): Promise<T> {
    const url = buildUrl(endpoint, params);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return handleResponse<T>(response);
  },

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    return handleResponse<T>(response);
  },

  /**
   * DELETE request
   */
  async delete<T = void>(endpoint: string): Promise<T> {
    const url = buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return handleResponse<T>(response);
  },
};

export default apiClient;
