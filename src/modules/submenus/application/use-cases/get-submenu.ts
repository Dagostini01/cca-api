import type { Submenu } from '../../domain/submenu.js';
import { SubmenuNotFoundError } from '../../domain/submenu-errors.js';
import type { SubmenuRepository } from '../ports/submenu-repository.js';

export class GetSubmenu {
  constructor(private readonly submenus: SubmenuRepository) {}

  async execute(id: string): Promise<Submenu> {
    const submenu = await this.submenus.findById(id);
    if (!submenu) throw new SubmenuNotFoundError();
    return submenu;
  }
}
