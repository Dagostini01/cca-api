import { DomainError } from '../../../shared/errors/domain-error.js';

export class LegacySystemOwnerUnknownError extends DomainError {
  readonly code = 'legacy_system_owner_unknown';

  constructor() {
    super('legacy_system_owner_unknown');
  }
}
