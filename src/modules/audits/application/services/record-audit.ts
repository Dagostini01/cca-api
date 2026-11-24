import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import { normalizeAuditDescription } from '../../domain/audit.js';
import type { AuditChange, AuditRecorder } from '../ports/audit-recorder.js';
import type { AuditRepository } from '../ports/audit-repository.js';

export function createAuditRecorder(dependencies: {
  audits: AuditRepository;
  users: UserRepository;
}): AuditRecorder {
  return {
    async record(change: AuditChange) {
      const descricao = normalizeAuditDescription(change.descricao);
      const actor = await dependencies.users.findBySubject(change.subject);
      await dependencies.audits.add({
        usuarioId: actor?.id ?? null,
        acao: change.acao,
        recursoTipo: change.recursoTipo,
        descricao,
      });
    },
  };
}
