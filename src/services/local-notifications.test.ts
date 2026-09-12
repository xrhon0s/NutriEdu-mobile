import { describe, expect, it } from 'vitest';
import { isQuietTime, resolveNotificationPermission } from './notification-scheduling';

describe('local notification helpers', () => {
  it('normalizes native permission responses', () => {
    expect(resolveNotificationPermission({ granted: true, status: 'granted' })).toBe('granted');
    expect(resolveNotificationPermission({ granted: false, status: 'denied' })).toBe('denied');
    expect(resolveNotificationPermission({ granted: false, status: 'undetermined' })).toBe('undetermined');
    expect(resolveNotificationPermission(null)).toBe('undetermined');
  });

  it('detects quiet hours across midnight', () => {
    expect(isQuietTime('23:30', '22:00', '07:00')).toBe(true);
    expect(isQuietTime('06:30', '22:00', '07:00')).toBe(true);
    expect(isQuietTime('12:00', '22:00', '07:00')).toBe(false);
  });

  it('handles same-day and disabled quiet-hour ranges', () => {
    expect(isQuietTime('13:00', '12:00', '14:00')).toBe(true);
    expect(isQuietTime('14:00', '12:00', '14:00')).toBe(false);
    expect(isQuietTime('13:00', null, '14:00')).toBe(false);
    expect(isQuietTime('13:00', '12:00', '12:00')).toBe(false);
  });
});
