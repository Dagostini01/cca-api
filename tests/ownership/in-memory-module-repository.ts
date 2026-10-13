import { randomUUID } from 'node:crypto';
import type { ModuleRepository, NewModule } from '../../src/modules/system-modules/application/ports/module-repository.js';
import { moduleNamesConflict, type Module } from '../../src/modules/system-modules/domain/module.js';
import { ModuleNameConflictError, ModuleNotFoundError } from '../../src/modules/system-modules/domain/module-errors.js';

function clone(module: Module): Module {
  return { ...module, criadoEm: new Date(module.criadoEm), atualizadoEm: new Date(module.atualizadoEm) };
}

export class InMemoryModuleRepository implements ModuleRepository {
  private readonly modules = new Map<string, Module>();

  async add(module: NewModule): Promise<Module> {
    this.assertNameAvailable(module.sistemaId, module.nome, null);
    const now = new Date();
    const stored: Module = { id: randomUUID(), ...module, criadoEm: now, atualizadoEm: now };
    this.modules.set(stored.id, stored);
    return clone(stored);
  }

  async list(sistemaId?: string): Promise<Module[]> {
    return [...this.modules.values()].filter((module) => sistemaId === undefined || module.sistemaId === sistemaId).map(clone);
  }

  async findById(id: string): Promise<Module | null> {
    const module = this.modules.get(id);
    return module ? clone(module) : null;
  }

  async save(module: Module): Promise<Module> {
    if (!this.modules.has(module.id)) throw new ModuleNotFoundError();
    this.assertNameAvailable(module.sistemaId, module.nome, module.id);
    const stored: Module = { ...module, atualizadoEm: new Date() };
    this.modules.set(module.id, stored);
    return clone(stored);
  }

  private assertNameAvailable(sistemaId: string, nome: string, ignoreId: string | null) {
    for (const module of this.modules.values()) {
      if (module.sistemaId === sistemaId && module.id !== ignoreId && moduleNamesConflict(module.nome, nome)) {
        throw new ModuleNameConflictError();
      }
    }
  }
}
