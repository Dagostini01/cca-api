import type { CatalogStatus, UserType } from '../../../shared/catalog/status.js';
import { InvalidUserDocumentError, InvalidUserEmailError, InvalidUserNameError, InvalidUserSubjectError } from './user-errors.js';

export const USER_NAME_MAX_LENGTH = 128;
export const USER_EMAIL_MAX_LENGTH = 64;
export const USER_DOCUMENT_MAX_LENGTH = 15;
export const USER_PHONE_MAX_LENGTH = 20;

const SUBJECT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserStatus = CatalogStatus;

export type BusinessUser = {
  id: number;
  keycloakSub: string | null;
  nome: string;
  sobrenome: string | null;
  apelido: string | null;
  rg: string | null;
  cpf: string | null;
  email: string | null;
  celular: string | null;
  tipo: UserType;
  status: UserStatus;
  criadoPorId: number | null;
  criadoEm: Date;
};

export function normalizeUserName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > USER_NAME_MAX_LENGTH) throw new InvalidUserNameError();
  return normalized;
}

export function normalizeOptionalUserName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > USER_NAME_MAX_LENGTH) throw new InvalidUserNameError();
  return normalized;
}

export function normalizeUserEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > USER_EMAIL_MAX_LENGTH || !EMAIL.test(normalized)) {
    throw new InvalidUserEmailError();
  }
  return normalized;
}

export function normalizeOptionalUserDocument(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > maxLength) throw new InvalidUserDocumentError();
  return normalized;
}

export function normalizeKeycloakSubject(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!SUBJECT.test(normalized)) throw new InvalidUserSubjectError();
  return normalized;
}
