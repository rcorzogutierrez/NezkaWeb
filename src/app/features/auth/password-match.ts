import { type SchemaPath, minLength, required, validate } from '@angular/forms/signals';

export const MIN_PASSWORD_LENGTH = 8;

/** A new password: required, long enough, and typed the same twice. */
export function newPassword(password: SchemaPath<string>, confirm: SchemaPath<string>): void {
  required(password);
  minLength(password, MIN_PASSWORD_LENGTH);
  required(confirm);
  validate(confirm, ({ value, valueOf }) =>
    value() && value() !== valueOf(password) ? { kind: 'mismatch' } : undefined,
  );
}
