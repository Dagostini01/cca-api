import type { CatalogStatus } from '../../../shared/catalog/status.js';
import { InvalidModuleNameError } from './module-errors.js';

export const MODULE_NAME_MAX_LENGTH = 128;

export type ModuleStatus = CatalogStatus;

export type Module = {
  id: number;
  sistemaId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: ModuleStatus;
  criadoEm: Date;
};

export function normalizeModuleName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > MODULE_NAME_MAX_LENGTH) throw new InvalidModuleNameError();
  return normalized;
}

export function moduleNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
