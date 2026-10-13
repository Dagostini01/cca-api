import type { Submenu, SubmenuStatus } from '../../domain/submenu.js';

export type NewSubmenu = {
  menuId: string;
  nome: string;
  status: SubmenuStatus;
};

export interface SubmenuRepository {
  add(submenu: NewSubmenu): Promise<Submenu>;
  list(menuId?: string): Promise<Submenu[]>;
  findById(id: string): Promise<Submenu | null>;
  save(submenu: Submenu): Promise<Submenu>;
}
