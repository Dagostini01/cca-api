import { randomUUID } from 'node:crypto';
import type { AccessListFilter, AccessRepository, NewAccess } from '../../src/modules/accesses/application/ports/access-repository.js';
import type { Access } from '../../src/modules/accesses/domain/access.js';
import { AccessConflictError, AccessNotFoundError } from '../../src/modules/accesses/domain/access-errors.js';

function clone(access: Access): Access {
  return {
    ...access,
    criadoEm: new Date(access.criadoEm),
    atualizadoEm: new Date(access.atualizadoEm),
  };
}

export class InMemoryAccessRepository implements AccessRepository {
  private readonly accesses = new Map<string, Access>();

  async add(access: NewAccess): Promise<Access> {
    this.assertAvailable(access.usuarioId, access.sistemaId, null);
    const now = new Date();
    const stored: Access = { id: randomUUID(), ...access, criadoEm: now, atualizadoEm: now };
    this.accesses.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: AccessListFilter = {}): Promise<Access[]> {
    return [...this.accesses.values()]
      .filter((access) => (filter.usuarioId === undefined || access.usuarioId === filter.usuarioId) && (filter.sistemaId === undefined || access.sistemaId === filter.sistemaId))
      .map(clone);
  }

  async count(): Promise<number> {
    return this.accesses.size;
  }

  async findById(id: string): Promise<Access | null> {
    const access = this.accesses.get(id);
    return access ? clone(access) : null;
  }

  async save(access: Access): Promise<Access> {
    const current = this.accesses.get(access.id);
    if (!current) throw new AccessNotFoundError();
    if (current.usuarioId !== access.usuarioId || current.sistemaId !== access.sistemaId) throw new AccessConflictError();
    this.assertAvailable(access.usuarioId, access.sistemaId, access.id);
    const stored: Access = { ...current, perfilId: access.perfilId, status: access.status, atualizadoEm: new Date() };
    this.accesses.set(access.id, stored);
    return clone(stored);
  }

  private assertAvailable(usuarioId: string, sistemaId: string, ignoreId: string | null) {
    for (const access of this.accesses.values()) {
      if (access.id !== ignoreId && access.usuarioId === usuarioId && access.sistemaId === sistemaId) throw new AccessConflictError();
    }
  }
}
