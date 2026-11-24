import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { ModuleRepository } from '../../../system-modules/application/ports/module-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { System } from '../../domain/system.js';
import { SystemNotFoundError } from '../../domain/system-errors.js';
import type { SystemRepository } from '../ports/system-repository.js';

export type SystemDeleteBlockers = {
  modules?: ModuleRepository;
  accesses?: AccessRepository;
};

export class DeleteSystem {
  constructor(private readonly systems: SystemRepository, private readonly blockers: SystemDeleteBlockers = {}) {}

  async execute(id: number): Promise<System> {
    const system = await this.ensureDeletable(id);
    await this.systems.remove(id);
    return system;
  }

  async ensureDeletable(id: number): Promise<System> {
    const system = await this.systems.findById(id);
    if (!system) throw new SystemNotFoundError();
    if ((await this.blockers.modules?.list({ sistemaId: id }))?.length) throw new DeleteRestrictedError();
    if ((await this.blockers.accesses?.list({ sistemaId: id }))?.length) throw new DeleteRestrictedError();
    return system;
  }
}
