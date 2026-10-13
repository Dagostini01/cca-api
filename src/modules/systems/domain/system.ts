import { InvalidSystemNameError } from './system-errors.js';

export const SYSTEM_NAME_MAX_LENGTH = 128;

export type SystemStatus = 'ATIVO' | 'INATIVO';

export type System = {
  id: string;
  empresaId: string;
  nome: string;
  status: SystemStatus;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function normalizeSystemName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > SYSTEM_NAME_MAX_LENGTH) throw new InvalidSystemNameError();
  return normalized;
}

export function systemNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
