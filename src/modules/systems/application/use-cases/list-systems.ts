import type { System } from '../../domain/system.js';
import type { SystemRepository } from '../ports/system-repository.js';

export class ListSystems {
  constructor(private readonly systems: SystemRepository) {}

  async execute(filter: { empresaId?: string } = {}): Promise<System[]> {
    const systems = await this.systems.list(filter.empresaId);
    return [...systems].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.empresaId.localeCompare(right.empresaId));
  }
}
