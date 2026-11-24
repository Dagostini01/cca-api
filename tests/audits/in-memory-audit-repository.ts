import type { AuditListFilter, AuditPageQuery, AuditRepository, NewAuditEntry } from '../../src/modules/audits/application/ports/audit-repository.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCES, type AuditEntry } from '../../src/modules/audits/domain/audit.js';
import { slicePage, textIncludes } from '../../src/shared/http/page.js';

const actionLabel = { CRIAR: 'criou', ATUALIZAR: 'atualizou', EXCLUIR: 'excluiu' } as const;
const resourceLabel = { EMPRESA: 'empresa', SISTEMA: 'sistema', MODULO: 'módulo', MENU: 'menu', SUBMENU: 'submenu', USUARIO: 'usuário', ACESSO: 'acesso' } as const;

function matchesQuery(entry: AuditEntry, q: string) {
  const words = q.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [
    entry.descricao,
    entry.acao,
    actionLabel[entry.acao],
    entry.recursoTipo,
    resourceLabel[entry.recursoTipo],
    `${actionLabel[entry.acao]} ${resourceLabel[entry.recursoTipo]}`,
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(entry.criadoEm),
  ].join(' ');
  return words.every((word) => textIncludes(hay, word) || (word.length >= 3 && (
    AUDIT_ACTIONS.some((action) => textIncludes(actionLabel[action], word) && entry.acao === action)
    || AUDIT_RESOURCES.some((resource) => textIncludes(resourceLabel[resource], word) && entry.recursoTipo === resource)
  )));
}

function clone(entry: AuditEntry): AuditEntry {
  return { ...entry, criadoEm: new Date(entry.criadoEm) };
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly entries = new Map<number, AuditEntry>();
  private nextId = 1;

  async add(entry: NewAuditEntry, criadoEm = new Date()): Promise<AuditEntry> {
    const stored: AuditEntry = { id: this.nextId++, criadoEm, ...entry };
    this.entries.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    return [...this.entries.values()].filter((entry) => (
      (filter.usuarioId === undefined || entry.usuarioId === filter.usuarioId)
      && (filter.recursoTipo === undefined || entry.recursoTipo === filter.recursoTipo)
      && (filter.acao === undefined || entry.acao === filter.acao)
      && (filter.desde === undefined || entry.criadoEm >= filter.desde)
      && (filter.ate === undefined || entry.criadoEm <= filter.ate)
      && (filter.q === undefined || matchesQuery(entry, filter.q))
    )).map(clone);
  }

  async page(query: AuditPageQuery) {
    const rows = (await this.list(query)).sort((left, right) => right.criadoEm.getTime() - left.criadoEm.getTime() || right.id - left.id);
    return slicePage(rows, query.pagina, query.tamanho);
  }

  async findById(id: number): Promise<AuditEntry | null> {
    const entry = this.entries.get(id);
    return entry ? clone(entry) : null;
  }
}
