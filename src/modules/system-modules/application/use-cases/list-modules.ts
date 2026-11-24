import type { Page } from '../../../../shared/http/page.js';
import type { Module } from '../../domain/module.js';
import type { ModuleListFilter, ModulePageQuery, ModuleRepository } from '../ports/module-repository.js';

export class ListModules {
  constructor(private readonly modules: ModuleRepository) {}

  async execute(filter: ModuleListFilter = {}): Promise<Module[]> {
    const modules = await this.modules.list(filter);
    return [...modules].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.sistemaId - right.sistemaId || left.id - right.id);
  }

  async page(query: ModulePageQuery): Promise<Page<Module>> {
    const { rows, total } = await this.modules.page(query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}
