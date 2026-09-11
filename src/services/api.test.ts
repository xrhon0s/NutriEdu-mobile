import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, setUnauthorizedHandler } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setUnauthorizedHandler(null);
});

describe('apiRequest', () => {
  it('returns parsed JSON for successful requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await expect(apiRequest<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true });
  });

  it('preserves API messages and status codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Solicitud invalida' }), { status: 400 })));
    await expect(apiRequest('/invalid')).rejects.toMatchObject({ message: 'Solicitud invalida', status: 400 });
  });

  it('converts connectivity failures into a user-facing error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network request failed')));
    await expect(apiRequest('/profile')).rejects.toMatchObject({ status: 0 });
  });

  it('notifies authentication only for rejected protected requests', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Token invalido' }), { status: 401 })));

    await expect(apiRequest('/profile', { token: 'expired' })).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();

    handler.mockClear();
    await expect(apiRequest('/users/login', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });
});
