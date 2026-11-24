import type { ModuleListFilter, ModulePageQuery, ModuleRepository, NewModule } from '../../src/modules/system-modules/application/ports/module-repository.js';
import { moduleNamesConflict, type Module } from '../../src/modules/system-modules/domain/module.js';
import { ModuleNameConflictError, ModuleNotFoundError } from '../../src/modules/system-modules/domain/module-errors.js';
import { slicePage, textIncludes } from '../../src/shared/http/page.js';

function clone(module: Module): Module {
  return { ...module, criadoEm: new Date(module.criadoEm) };
}

export class InMemoryModuleRepository implements ModuleRepository {
  private readonly modules = new Map<number, Module>();
  private nextId = 1;

  async add(module: NewModule): Promise<Module> {
    this.assertName(module.sistemaId, module.nome, null);
    const stored: Module = { id: this.nextId++, ...module, criadoEm: new Date() };
    this.modules.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: ModuleListFilter = {}): Promise<Module[]> {
    const q = filter.q?.trim() ?? '';
    return [...this.modules.values()].filter((module) => (
      (filter.sistemaId === undefined || module.sistemaId === filter.sistemaId)
      && (!q || textIncludes(module.nome, q) || textIncludes(module.descricaoCurta, q) || textIncludes(module.descricaoLonga, q))
    )).map(clone);
  }

  async page(query: ModulePageQuery) {
    const rows = (await this.list(query)).sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.sistemaId - right.sistemaId || left.id - right.id);
    return slicePage(rows, query.pagina, query.tamanho);
  }

  async findById(id: number): Promise<Module | null> {
    const module = this.modules.get(id);
    return module ? clone(module) : null;
  }

  async save(module: Module): Promise<Module> {
    if (!this.modules.has(module.id)) throw new Error('module missing from memory');
    this.assertName(module.sistemaId, module.nome, module.id);
    this.modules.set(module.id, module);
    return clone(module);
  }

  async remove(id: number): Promise<void> {
    if (!this.modules.delete(id)) throw new ModuleNotFoundError();
  }

  private assertName(sistemaId: number, nome: string, ignoreId: number | null) {
    for (const module of this.modules.values()) {
      if (module.sistemaId === sistemaId && module.id !== ignoreId && moduleNamesConflict(module.nome, nome)) {
        throw new ModuleNameConflictError();
      }
    }
  }
}
