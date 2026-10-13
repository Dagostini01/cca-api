import { DomainError } from '../../../shared/errors/domain-error.js';

export class ForbiddenError extends DomainError {
  readonly code = 'forbidden';

  constructor() {
    super('forbidden');
  }
}
