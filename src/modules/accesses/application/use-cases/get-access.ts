import type { Access } from '../../domain/access.js';
import { AccessNotFoundError } from '../../domain/access-errors.js';
import type { AccessRepository } from '../ports/access-repository.js';

export class GetAccess {
  constructor(private readonly accesses: AccessRepository) {}

  async execute(id: string): Promise<Access> {
    const access = await this.accesses.findById(id);
    if (!access) throw new AccessNotFoundError();
    return access;
  }
}
