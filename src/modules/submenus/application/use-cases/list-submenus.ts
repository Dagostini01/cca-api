import type { Page } from '../../../../shared/http/page.js';
import type { Submenu } from '../../domain/submenu.js';
import type { SubmenuListFilter, SubmenuPageQuery, SubmenuRepository } from '../ports/submenu-repository.js';

export class ListSubmenus {
  constructor(private readonly submenus: SubmenuRepository) {}

  async execute(filter: SubmenuListFilter = {}): Promise<Submenu[]> {
    const submenus = await this.submenus.list(filter);
    return [...submenus].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.menuId - right.menuId || left.id - right.id);
  }

  async page(query: SubmenuPageQuery): Promise<Page<Submenu>> {
    const { rows, total } = await this.submenus.page(query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}
