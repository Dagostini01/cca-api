import type { AccessRepository, NewScreenAccess, ScreenDraft, ScreenListFilter, ScreenPageQuery, ScreenViewFilter } from '../../src/modules/accesses/application/ports/access-repository.js';
import type { ScreenAccess, ScreenAccessView } from '../../src/modules/accesses/domain/access.js';
import { AccessConflictError, AccessNotFoundError } from '../../src/modules/accesses/domain/access-errors.js';

function clone(access: ScreenAccess): ScreenAccess {
  return { ...access, criadoEm: new Date(access.criadoEm) };
}

export type ScreenNameLookup = {
  companyName(id: number): Promise<string | null>;
  systemName(id: number): Promise<string | null>;
  moduleName(id: number): Promise<string | null>;
  menuName(id: number): Promise<string | null>;
  submenuName(id: number): Promise<string | null>;
};

function matches(access: ScreenAccess, filter: ScreenListFilter) {
  return (filter.usuarioId === undefined || access.usuarioId === filter.usuarioId)
    && (filter.empresaId === undefined || access.empresaId === filter.empresaId)
    && (filter.sistemaId === undefined || access.sistemaId === filter.sistemaId)
    && (filter.moduloId === undefined || access.moduloId === filter.moduloId)
    && (filter.menuId === undefined || access.menuId === filter.menuId)
    && (filter.submenuId === undefined || access.submenuId === filter.submenuId);
}

function matchesQuery(view: ScreenAccessView, q: string | undefined) {
  const term = q?.trim().toLocaleLowerCase('pt-BR');
  if (!term) return true;
  return [view.empresa, view.sistema, view.modulo, view.menu, view.submenu]
    .some((name) => name.toLocaleLowerCase('pt-BR').includes(term));
}

export class InMemoryAccessRepository implements AccessRepository {
  private readonly accesses = new Map<number, ScreenAccess>();
  private nextId = 1;

  constructor(private readonly names: ScreenNameLookup | null = null) {}

  async add(access: NewScreenAccess): Promise<ScreenAccess> {
    this.assertUnique(access.usuarioId, access.submenuId, null);
    const stored: ScreenAccess = { id: this.nextId++, ...access, criadoEm: new Date() };
    this.accesses.set(stored.id, stored);
    return clone(stored);
  }

  async replace(usuarioId: number, screens: ScreenDraft[]): Promise<ScreenAccess[]> {
    for (const access of [...this.accesses.values()]) {
      if (access.usuarioId === usuarioId) this.accesses.delete(access.id);
    }
    const stored: ScreenAccess[] = [];
    for (const screen of screens) {
      this.assertUnique(usuarioId, screen.submenuId, null);
      const row: ScreenAccess = { id: this.nextId++, usuarioId, ...screen, criadoEm: new Date() };
      this.accesses.set(row.id, row);
      stored.push(clone(row));
    }
    return stored;
  }

  async list(filter: ScreenListFilter = {}): Promise<ScreenAccess[]> {
    return [...this.accesses.values()].filter((access) => matches(access, filter)).map(clone);
  }

  async listViews(filter: ScreenViewFilter = {}): Promise<ScreenAccessView[]> {
    const views = await this.viewsOf(filter);
    return views.filter((view) => matchesQuery(view, filter.q));
  }

  async pageViews(query: ScreenPageQuery): Promise<{ rows: ScreenAccessView[]; total: number }> {
    const views = (await this.viewsOf(query)).filter((view) => matchesQuery(view, query.q));
    const start = (query.pagina - 1) * query.tamanho;
    return { rows: views.slice(start, start + query.tamanho), total: views.length };
  }

  private async viewsOf(filter: ScreenListFilter): Promise<ScreenAccessView[]> {
    const rows = [...this.accesses.values()].filter((access) => matches(access, filter)).sort((left, right) => left.id - right.id);
    return Promise.all(rows.map((access) => this.viewOf(access)));
  }

  private async viewOf(access: ScreenAccess): Promise<ScreenAccessView> {
    const blank = '—';
    if (!this.names) {
      return { ...clone(access), empresa: blank, sistema: blank, modulo: blank, menu: blank, submenu: blank };
    }
    const [empresa, sistema, modulo, menu, submenu] = await Promise.all([
      this.names.companyName(access.empresaId),
      this.names.systemName(access.sistemaId),
      this.names.moduleName(access.moduloId),
      this.names.menuName(access.menuId),
      this.names.submenuName(access.submenuId),
    ]);
    return {
      ...clone(access),
      empresa: empresa ?? blank,
      sistema: sistema ?? blank,
      modulo: modulo ?? blank,
      menu: menu ?? blank,
      submenu: submenu ?? blank,
    };
  }

  async findById(id: number): Promise<ScreenAccess | null> {
    const access = this.accesses.get(id);
    return access ? clone(access) : null;
  }

  async save(access: ScreenAccess): Promise<ScreenAccess> {
    if (!this.accesses.has(access.id)) throw new Error('access missing from memory');
    this.assertUnique(access.usuarioId, access.submenuId, access.id);
    this.accesses.set(access.id, access);
    return clone(access);
  }

  async remove(id: number): Promise<void> {
    if (!this.accesses.delete(id)) throw new AccessNotFoundError();
  }

  private assertUnique(usuarioId: number, submenuId: number, ignoreId: number | null) {
    for (const access of this.accesses.values()) {
      if (access.id !== ignoreId && access.usuarioId === usuarioId && access.submenuId === submenuId) {
        throw new AccessConflictError();
      }
    }
  }
}
