import type { Access } from '../../domain/access.js';
import type { AccessListFilter, AccessRepository } from '../ports/access-repository.js';

export class ListAccesses {
  constructor(private readonly accesses: AccessRepository) {}

  async execute(filter: AccessListFilter = {}): Promise<Access[]> {
    const accesses = await this.accesses.list(filter);
    return [...accesses].sort((left, right) => left.sistemaId.localeCompare(right.sistemaId) || left.usuarioId.localeCompare(right.usuarioId));
  }
}
