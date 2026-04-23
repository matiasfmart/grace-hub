import { apiClient } from '../client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface MeResponse {
  id: number;
  email: string;
}

export const authEndpoint = {
  /**
   * Login via Next.js API proxy so the cookie is set on localhost:3000
   * and is reliably available to the Next.js middleware.
   */
  async login(dto: LoginRequest): Promise<{ message: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const body = await res.json() as { message?: string };
      throw Object.assign(new Error(body.message ?? 'Login failed'), { statusCode: res.status });
    }
    return res.json() as Promise<{ message: string }>;
  },

  async register(dto: RegisterRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/register', dto);
  },

  /**
   * Get current user via Next.js API proxy.
   * The browser calls /api/auth/me (same domain), the Route Handler
   * reads the httpOnly cookie server-side and forwards it to the backend.
   * This prevents cross-domain cookie issues in production.
   */
  async me(): Promise<MeResponse> {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json() as Promise<MeResponse>;
  },

  /**
   * Logout via Next.js API proxy to clear the cookie on localhost:3000.
   */
  async logout(): Promise<{ message: string }> {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    return res.json() as Promise<{ message: string }>;
  },
};
