import type { AuditAction, AuditEntry, AuditResource } from '../../domain/audit.js';

export type NewAuditEntry = {
  ocorridoEm: Date;
  usuarioId: string | null;
  usuarioNome: string | null;
  acao: AuditAction;
  recursoTipo: AuditResource;
  recursoId: string;
  descricao: string;
  empresaId: string;
};

export type AuditListFilter = {
  empresaId?: string;
  usuarioId?: string;
  recursoTipo?: AuditResource;
  desde?: Date;
  ate?: Date;
};

export interface AuditRepository {
  add(entry: NewAuditEntry): Promise<AuditEntry>;
  list(filter?: AuditListFilter): Promise<AuditEntry[]>;
  findById(id: string): Promise<AuditEntry | null>;
}
