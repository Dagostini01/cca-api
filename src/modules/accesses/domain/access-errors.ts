import { DomainError } from '../../../shared/errors/domain-error.js';

export class EmptyAccessUpdateError extends DomainError {
  readonly code = 'empty_access_update';

  constructor() {
    super('empty_access_update');
  }
}

export class AccessNotFoundError extends DomainError {
  readonly code = 'access_not_found';

  constructor() {
    super('access_not_found');
  }
}

export class AccessConflictError extends DomainError {
  readonly code = 'access_conflict';

  constructor() {
    super('access_conflict');
  }
}

export class IncoherentScreenError extends DomainError {
  readonly code = 'incoherent_screen';

  constructor() {
    super('incoherent_screen');
  }
}

export class SystemNotInCompanyError extends DomainError {
  readonly code = 'system_not_in_company';

  constructor() {
    super('system_not_in_company');
  }
}

export class AccessUserNotFoundError extends DomainError {
  readonly code = 'user_not_found';

  constructor() {
    super('user_not_found');
  }
}
