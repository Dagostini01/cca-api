import type { AuditAction, AuditResource } from '../../domain/audit.js';

export type AuditChange = {
  subject: string;
  acao: AuditAction;
  recursoTipo: AuditResource;
  recursoId: string;
  descricao: string;
};

export interface AuditRecorder {
  record(change: AuditChange): Promise<void>;
}
