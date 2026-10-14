import { randomUUID } from 'node:crypto';
import type { AuditListFilter, AuditRepository, NewAuditEntry } from '../../src/modules/audits/application/ports/audit-repository.js';
import type { AuditEntry } from '../../src/modules/audits/domain/audit.js';

function clone(entry: AuditEntry): AuditEntry {
  return { ...entry, ocorridoEm: new Date(entry.ocorridoEm) };
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly entries = new Map<string, AuditEntry>();

  async add(entry: NewAuditEntry): Promise<AuditEntry> {
    const stored: AuditEntry = { id: randomUUID(), ...entry };
    this.entries.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => (
        (filter.empresaId === undefined || entry.empresaId === filter.empresaId)
        && (filter.usuarioId === undefined || entry.usuarioId === filter.usuarioId)
        && (filter.recursoTipo === undefined || entry.recursoTipo === filter.recursoTipo)
        && (filter.desde === undefined || entry.ocorridoEm >= filter.desde)
        && (filter.ate === undefined || entry.ocorridoEm <= filter.ate)
      ))
      .map(clone);
  }

  async findById(id: string): Promise<AuditEntry | null> {
    const entry = this.entries.get(id);
    return entry ? clone(entry) : null;
  }
}
