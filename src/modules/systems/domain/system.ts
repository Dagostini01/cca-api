import type { CatalogStatus } from '../../../shared/catalog/status.js';
import { InvalidSystemNameError } from './system-errors.js';

export const SYSTEM_NAME_MAX_LENGTH = 128;

export type SystemStatus = CatalogStatus;

export type System = {
  id: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: SystemStatus;
  empresaIds: number[];
  criadoEm: Date;
};

export function normalizeSystemName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > SYSTEM_NAME_MAX_LENGTH) throw new InvalidSystemNameError();
  return normalized;
}

export function systemNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
