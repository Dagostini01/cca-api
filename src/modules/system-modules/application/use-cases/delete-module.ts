import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { MenuRepository } from '../../../menus/application/ports/menu-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Module } from '../../domain/module.js';
import { ModuleNotFoundError } from '../../domain/module-errors.js';
import type { ModuleRepository } from '../ports/module-repository.js';

export type ModuleDeleteBlockers = {
  menus?: MenuRepository;
  accesses?: AccessRepository;
};

export class DeleteModule {
  constructor(private readonly modules: ModuleRepository, private readonly blockers: ModuleDeleteBlockers = {}) {}

  async execute(id: number): Promise<Module> {
    const module = await this.ensureDeletable(id);
    await this.modules.remove(id);
    return module;
  }

  async ensureDeletable(id: number): Promise<Module> {
    const module = await this.modules.findById(id);
    if (!module) throw new ModuleNotFoundError();
    if ((await this.blockers.menus?.list({ moduloId: id }))?.length) throw new DeleteRestrictedError();
    if ((await this.blockers.accesses?.list({ moduloId: id }))?.length) throw new DeleteRestrictedError();
    return module;
  }
}
