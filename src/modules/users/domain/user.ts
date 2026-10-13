import { InvalidUserEmailError, InvalidUserNameError, InvalidUserSubjectError } from './user-errors.js';

export const USER_NAME_MAX_LENGTH = 128;
export const USER_EMAIL_MAX_LENGTH = 254;

const SUBJECT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserStatus = 'ATIVO' | 'INATIVO';

export type BusinessUser = {
  id: string;
  keycloakSub: string;
  nome: string;
  email: string;
  empresaId: string;
  status: UserStatus;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function normalizeUserName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > USER_NAME_MAX_LENGTH) throw new InvalidUserNameError();
  return normalized;
}

export function normalizeUserEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > USER_EMAIL_MAX_LENGTH || !EMAIL.test(normalized)) {
    throw new InvalidUserEmailError();
  }
  return normalized;
}

export function normalizeKeycloakSubject(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!SUBJECT.test(normalized)) throw new InvalidUserSubjectError();
  return normalized;
}
