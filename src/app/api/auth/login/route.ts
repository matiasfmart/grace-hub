import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  try {
    const body = await request.json() as unknown;

    const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json() as { message?: string; statusCode?: number; error?: string };

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    // Extract JWT from the backend's Set-Cookie header
    const rawSetCookie = backendRes.headers.get('set-cookie') ?? '';
    const tokenMatch = rawSetCookie.match(/^auth=([^;]+)/);

    if (tokenMatch) {
      const cookieStore = await cookies();
      cookieStore.set('auth', tokenMatch[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });
    }

    return NextResponse.json({ message: 'Login successful' });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
