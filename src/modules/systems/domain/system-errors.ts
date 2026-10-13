import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidSystemNameError extends DomainError {
  readonly code = 'invalid_system_name';

  constructor() {
    super('invalid_system_name');
  }
}

export class EmptySystemUpdateError extends DomainError {
  readonly code = 'empty_system_update';

  constructor() {
    super('empty_system_update');
  }
}

export class SystemNotFoundError extends DomainError {
  readonly code = 'system_not_found';

  constructor() {
    super('system_not_found');
  }
}

export class SystemNameConflictError extends DomainError {
  readonly code = 'system_name_conflict';

  constructor() {
    super('system_name_conflict');
  }
}

export class SystemCompanyNotFoundError extends DomainError {
  readonly code = 'company_not_found';

  constructor() {
    super('company_not_found');
  }
}
