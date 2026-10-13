import { DomainError } from '../../../shared/errors/domain-error.js';

export class InvalidSubmenuNameError extends DomainError {
  readonly code = 'invalid_submenu_name';

  constructor() {
    super('invalid_submenu_name');
  }
}

export class EmptySubmenuUpdateError extends DomainError {
  readonly code = 'empty_submenu_update';

  constructor() {
    super('empty_submenu_update');
  }
}

export class SubmenuNotFoundError extends DomainError {
  readonly code = 'submenu_not_found';

  constructor() {
    super('submenu_not_found');
  }
}

export class SubmenuNameConflictError extends DomainError {
  readonly code = 'submenu_name_conflict';

  constructor() {
    super('submenu_name_conflict');
  }
}

export class SubmenuMenuNotFoundError extends DomainError {
  readonly code = 'menu_not_found';

  constructor() {
    super('menu_not_found');
  }
}
