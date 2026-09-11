import { describe, expect, it } from 'vitest';
import { assertValidStorageKey, scopedStorageKey } from './storage-key';

describe('storage keys', () => {
  it('creates Expo SecureStore-compatible scoped keys', () => {
    expect(scopedStorageKey('nutriedu_shopping_checked', 42)).toBe('nutriedu_shopping_checked_42');
  });

  it('rejects empty keys and unsupported separators', () => {
    expect(() => assertValidStorageKey('')).toThrow(/Invalid storage key/);
    expect(() => assertValidStorageKey('shopping:42')).toThrow(/Invalid storage key/);
  });
});
