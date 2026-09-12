import { describe, expect, it } from 'vitest';
import { profileEn, profileEs } from './profile';

const keys = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
};

describe('profile translations', () => {
  it('keeps Spanish and English resources structurally aligned', () => {
    expect(keys(profileEn).sort()).toEqual(keys(profileEs).sort());
  });
});
