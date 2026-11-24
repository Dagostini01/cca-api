import type { MenuListFilter, MenuPageQuery, MenuRepository, NewMenu } from '../../src/modules/menus/application/ports/menu-repository.js';
import { menuNamesConflict, type Menu } from '../../src/modules/menus/domain/menu.js';
import { MenuNameConflictError, MenuNotFoundError } from '../../src/modules/menus/domain/menu-errors.js';
import { slicePage, textIncludes } from '../../src/shared/http/page.js';

function clone(menu: Menu): Menu {
  return { ...menu, criadoEm: new Date(menu.criadoEm) };
}

export class InMemoryMenuRepository implements MenuRepository {
  private readonly menus = new Map<number, Menu>();
  private nextId = 1;

  async add(menu: NewMenu): Promise<Menu> {
    this.assertName(menu.moduloId, menu.nome, null);
    const stored: Menu = { id: this.nextId++, ...menu, criadoEm: new Date() };
    this.menus.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: MenuListFilter = {}): Promise<Menu[]> {
    const q = filter.q?.trim() ?? '';
    return [...this.menus.values()].filter((menu) => (
      (filter.moduloId === undefined || menu.moduloId === filter.moduloId)
      && (!q || textIncludes(menu.nome, q) || textIncludes(menu.descricaoCurta, q) || textIncludes(menu.descricaoLonga, q))
    )).map(clone);
  }

  async page(query: MenuPageQuery) {
    const rows = (await this.list(query)).sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.moduloId - right.moduloId || left.id - right.id);
    return slicePage(rows, query.pagina, query.tamanho);
  }

  async findById(id: number): Promise<Menu | null> {
    const menu = this.menus.get(id);
    return menu ? clone(menu) : null;
  }

  async save(menu: Menu): Promise<Menu> {
    if (!this.menus.has(menu.id)) throw new Error('menu missing from memory');
    this.assertName(menu.moduloId, menu.nome, menu.id);
    this.menus.set(menu.id, menu);
    return clone(menu);
  }

  async remove(id: number): Promise<void> {
    if (!this.menus.delete(id)) throw new MenuNotFoundError();
  }

  private assertName(moduloId: number, nome: string, ignoreId: number | null) {
    for (const menu of this.menus.values()) {
      if (menu.moduloId === moduloId && menu.id !== ignoreId && menuNamesConflict(menu.nome, nome)) throw new MenuNameConflictError();
    }
  }
}
