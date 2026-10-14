import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import { hasPermissionOn } from '../../../permissions/application/services/has-permission-on.js';
import type { SubmenuRepository } from '../../../submenus/application/ports/submenu-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Menu } from '../../domain/menu.js';
import { MenuNotFoundError } from '../../domain/menu-errors.js';
import type { MenuRepository } from '../ports/menu-repository.js';

export type MenuDeleteBlockers = {
  submenus?: SubmenuRepository;
  permissions?: PermissionRepository;
};

export class DeleteMenu {
  constructor(private readonly menus: MenuRepository, private readonly blockers: MenuDeleteBlockers = {}) {}

  async execute(id: string): Promise<Menu> {
    const menu = await this.ensureDeletable(id);
    await this.menus.remove(id);
    return menu;
  }

  async ensureDeletable(id: string): Promise<Menu> {
    const menu = await this.menus.findById(id);
    if (!menu) throw new MenuNotFoundError();
    if ((await this.blockers.submenus?.list(id))?.length) throw new DeleteRestrictedError();
    if (this.blockers.permissions && await hasPermissionOn(this.blockers.permissions, 'MENU', id)) throw new DeleteRestrictedError();
    return menu;
  }
}
