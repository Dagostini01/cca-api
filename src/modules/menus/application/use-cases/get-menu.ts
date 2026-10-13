import type { Menu } from '../../domain/menu.js';
import { MenuNotFoundError } from '../../domain/menu-errors.js';
import type { MenuRepository } from '../ports/menu-repository.js';

export class GetMenu {
  constructor(private readonly menus: MenuRepository) {}

  async execute(id: string): Promise<Menu> {
    const menu = await this.menus.findById(id);
    if (!menu) throw new MenuNotFoundError();
    return menu;
  }
}
