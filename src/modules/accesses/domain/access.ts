import type { CatalogStatus, UserType } from '../../../shared/catalog/status.js';

export type AccessStatus = CatalogStatus;

export type ScreenRef = {
  empresaId: number;
  sistemaId: number;
  moduloId: number;
  menuId: number;
  submenuId: number;
};

export type ScreenAccess = ScreenRef & {
  id: number;
  usuarioId: number;
  tipo: UserType;
  status: AccessStatus;
  criadoEm: Date;
};

export type ScreenAccessView = ScreenAccess & {
  empresa: string;
  sistema: string;
  modulo: string;
  menu: string;
  submenu: string;
};

export type ScreenView = {
  sistemaId: number;
  sistema: string;
  moduloId: number;
  modulo: string;
  menuId: number;
  menu: string;
  submenuId: number;
  submenu: string;
};
