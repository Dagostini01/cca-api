import type { Menu, MenuStatus } from '../../domain/menu.js';

export type NewMenu = {
  moduloId: string;
  nome: string;
  status: MenuStatus;
};

export interface MenuRepository {
  add(menu: NewMenu): Promise<Menu>;
  list(moduloId?: string): Promise<Menu[]>;
  findById(id: string): Promise<Menu | null>;
  save(menu: Menu): Promise<Menu>;
}
