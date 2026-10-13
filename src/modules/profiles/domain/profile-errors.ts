import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidProfileNameError extends DomainError {
  readonly code = 'invalid_profile_name';

  constructor() {
    super('invalid_profile_name');
  }
}

export class InvalidProfileDescriptionError extends DomainError {
  readonly code = 'invalid_profile_description';

  constructor() {
    super('invalid_profile_description');
  }
}

export class EmptyProfileUpdateError extends DomainError {
  readonly code = 'empty_profile_update';

  constructor() {
    super('empty_profile_update');
  }
}

export class ProfileNotFoundError extends DomainError {
  readonly code = 'profile_not_found';

  constructor() {
    super('profile_not_found');
  }
}

export class ProfileNameConflictError extends DomainError {
  readonly code = 'profile_name_conflict';

  constructor() {
    super('profile_name_conflict');
  }
}

export class ProfileCompanyNotFoundError extends DomainError {
  readonly code = 'company_not_found';

  constructor() {
    super('company_not_found');
  }
}
