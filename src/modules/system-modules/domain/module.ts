import { InvalidModuleNameError } from './module-errors.js';

export const MODULE_NAME_MAX_LENGTH = 128;

export type ModuleStatus = 'ATIVO' | 'INATIVO';

export type Module = {
  id: string;
  sistemaId: string;
  nome: string;
  status: ModuleStatus;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function normalizeModuleName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > MODULE_NAME_MAX_LENGTH) throw new InvalidModuleNameError();
  return normalized;
}

export function moduleNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
