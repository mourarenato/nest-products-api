const TOKEN_KEY = 'auth_token';
const COOKIE_KEY = 'auth_token';

export type UserRole = 'ADMIN' | 'PROFESSIONAL';

type JwtPayload = {
  role?: UserRole;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=lax`;
}

export function clearToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}

export function getRoleFromToken(token: string): UserRole | null {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      return null;
    }

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(normalized);
    const payload = JSON.parse(payloadJson) as JwtPayload;

    if (payload.role === 'ADMIN' || payload.role === 'PROFESSIONAL') {
      return payload.role;
    }

    return null;
  } catch {
    return null;
  }
}
