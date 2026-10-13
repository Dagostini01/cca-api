import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidPermissionActionsError extends DomainError {
  readonly code = 'invalid_permission_actions';

  constructor() {
    super('invalid_permission_actions');
  }
}

export class EmptyPermissionUpdateError extends DomainError {
  readonly code = 'empty_permission_update';

  constructor() {
    super('empty_permission_update');
  }
}

export class PermissionNotFoundError extends DomainError {
  readonly code = 'permission_not_found';

  constructor() {
    super('permission_not_found');
  }
}

export class PermissionConflictError extends DomainError {
  readonly code = 'permission_conflict';

  constructor() {
    super('permission_conflict');
  }
}

export class PermissionProfileNotFoundError extends DomainError {
  readonly code = 'profile_not_found';

  constructor() {
    super('profile_not_found');
  }
}

export class PermissionResourceNotFoundError extends DomainError {
  readonly code = 'resource_not_found';

  constructor() {
    super('resource_not_found');
  }
}

export class PermissionCompanyMismatchError extends DomainError {
  readonly code = 'permission_company_mismatch';

  constructor() {
    super('permission_company_mismatch');
  }
}
