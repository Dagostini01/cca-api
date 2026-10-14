import type { MenuRepository } from '../../../menus/application/ports/menu-repository.js';
import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import { hasPermissionOn } from '../../../permissions/application/services/has-permission-on.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Module } from '../../domain/module.js';
import { ModuleNotFoundError } from '../../domain/module-errors.js';
import type { ModuleRepository } from '../ports/module-repository.js';

export type ModuleDeleteBlockers = {
  menus?: MenuRepository;
  permissions?: PermissionRepository;
};

export class DeleteModule {
  constructor(private readonly modules: ModuleRepository, private readonly blockers: ModuleDeleteBlockers = {}) {}

  async execute(id: string): Promise<Module> {
    const module = await this.ensureDeletable(id);
    await this.modules.remove(id);
    return module;
  }

  async ensureDeletable(id: string): Promise<Module> {
    const module = await this.modules.findById(id);
    if (!module) throw new ModuleNotFoundError();
    if ((await this.blockers.menus?.list(id))?.length) throw new DeleteRestrictedError();
    if (this.blockers.permissions && await hasPermissionOn(this.blockers.permissions, 'MODULO', id)) throw new DeleteRestrictedError();
    return module;
  }
}
