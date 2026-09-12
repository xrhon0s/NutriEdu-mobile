export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export type PasswordChecks = {
  minLength: boolean;
  maxBytes: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  symbol: boolean;
};

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length;

export const passwordChecks = (password: string): PasswordChecks => ({
  minLength: password.length >= PASSWORD_MIN_LENGTH,
  maxBytes: utf8ByteLength(password) <= PASSWORD_MAX_BYTES,
  lowercase: /[a-z]/.test(password),
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
  symbol: /[^A-Za-z0-9\s]/.test(password),
});

export const isPasswordValid = (password: string) => Object.values(passwordChecks(password)).every(Boolean);
