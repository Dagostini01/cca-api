import type { Menu, MenuStatus } from '../../domain/menu.js';

export type NewMenu = {
  moduloId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  status: MenuStatus;
};

export type MenuListFilter = {
  moduloId?: number;
  q?: string;
};

export type MenuPageQuery = MenuListFilter & {
  pagina: number;
  tamanho: number;
};

export interface MenuRepository {
  add(menu: NewMenu): Promise<Menu>;
  list(filter?: MenuListFilter): Promise<Menu[]>;
  page(query: MenuPageQuery): Promise<{ rows: Menu[]; total: number }>;
  findById(id: number): Promise<Menu | null>;
  save(menu: Menu): Promise<Menu>;
  remove(id: number): Promise<void>;
}
