import type { AccessStatus, ScreenAccess } from '../../domain/access.js';
import { AccessNotFoundError, EmptyAccessUpdateError } from '../../domain/access-errors.js';
import type { AccessRepository } from '../ports/access-repository.js';

export type UpdateAccessInput = {
  status?: AccessStatus;
};

export class UpdateAccess {
  constructor(private readonly accesses: AccessRepository) {}

  async execute(id: number, input: UpdateAccessInput): Promise<ScreenAccess> {
    if (input.status === undefined) throw new EmptyAccessUpdateError();
    const current = await this.accesses.findById(id);
    if (!current) throw new AccessNotFoundError();
    return this.accesses.save({ ...current, status: input.status });
  }
}
