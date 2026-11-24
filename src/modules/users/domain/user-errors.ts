import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidUserNameError extends DomainError {
  readonly code = 'invalid_user_name';

  constructor() {
    super('invalid_user_name');
  }
}

export class InvalidUserEmailError extends DomainError {
  readonly code = 'invalid_user_email';

  constructor() {
    super('invalid_user_email');
  }
}

export class InvalidUserDocumentError extends DomainError {
  readonly code = 'invalid_user_document';

  constructor() {
    super('invalid_user_document');
  }
}

export class InvalidUserSubjectError extends DomainError {
  readonly code = 'invalid_user_subject';

  constructor() {
    super('invalid_user_subject');
  }
}

export class EmptyUserUpdateError extends DomainError {
  readonly code = 'empty_user_update';

  constructor() {
    super('empty_user_update');
  }
}

export class UserNotFoundError extends DomainError {
  readonly code = 'user_not_found';

  constructor() {
    super('user_not_found');
  }
}

export class UserEmailConflictError extends DomainError {
  readonly code = 'user_email_conflict';

  constructor() {
    super('user_email_conflict');
  }
}

export class UserSubjectConflictError extends DomainError {
  readonly code = 'user_subject_conflict';

  constructor() {
    super('user_subject_conflict');
  }
}

export class IdentityEmailConflictError extends DomainError {
  readonly code = 'identity_email_conflict';

  constructor() {
    super('identity_email_conflict');
  }
}

export class AccessCodeUnavailableError extends DomainError {
  readonly code = 'access_code_unavailable';

  constructor() {
    super('access_code_unavailable');
  }
}

export class IdentitySubjectNotFoundError extends DomainError {
  readonly code = 'identity_subject_not_found';

  constructor() {
    super('identity_subject_not_found');
  }
}

export class IdentityDirectoryUnavailableError extends DomainError {
  readonly code = 'identity_directory_unavailable';

  constructor() {
    super('identity_directory_unavailable');
  }
}

export class UserCompanyNotFoundError extends DomainError {
  readonly code = 'company_not_found';

  constructor() {
    super('company_not_found');
  }
}

export class SelfDeactivationError extends DomainError {
  readonly code = 'self_deactivation';

  constructor() {
    super('self_deactivation');
  }
}
