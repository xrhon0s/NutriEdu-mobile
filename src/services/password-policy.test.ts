import { describe, expect, it } from 'vitest';
import { isPasswordValid, passwordChecks } from './password-policy';

describe('mobile password policy', () => {
  it.each(['1234', 'password123!', 'PASSWORD123!', 'Password!!!', 'Password123'])(
    'rejects weak password %s',
    (password) => expect(isPasswordValid(password)).toBe(false),
  );

  it('accepts the same strong password as the backend contract', () => {
    expect(isPasswordValid('NutriEdu#2026')).toBe(true);
  });

  it('enforces the bcrypt UTF-8 byte limit', () => {
    expect(passwordChecks(`A1!${'a'.repeat(70)}`).maxBytes).toBe(false);
    expect(passwordChecks(`A1!${'á'.repeat(35)}`).maxBytes).toBe(false);
  });
});
