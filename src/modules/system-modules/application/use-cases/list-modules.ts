import type { Module } from '../../domain/module.js';
import type { ModuleRepository } from '../ports/module-repository.js';

export class ListModules {
  constructor(private readonly modules: ModuleRepository) {}

  async execute(filter: { sistemaId?: string } = {}): Promise<Module[]> {
    const modules = await this.modules.list(filter.sistemaId);
    return [...modules].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.sistemaId.localeCompare(right.sistemaId));
  }
}
