import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Submenu } from '../../domain/submenu.js';
import { SubmenuNotFoundError } from '../../domain/submenu-errors.js';
import type { SubmenuRepository } from '../ports/submenu-repository.js';

export type SubmenuDeleteBlockers = {
  accesses?: AccessRepository;
};

export class DeleteSubmenu {
  constructor(private readonly submenus: SubmenuRepository, private readonly blockers: SubmenuDeleteBlockers = {}) {}

  async execute(id: number): Promise<Submenu> {
    const submenu = await this.ensureDeletable(id);
    await this.submenus.remove(id);
    return submenu;
  }

  async ensureDeletable(id: number): Promise<Submenu> {
    const submenu = await this.submenus.findById(id);
    if (!submenu) throw new SubmenuNotFoundError();
    if ((await this.blockers.accesses?.list({ submenuId: id }))?.length) throw new DeleteRestrictedError();
    return submenu;
  }
}
