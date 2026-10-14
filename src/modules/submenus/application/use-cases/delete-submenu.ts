import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import { hasPermissionOn } from '../../../permissions/application/services/has-permission-on.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Submenu } from '../../domain/submenu.js';
import { SubmenuNotFoundError } from '../../domain/submenu-errors.js';
import type { SubmenuRepository } from '../ports/submenu-repository.js';

export type SubmenuDeleteBlockers = {
  permissions?: PermissionRepository;
};

export class DeleteSubmenu {
  constructor(private readonly submenus: SubmenuRepository, private readonly blockers: SubmenuDeleteBlockers = {}) {}

  async execute(id: string): Promise<Submenu> {
    const submenu = await this.ensureDeletable(id);
    await this.submenus.remove(id);
    return submenu;
  }

  async ensureDeletable(id: string): Promise<Submenu> {
    const submenu = await this.submenus.findById(id);
    if (!submenu) throw new SubmenuNotFoundError();
    if (this.blockers.permissions && await hasPermissionOn(this.blockers.permissions, 'SUBMENU', id)) throw new DeleteRestrictedError();
    return submenu;
  }
}
