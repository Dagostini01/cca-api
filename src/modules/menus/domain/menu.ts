import { InvalidMenuNameError } from './menu-errors.js';

export const MENU_NAME_MAX_LENGTH = 128;

export type MenuStatus = 'ATIVO' | 'INATIVO';

export type Menu = {
  id: string;
  moduloId: string;
  nome: string;
  status: MenuStatus;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function normalizeMenuName(nome: string): string {
  const normalized = nome.trim();
  if (normalized.length === 0 || normalized.length > MENU_NAME_MAX_LENGTH) throw new InvalidMenuNameError();
  return normalized;
}

export function menuNamesConflict(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}
