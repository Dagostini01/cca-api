import type { Page } from '../../../../shared/http/page.js';
import type { AuditEntry } from '../../domain/audit.js';
import { AuditNotFoundError } from '../../domain/audit-errors.js';
import type { AuditListFilter, AuditPageQuery, AuditRepository } from '../ports/audit-repository.js';

export class ListAudits {
  constructor(private readonly audits: AuditRepository) {}

  async execute(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    const entries = await this.audits.list(filter);
    return [...entries].sort((left, right) => right.criadoEm.getTime() - left.criadoEm.getTime() || right.id - left.id);
  }

  async page(query: AuditPageQuery): Promise<Page<AuditEntry>> {
    const { rows, total } = await this.audits.page(query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}

export class GetAudit {
  constructor(private readonly audits: AuditRepository) {}

  async execute(id: number): Promise<AuditEntry> {
    const entry = await this.audits.findById(id);
    if (!entry) throw new AuditNotFoundError();
    return entry;
  }
}
