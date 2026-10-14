import { DomainError } from './domain-error.js';

export class DeleteRestrictedError extends DomainError {
  readonly code = 'delete_restricted';

  constructor() {
    super('delete_restricted');
  }
}
