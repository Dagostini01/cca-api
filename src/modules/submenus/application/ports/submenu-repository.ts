import type { Submenu, SubmenuStatus } from '../../domain/submenu.js';

export type NewSubmenu = {
  menuId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: SubmenuStatus;
};

export type SubmenuListFilter = {
  menuId?: number;
  q?: string;
};

export type SubmenuPageQuery = SubmenuListFilter & {
  pagina: number;
  tamanho: number;
};

export interface SubmenuRepository {
  add(submenu: NewSubmenu): Promise<Submenu>;
  list(filter?: SubmenuListFilter): Promise<Submenu[]>;
  page(query: SubmenuPageQuery): Promise<{ rows: Submenu[]; total: number }>;
  findById(id: number): Promise<Submenu | null>;
  save(submenu: Submenu): Promise<Submenu>;
  remove(id: number): Promise<void>;
}
