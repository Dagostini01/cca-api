import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { AuditRepository } from '../../../audits/application/ports/audit-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { BusinessUser } from '../../domain/user.js';
import { UserNotFoundError } from '../../domain/user-errors.js';
import type { UserRepository } from '../ports/user-repository.js';

export type UserDeleteBlockers = {
  accesses?: AccessRepository;
  audits?: AuditRepository;
};

export class DeleteUser {
  constructor(private readonly users: UserRepository, private readonly blockers: UserDeleteBlockers = {}) {}

  async execute(id: number): Promise<BusinessUser> {
    const user = await this.ensureDeletable(id);
    await this.users.remove(id);
    return user;
  }

  async ensureDeletable(id: number): Promise<BusinessUser> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError();
    if ((await this.users.listByCreator(id)).length) throw new DeleteRestrictedError();
    if ((await this.blockers.accesses?.list({ usuarioId: id }))?.length) throw new DeleteRestrictedError();
    if ((await this.blockers.audits?.list({ usuarioId: id }))?.length) throw new DeleteRestrictedError();
    return user;
  }
}
