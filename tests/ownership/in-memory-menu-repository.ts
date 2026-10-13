import { randomUUID } from 'node:crypto';
import type { MenuRepository, NewMenu } from '../../src/modules/menus/application/ports/menu-repository.js';
import { menuNamesConflict, type Menu } from '../../src/modules/menus/domain/menu.js';
import { MenuNameConflictError, MenuNotFoundError } from '../../src/modules/menus/domain/menu-errors.js';

function clone(menu: Menu): Menu {
  return { ...menu, criadoEm: new Date(menu.criadoEm), atualizadoEm: new Date(menu.atualizadoEm) };
}

export class InMemoryMenuRepository implements MenuRepository {
  private readonly menus = new Map<string, Menu>();

  async add(menu: NewMenu): Promise<Menu> {
    this.assertNameAvailable(menu.moduloId, menu.nome, null);
    const now = new Date();
    const stored: Menu = { id: randomUUID(), ...menu, criadoEm: now, atualizadoEm: now };
    this.menus.set(stored.id, stored);
    return clone(stored);
  }

  async list(moduloId?: string): Promise<Menu[]> {
    return [...this.menus.values()].filter((menu) => moduloId === undefined || menu.moduloId === moduloId).map(clone);
  }

  async findById(id: string): Promise<Menu | null> {
    const menu = this.menus.get(id);
    return menu ? clone(menu) : null;
  }

  async save(menu: Menu): Promise<Menu> {
    if (!this.menus.has(menu.id)) throw new MenuNotFoundError();
    this.assertNameAvailable(menu.moduloId, menu.nome, menu.id);
    const stored: Menu = { ...menu, atualizadoEm: new Date() };
    this.menus.set(menu.id, stored);
    return clone(stored);
  }

  private assertNameAvailable(moduloId: string, nome: string, ignoreId: string | null) {
    for (const menu of this.menus.values()) {
      if (menu.moduloId === moduloId && menu.id !== ignoreId && menuNamesConflict(menu.nome, nome)) {
        throw new MenuNameConflictError();
      }
    }
  }
}
