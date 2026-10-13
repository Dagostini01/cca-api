import type { Submenu } from '../../domain/submenu.js';
import type { SubmenuRepository } from '../ports/submenu-repository.js';

export class ListSubmenus {
  constructor(private readonly submenus: SubmenuRepository) {}

  async execute(filter: { menuId?: string } = {}): Promise<Submenu[]> {
    const submenus = await this.submenus.list(filter.menuId);
    return [...submenus].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.menuId.localeCompare(right.menuId));
  }
}
