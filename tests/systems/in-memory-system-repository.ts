import type { NewSystem, SystemListFilter, SystemPageQuery, SystemRepository } from '../../src/modules/systems/application/ports/system-repository.js';
import type { System } from '../../src/modules/systems/domain/system.js';
import { SystemNameConflictError, SystemNotFoundError } from '../../src/modules/systems/domain/system-errors.js';
import { systemNamesConflict } from '../../src/modules/systems/domain/system.js';
import { slicePage, textIncludes } from '../../src/shared/http/page.js';

function clone(system: System): System {
  return { ...system, empresaIds: [...system.empresaIds], criadoEm: new Date(system.criadoEm) };
}

export class InMemorySystemRepository implements SystemRepository {
  private readonly systems = new Map<number, System>();
  private nextId = 1;

  async add(system: NewSystem): Promise<System> {
    this.assertName(system.nome, null);
    const stored: System = { id: this.nextId++, ...system, empresaIds: [...(system.empresaIds ?? [])], criadoEm: new Date() };
    this.systems.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: SystemListFilter = {}): Promise<System[]> {
    const q = filter.q?.trim() ?? '';
    return [...this.systems.values()]
      .filter((system) => (filter.empresaId === undefined || system.empresaIds.includes(filter.empresaId))
        && (!q || textIncludes(system.nome, q) || textIncludes(system.descricaoCurta, q) || textIncludes(system.descricaoLonga, q)))
      .map(clone);
  }

  async page(query: SystemPageQuery) {
    const rows = (await this.list(query)).sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.id - right.id);
    return slicePage(rows, query.pagina, query.tamanho);
  }

  async findById(id: number): Promise<System | null> {
    const system = this.systems.get(id);
    return system ? clone(system) : null;
  }

  async save(system: System): Promise<System> {
    if (!this.systems.has(system.id)) throw new Error('system missing from memory');
    this.assertName(system.nome, system.id);
    this.systems.set(system.id, clone(system));
    return clone(system);
  }

  async remove(id: number): Promise<void> {
    if (!this.systems.delete(id)) throw new SystemNotFoundError();
  }

  async linkCompany(sistemaId: number, empresaId: number): Promise<void> {
    const system = this.systems.get(sistemaId);
    if (!system) throw new SystemNotFoundError();
    if (!system.empresaIds.includes(empresaId)) system.empresaIds = [...system.empresaIds, empresaId].sort((left, right) => left - right);
  }

  private assertName(nome: string, ignoreId: number | null) {
    for (const system of this.systems.values()) {
      if (system.id !== ignoreId && systemNamesConflict(system.nome, nome)) throw new SystemNameConflictError();
    }
  }
}
