import { DomainError } from '../../../../shared/errors/domain-error.js';

export class InvalidTokenError extends DomainError {
  readonly code = 'invalid_token';

  constructor() {
    super('invalid_token');
  }
}

export class TokenVerifierUnavailableError extends DomainError {
  readonly code = 'token_verifier_unavailable';

  constructor() {
    super('token_verifier_unavailable');
  }
}
