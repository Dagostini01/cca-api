import type { Page } from '../../../../shared/http/page.js';
import type { Menu } from '../../domain/menu.js';
import type { MenuListFilter, MenuPageQuery, MenuRepository } from '../ports/menu-repository.js';

export class ListMenus {
  constructor(private readonly menus: MenuRepository) {}

  async execute(filter: MenuListFilter = {}): Promise<Menu[]> {
    const menus = await this.menus.list(filter);
    return [...menus].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.moduloId - right.moduloId || left.id - right.id);
  }

  async page(query: MenuPageQuery): Promise<Page<Menu>> {
    const { rows, total } = await this.menus.page(query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}
