import { TFunction } from 'i18next';
import { ApiError } from './api';

export function rateLimitMessage(error: unknown, t: TFunction) {
  if (!(error instanceof ApiError) || error.code !== 'RATE_LIMITED') return null;
  const minutes = Math.max(1, Math.ceil((error.retryAfterSeconds || 60) / 60));
  return t('auth.errors.rateLimited', { count: minutes });
}
