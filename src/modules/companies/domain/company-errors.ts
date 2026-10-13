import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidCompanyNameError extends DomainError {
  readonly code = 'invalid_company_name';

  constructor() {
    super('invalid_company_name');
  }
}

export class InvalidCompanyDocumentError extends DomainError {
  readonly code = 'invalid_company_document';

  constructor() {
    super('invalid_company_document');
  }
}

export class EmptyCompanyUpdateError extends DomainError {
  readonly code = 'empty_company_update';

  constructor() {
    super('empty_company_update');
  }
}

export class CompanyNotFoundError extends DomainError {
  readonly code = 'company_not_found';

  constructor() {
    super('company_not_found');
  }
}

export class CompanyDocumentConflictError extends DomainError {
  readonly code = 'company_document_conflict';

  constructor() {
    super('company_document_conflict');
  }
}
