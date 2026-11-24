import type { NewSubmenu, SubmenuListFilter, SubmenuPageQuery, SubmenuRepository } from '../../src/modules/submenus/application/ports/submenu-repository.js';
import { submenuNamesConflict, type Submenu } from '../../src/modules/submenus/domain/submenu.js';
import { SubmenuNameConflictError, SubmenuNotFoundError } from '../../src/modules/submenus/domain/submenu-errors.js';
import { slicePage, textIncludes } from '../../src/shared/http/page.js';

function clone(submenu: Submenu): Submenu {
  return { ...submenu, criadoEm: new Date(submenu.criadoEm) };
}

export class InMemorySubmenuRepository implements SubmenuRepository {
  private readonly submenus = new Map<number, Submenu>();
  private nextId = 1;

  async add(submenu: NewSubmenu): Promise<Submenu> {
    this.assertName(submenu.menuId, submenu.nome, null);
    const stored: Submenu = { id: this.nextId++, ...submenu, criadoEm: new Date() };
    this.submenus.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: SubmenuListFilter = {}): Promise<Submenu[]> {
    const q = filter.q?.trim() ?? '';
    return [...this.submenus.values()].filter((submenu) => (
      (filter.menuId === undefined || submenu.menuId === filter.menuId)
      && (!q || textIncludes(submenu.nome, q) || textIncludes(submenu.descricaoCurta, q) || textIncludes(submenu.descricaoLonga, q))
    )).map(clone);
  }

  async page(query: SubmenuPageQuery) {
    const rows = (await this.list(query)).sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.menuId - right.menuId || left.id - right.id);
    return slicePage(rows, query.pagina, query.tamanho);
  }

  async findById(id: number): Promise<Submenu | null> {
    const submenu = this.submenus.get(id);
    return submenu ? clone(submenu) : null;
  }

  async save(submenu: Submenu): Promise<Submenu> {
    if (!this.submenus.has(submenu.id)) throw new Error('submenu missing from memory');
    this.assertName(submenu.menuId, submenu.nome, submenu.id);
    this.submenus.set(submenu.id, submenu);
    return clone(submenu);
  }

  async remove(id: number): Promise<void> {
    if (!this.submenus.delete(id)) throw new SubmenuNotFoundError();
  }

  private assertName(menuId: number, nome: string, ignoreId: number | null) {
    for (const submenu of this.submenus.values()) {
      if (submenu.menuId === menuId && submenu.id !== ignoreId && submenuNamesConflict(submenu.nome, nome)) {
        throw new SubmenuNameConflictError();
      }
    }
  }
}
