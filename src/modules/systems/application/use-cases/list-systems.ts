import type { Page } from '../../../../shared/http/page.js';
import type { System } from '../../domain/system.js';
import type { SystemListFilter, SystemPageQuery, SystemRepository } from '../ports/system-repository.js';

export class ListSystems {
  constructor(private readonly systems: SystemRepository) {}

  async execute(filter: SystemListFilter = {}): Promise<System[]> {
    const systems = await this.systems.list(filter);
    return [...systems].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.id - right.id);
  }

  async page(query: SystemPageQuery): Promise<Page<System>> {
    const { rows, total } = await this.systems.page(query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}
