import { DomainError } from '../errors/domain-error.js';

export const SHORT_TEXT_MAX_LENGTH = 64;
export const LONG_TEXT_MAX_LENGTH = 128;

export class InvalidCatalogTextError extends DomainError {
  readonly code = 'invalid_catalog_text';

  constructor() {
    super('invalid_catalog_text');
  }
}

export function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > maxLength) throw new InvalidCatalogTextError();
  return normalized;
}

export function trimChar(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
