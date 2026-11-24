import type { AuditAction, AuditEntry, AuditResource } from '../../domain/audit.js';

export type NewAuditEntry = {
  usuarioId: number | null;
  acao: AuditAction;
  recursoTipo: AuditResource;
  descricao: string;
};

export type AuditListFilter = {
  usuarioId?: number;
  recursoTipo?: AuditResource;
  acao?: AuditAction;
  desde?: Date;
  ate?: Date;
  q?: string;
};

export type AuditPageQuery = AuditListFilter & {
  pagina: number;
  tamanho: number;
};

export interface AuditRepository {
  add(entry: NewAuditEntry): Promise<AuditEntry>;
  list(filter?: AuditListFilter): Promise<AuditEntry[]>;
  page(query: AuditPageQuery): Promise<{ rows: AuditEntry[]; total: number }>;
  findById(id: number): Promise<AuditEntry | null>;
}
