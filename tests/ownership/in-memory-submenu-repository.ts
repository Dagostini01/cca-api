import { randomUUID } from 'node:crypto';
import type { NewSubmenu, SubmenuRepository } from '../../src/modules/submenus/application/ports/submenu-repository.js';
import { submenuNamesConflict, type Submenu } from '../../src/modules/submenus/domain/submenu.js';
import { SubmenuNameConflictError, SubmenuNotFoundError } from '../../src/modules/submenus/domain/submenu-errors.js';

function clone(submenu: Submenu): Submenu {
  return { ...submenu, criadoEm: new Date(submenu.criadoEm), atualizadoEm: new Date(submenu.atualizadoEm) };
}

export class InMemorySubmenuRepository implements SubmenuRepository {
  private readonly submenus = new Map<string, Submenu>();

  async add(submenu: NewSubmenu): Promise<Submenu> {
    this.assertNameAvailable(submenu.menuId, submenu.nome, null);
    const now = new Date();
    const stored: Submenu = { id: randomUUID(), ...submenu, criadoEm: now, atualizadoEm: now };
    this.submenus.set(stored.id, stored);
    return clone(stored);
  }

  async list(menuId?: string): Promise<Submenu[]> {
    return [...this.submenus.values()].filter((submenu) => menuId === undefined || submenu.menuId === menuId).map(clone);
  }

  async findById(id: string): Promise<Submenu | null> {
    const submenu = this.submenus.get(id);
    return submenu ? clone(submenu) : null;
  }

  async save(submenu: Submenu): Promise<Submenu> {
    if (!this.submenus.has(submenu.id)) throw new SubmenuNotFoundError();
    this.assertNameAvailable(submenu.menuId, submenu.nome, submenu.id);
    const stored: Submenu = { ...submenu, atualizadoEm: new Date() };
    this.submenus.set(submenu.id, stored);
    return clone(stored);
  }

  private assertNameAvailable(menuId: string, nome: string, ignoreId: string | null) {
    for (const submenu of this.submenus.values()) {
      if (submenu.menuId === menuId && submenu.id !== ignoreId && submenuNamesConflict(submenu.nome, nome)) {
        throw new SubmenuNameConflictError();
      }
    }
  }
}
