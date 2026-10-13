import type { Menu } from '../../domain/menu.js';
import type { MenuRepository } from '../ports/menu-repository.js';

export class ListMenus {
  constructor(private readonly menus: MenuRepository) {}

  async execute(filter: { moduloId?: string } = {}): Promise<Menu[]> {
    const menus = await this.menus.list(filter.moduloId);
    return [...menus].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.moduloId.localeCompare(right.moduloId));
  }
}
