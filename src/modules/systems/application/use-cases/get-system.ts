import type { System } from '../../domain/system.js';
import { SystemNotFoundError } from '../../domain/system-errors.js';
import type { SystemRepository } from '../ports/system-repository.js';

export class GetSystem {
  constructor(private readonly systems: SystemRepository) {}

  async execute(id: string): Promise<System> {
    const system = await this.systems.findById(id);
    if (!system) throw new SystemNotFoundError();
    return system;
  }
}
