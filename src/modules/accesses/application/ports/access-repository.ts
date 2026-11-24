import type { AccessStatus, ScreenAccess, ScreenAccessView, ScreenRef } from '../../domain/access.js';
import type { UserType } from '../../../../shared/catalog/status.js';

export type NewScreenAccess = ScreenRef & {
  usuarioId: number;
  tipo: UserType;
  status: AccessStatus;
};

export type ScreenDraft = ScreenRef & {
  tipo: UserType;
  status: AccessStatus;
};

export type ScreenListFilter = {
  usuarioId?: number;
  empresaId?: number;
  sistemaId?: number;
  moduloId?: number;
  menuId?: number;
  submenuId?: number;
};

export type ScreenViewFilter = ScreenListFilter & {
  q?: string;
};

export type ScreenPageQuery = ScreenViewFilter & {
  pagina: number;
  tamanho: number;
};

export interface AccessRepository {
  add(access: NewScreenAccess): Promise<ScreenAccess>;
  replace(usuarioId: number, screens: ScreenDraft[]): Promise<ScreenAccess[]>;
  list(filter?: ScreenListFilter): Promise<ScreenAccess[]>;
  listViews(filter?: ScreenViewFilter): Promise<ScreenAccessView[]>;
  pageViews(query: ScreenPageQuery): Promise<{ rows: ScreenAccessView[]; total: number }>;
  findById(id: number): Promise<ScreenAccess | null>;
  save(access: ScreenAccess): Promise<ScreenAccess>;
  remove(id: number): Promise<void>;
}
