import { randomUUID } from 'node:crypto';
import type { NewBusinessUser, UserRepository } from '../../src/modules/users/application/ports/user-repository.js';
import type { BusinessUser } from '../../src/modules/users/domain/user.js';
import { UserEmailConflictError, UserNotFoundError, UserSubjectConflictError } from '../../src/modules/users/domain/user-errors.js';

function clone(user: BusinessUser): BusinessUser {
  return {
    ...user,
    criadoEm: new Date(user.criadoEm),
    atualizadoEm: new Date(user.atualizadoEm),
  };
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, BusinessUser>();

  async add(user: NewBusinessUser): Promise<BusinessUser> {
    this.assertAvailable(user.keycloakSub, user.email, null);
    const now = new Date();
    const stored: BusinessUser = { id: randomUUID(), ...user, criadoEm: now, atualizadoEm: now };
    this.users.set(stored.id, stored);
    return clone(stored);
  }

  async list(empresaId?: string): Promise<BusinessUser[]> {
    return [...this.users.values()].filter((user) => empresaId === undefined || user.empresaId === empresaId).map(clone);
  }

  async findById(id: string): Promise<BusinessUser | null> {
    const user = this.users.get(id);
    return user ? clone(user) : null;
  }

  async findBySubject(keycloakSub: string): Promise<BusinessUser | null> {
    const user = [...this.users.values()].find((current) => current.keycloakSub === keycloakSub);
    return user ? clone(user) : null;
  }

  async save(user: BusinessUser): Promise<BusinessUser> {
    const current = this.users.get(user.id);
    if (!current) throw new UserNotFoundError();
    if (current.keycloakSub !== user.keycloakSub) throw new UserSubjectConflictError();
    this.assertAvailable(user.keycloakSub, user.email, user.id);
    const stored: BusinessUser = { ...user, keycloakSub: current.keycloakSub, atualizadoEm: new Date() };
    this.users.set(user.id, stored);
    return clone(stored);
  }

  private assertAvailable(keycloakSub: string, email: string, ignoreId: string | null) {
    for (const user of this.users.values()) {
      if (user.id === ignoreId) continue;
      if (user.keycloakSub === keycloakSub) throw new UserSubjectConflictError();
      if (user.email === email) throw new UserEmailConflictError();
    }
  }
}
