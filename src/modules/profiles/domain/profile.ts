import { InvalidProfileDescriptionError, InvalidProfileNameError } from './profile-errors.js';

export const PROFILE_NAME_MAX_LENGTH = 128;
export const PROFILE_DESCRIPTION_MAX_LENGTH = 512;

export type ProfileStatus = 'ATIVO' | 'INATIVO';

export type Profile = {
  id: string;
  empresaId: string;
  nome: string;
  descricao: string | null;
  status: ProfileStatus;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function normalizeProfileName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > PROFILE_NAME_MAX_LENGTH) throw new InvalidProfileNameError();
  return normalized;
}

export function normalizeProfileDescription(descricao: string | null): string | null {
  if (descricao === null) return null;
  const normalized = descricao.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > PROFILE_DESCRIPTION_MAX_LENGTH) throw new InvalidProfileDescriptionError();
  return normalized;
}

export function profileNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
