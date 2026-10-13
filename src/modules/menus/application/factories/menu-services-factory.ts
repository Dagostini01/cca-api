import type { MenuRepository } from '../ports/menu-repository.js';
import type { ParentModuleLookup } from '../ports/parent-module-lookup.js';
import { CreateMenu } from '../use-cases/create-menu.js';
import { GetMenu } from '../use-cases/get-menu.js';
import { ListMenus } from '../use-cases/list-menus.js';
import { UpdateMenu } from '../use-cases/update-menu.js';

export type MenuServices = {
  createMenu: CreateMenu;
  listMenus: ListMenus;
  getMenu: GetMenu;
  updateMenu: UpdateMenu;
};

export function createMenuServices(menus: MenuRepository, modules: ParentModuleLookup): MenuServices {
  return {
    createMenu: new CreateMenu(menus, modules),
    listMenus: new ListMenus(menus),
    getMenu: new GetMenu(menus),
    updateMenu: new UpdateMenu(menus, modules),
  };
}
