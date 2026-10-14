import type { AuditRepository } from '../ports/audit-repository.js';
import { GetAudit, ListAudits } from '../use-cases/read-audits.js';

export type AuditServices = {
  listAudits: ListAudits;
  getAudit: GetAudit;
};

export function createAuditServices(audits: AuditRepository): AuditServices {
  return {
    listAudits: new ListAudits(audits),
    getAudit: new GetAudit(audits),
  };
}
