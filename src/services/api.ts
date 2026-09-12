const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://nutriedu-backend.onrender.com/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string | null;
  retryAfterSeconds: number | null;
  requestId: string | null;

  constructor(message: string, status: number, code: string | null = null, retryAfterSeconds: number | null = null, requestId: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.requestId = requestId;
  }
}

type UnauthorizedHandler = () => void | Promise<void>;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

type RequestOptions = RequestInit & { token?: string | null };

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('No pudimos conectar con NutriEdu. Revisa tu conexion e intenta de nuevo.', 0);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && options.token) void unauthorizedHandler?.();
    const retryAfterSeconds = Number.isFinite(Number(data?.retryAfterSeconds)) ? Number(data.retryAfterSeconds) : null;
    throw new ApiError(
      data?.message || data?.error || 'No pudimos completar la solicitud',
      response.status,
      data?.code || null,
      retryAfterSeconds,
      data?.requestId || response.headers.get('X-Request-ID')
    );
  }

  return data as T;
}

export { API_URL };
