import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidMenuNameError extends DomainError {
  readonly code = 'invalid_menu_name';

  constructor() {
    super('invalid_menu_name');
  }
}

export class EmptyMenuUpdateError extends DomainError {
  readonly code = 'empty_menu_update';

  constructor() {
    super('empty_menu_update');
  }
}

export class MenuNotFoundError extends DomainError {
  readonly code = 'menu_not_found';

  constructor() {
    super('menu_not_found');
  }
}

export class MenuNameConflictError extends DomainError {
  readonly code = 'menu_name_conflict';

  constructor() {
    super('menu_name_conflict');
  }
}

export class MenuModuleNotFoundError extends DomainError {
  readonly code = 'module_not_found';

  constructor() {
    super('module_not_found');
  }
}
