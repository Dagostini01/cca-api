import type { AccessRepository, ScreenDraft } from '../../src/modules/accesses/application/ports/access-repository.js';
import type { UserRegistrar } from '../../src/modules/users/application/ports/user-registrar.js';
import type { NewBusinessUser, UserRepository } from '../../src/modules/users/application/ports/user-repository.js';
import type { BusinessUser } from '../../src/modules/users/domain/user.js';

export function createInMemoryUserRegistrar(users: UserRepository, accesses: AccessRepository): UserRegistrar {
  return {
    async register(user: NewBusinessUser, screens: ScreenDraft[]): Promise<BusinessUser> {
      const created = await users.add(user);
      try {
        if (screens.length > 0) await accesses.replace(created.id, screens);
        return created;
      } catch (error) {
        await users.remove(created.id);
        throw error;
      }
    },
  };
}
