import type { CatalogStatus } from '../../../shared/catalog/status.js';
import { InvalidMenuNameError } from './menu-errors.js';

export const MENU_NAME_MAX_LENGTH = 128;

export type MenuStatus = CatalogStatus;

export type Menu = {
  id: number;
  moduloId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: MenuStatus;
  criadoEm: Date;
};

export function normalizeMenuName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > MENU_NAME_MAX_LENGTH) throw new InvalidMenuNameError();
  return normalized;
}

export function menuNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
