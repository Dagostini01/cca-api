import type { ScreenAccess } from '../../domain/access.js';
import { AccessNotFoundError } from '../../domain/access-errors.js';
import type { AccessRepository } from '../ports/access-repository.js';

export class DeleteAccess {
  constructor(private readonly accesses: AccessRepository) {}

  async execute(id: number): Promise<ScreenAccess> {
    const access = await this.ensureDeletable(id);
    await this.accesses.remove(id);
    return access;
  }

  async ensureDeletable(id: number): Promise<ScreenAccess> {
    const access = await this.accesses.findById(id);
    if (!access) throw new AccessNotFoundError();
    return access;
  }
}
