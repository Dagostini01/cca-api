import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidModuleNameError extends DomainError {
  readonly code = 'invalid_module_name';

  constructor() {
    super('invalid_module_name');
  }
}

export class EmptyModuleUpdateError extends DomainError {
  readonly code = 'empty_module_update';

  constructor() {
    super('empty_module_update');
  }
}

export class ModuleNotFoundError extends DomainError {
  readonly code = 'module_not_found';

  constructor() {
    super('module_not_found');
  }
}

export class ModuleNameConflictError extends DomainError {
  readonly code = 'module_name_conflict';

  constructor() {
    super('module_name_conflict');
  }
}

export class ModuleSystemNotFoundError extends DomainError {
  readonly code = 'system_not_found';

  constructor() {
    super('system_not_found');
  }
}
