import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidAuditDescriptionError extends DomainError {
  readonly code = 'invalid_audit_description';

  constructor() {
    super('invalid_audit_description');
  }
}

export class AuditNotFoundError extends DomainError {
  readonly code = 'audit_not_found';

  constructor() {
    super('audit_not_found');
  }
}
