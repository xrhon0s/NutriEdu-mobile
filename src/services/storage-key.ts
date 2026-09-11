const VALID_STORAGE_KEY = /^[A-Za-z0-9._-]+$/;

export function assertValidStorageKey(key: string) {
  if (!key || !VALID_STORAGE_KEY.test(key)) {
    throw new Error(`Invalid storage key: ${key || '(empty)'}`);
  }
  return key;
}

export function scopedStorageKey(base: string, scope: string | number) {
  return assertValidStorageKey(`${base}_${scope}`);
}
