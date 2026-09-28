import { TFunction } from 'i18next';
import { ApiError } from './api';

export function authApiErrorMessage(error: unknown, t: TFunction) {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'REQUEST_TIMEOUT') return t('auth.errors.requestTimeout');
  if (error.code === 'NETWORK_ERROR') return t('auth.errors.network');
  if (error.code === 'RATE_LIMITED') {
    const minutes = Math.max(1, Math.ceil((error.retryAfterSeconds || 60) / 60));
    return t('auth.errors.rateLimited', { count: minutes });
  }
  return null;
}
