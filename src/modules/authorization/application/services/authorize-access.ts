import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import { UserNotFoundError } from '../../../users/domain/user-errors.js';
import { ForbiddenError } from '../../domain/forbidden-error.js';
import type { Authorizer } from '../ports/authorizer.js';
import type { BusinessUser } from '../../../users/domain/user.js';

export function createAuthorizer(dependencies: {
  users: UserRepository;
  accesses: AccessRepository;
}): Authorizer {
  async function administrator(subject: string): Promise<BusinessUser | 'bootstrap'> {
    if (await dependencies.users.countByType('ADMINITRADOR') === 0) return 'bootstrap';
    const user = await dependencies.users.findBySubject(subject);
    if (!user || user.status !== 'ATIVADO' || user.tipo !== 'ADMINITRADOR') throw new ForbiddenError();
    return user;
  }

  return {
    async assertCatalog(subject) {
      await administrator(subject);
    },

    async assertCanManageUser(subject, userId) {
      const actor = await administrator(subject);
      const target = await dependencies.users.findById(userId);
      if (!target) throw new UserNotFoundError();
      if (actor === 'bootstrap') return;
      if (target.criadoPorId === actor.id || target.criadoPorId === null) return;
      throw new ForbiddenError();
    },

    async assertScreen(subject, submenuId) {
      const user = await dependencies.users.findBySubject(subject);
      if (!user || user.status !== 'ATIVADO') throw new ForbiddenError();
      const rows = await dependencies.accesses.list({ usuarioId: user.id, submenuId });
      if (!rows.some((row) => row.status === 'ATIVADO')) throw new ForbiddenError();
    },
  };
}
