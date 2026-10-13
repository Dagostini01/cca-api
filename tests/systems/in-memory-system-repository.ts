import { randomUUID } from 'node:crypto';
import type { NewSystem, SystemRepository } from '../../src/modules/systems/application/ports/system-repository.js';
import { systemNamesConflict, type System } from '../../src/modules/systems/domain/system.js';
import { SystemNameConflictError, SystemNotFoundError } from '../../src/modules/systems/domain/system-errors.js';

function clone(system: System): System {
  return {
    ...system,
    criadoEm: new Date(system.criadoEm),
    atualizadoEm: new Date(system.atualizadoEm),
  };
}

export class InMemorySystemRepository implements SystemRepository {
  private readonly systems = new Map<string, System>();

  async add(system: NewSystem): Promise<System> {
    this.assertNameAvailable(system.empresaId, system.nome, null);
    const now = new Date();
    const stored: System = { id: randomUUID(), ...system, criadoEm: now, atualizadoEm: now };
    this.systems.set(stored.id, stored);
    return clone(stored);
  }

  async list(empresaId?: string): Promise<System[]> {
    return [...this.systems.values()].filter((system) => empresaId === undefined || system.empresaId === empresaId).map(clone);
  }

  async findById(id: string): Promise<System | null> {
    const system = this.systems.get(id);
    return system ? clone(system) : null;
  }

  async save(system: System): Promise<System> {
    if (!this.systems.has(system.id)) throw new SystemNotFoundError();
    this.assertNameAvailable(system.empresaId, system.nome, system.id);
    const stored: System = { ...system, atualizadoEm: new Date() };
    this.systems.set(system.id, stored);
    return clone(stored);
  }

  private assertNameAvailable(empresaId: string, nome: string, ignoreId: string | null) {
    for (const system of this.systems.values()) {
      if (system.empresaId === empresaId && system.id !== ignoreId && systemNamesConflict(system.nome, nome)) {
        throw new SystemNameConflictError();
      }
    }
  }
}
