import { DomainError } from '../errors/domain-error.js';

export class UnauthorizedError extends DomainError {
  readonly code = 'unauthorized';

  constructor() {
    super('unauthorized');
  }
}
