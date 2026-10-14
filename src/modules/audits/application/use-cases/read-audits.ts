import type { AuditEntry } from '../../domain/audit.js';
import { AuditNotFoundError } from '../../domain/audit-errors.js';
import type { AuditListFilter, AuditRepository } from '../ports/audit-repository.js';

export class ListAudits {
  constructor(private readonly audits: AuditRepository) {}

  async execute(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    const entries = await this.audits.list(filter);
    return [...entries].sort((left, right) => right.ocorridoEm.getTime() - left.ocorridoEm.getTime() || right.id.localeCompare(left.id));
  }
}

export class GetAudit {
  constructor(private readonly audits: AuditRepository) {}

  async execute(id: string): Promise<AuditEntry> {
    const entry = await this.audits.findById(id);
    if (!entry) throw new AuditNotFoundError();
    return entry;
  }
}
