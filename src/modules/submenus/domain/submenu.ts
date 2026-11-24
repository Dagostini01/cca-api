import type { CatalogStatus } from '../../../shared/catalog/status.js';
import { InvalidSubmenuNameError } from './submenu-errors.js';

export const SUBMENU_NAME_MAX_LENGTH = 128;

export type SubmenuStatus = CatalogStatus;

export type Submenu = {
  id: number;
  menuId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: SubmenuStatus;
  criadoEm: Date;
};

export function normalizeSubmenuName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > SUBMENU_NAME_MAX_LENGTH) throw new InvalidSubmenuNameError();
  return normalized;
}

export function submenuNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
