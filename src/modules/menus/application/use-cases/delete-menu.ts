import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { SubmenuRepository } from '../../../submenus/application/ports/submenu-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Menu } from '../../domain/menu.js';
import { MenuNotFoundError } from '../../domain/menu-errors.js';
import type { MenuRepository } from '../ports/menu-repository.js';

export type MenuDeleteBlockers = {
  submenus?: SubmenuRepository;
  accesses?: AccessRepository;
};

export class DeleteMenu {
  constructor(private readonly menus: MenuRepository, private readonly blockers: MenuDeleteBlockers = {}) {}

  async execute(id: number): Promise<Menu> {
    const menu = await this.ensureDeletable(id);
    await this.menus.remove(id);
    return menu;
  }

  async ensureDeletable(id: number): Promise<Menu> {
    const menu = await this.menus.findById(id);
    if (!menu) throw new MenuNotFoundError();
    if ((await this.blockers.submenus?.list({ menuId: id }))?.length) throw new DeleteRestrictedError();
    if ((await this.blockers.accesses?.list({ menuId: id }))?.length) throw new DeleteRestrictedError();
    return menu;
  }
}
