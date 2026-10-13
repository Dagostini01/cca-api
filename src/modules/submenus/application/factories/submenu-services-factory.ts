import type { ParentMenuLookup } from '../ports/parent-menu-lookup.js';
import type { SubmenuRepository } from '../ports/submenu-repository.js';
import { CreateSubmenu } from '../use-cases/create-submenu.js';
import { GetSubmenu } from '../use-cases/get-submenu.js';
import { ListSubmenus } from '../use-cases/list-submenus.js';
import { UpdateSubmenu } from '../use-cases/update-submenu.js';

export type SubmenuServices = {
  createSubmenu: CreateSubmenu;
  listSubmenus: ListSubmenus;
  getSubmenu: GetSubmenu;
  updateSubmenu: UpdateSubmenu;
};

export function createSubmenuServices(submenus: SubmenuRepository, menus: ParentMenuLookup): SubmenuServices {
  return {
    createSubmenu: new CreateSubmenu(submenus, menus),
    listSubmenus: new ListSubmenus(submenus),
    getSubmenu: new GetSubmenu(submenus),
    updateSubmenu: new UpdateSubmenu(submenus, menus),
  };
}
