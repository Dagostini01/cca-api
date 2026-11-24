import type { NewBusinessUser, UserPageQuery, UserRepository } from '../../src/modules/users/application/ports/user-repository.js';
import type { BusinessUser } from '../../src/modules/users/domain/user.js';
import { UserEmailConflictError, UserNotFoundError, UserSubjectConflictError } from '../../src/modules/users/domain/user-errors.js';
import type { UserType } from '../../src/shared/catalog/status.js';

function clone(user: BusinessUser): BusinessUser {
  return { ...user, criadoEm: new Date(user.criadoEm) };
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<number, BusinessUser>();
  private nextId = 1;

  async add(user: NewBusinessUser): Promise<BusinessUser> {
    this.assertAvailable(user.email, user.keycloakSub, null);
    const stored: BusinessUser = { id: this.nextId++, ...user, criadoEm: new Date() };
    this.users.set(stored.id, stored);
    return clone(stored);
  }

  async listByCreator(criadoPorId: number): Promise<BusinessUser[]> {
    return [...this.users.values()].filter((user) => user.criadoPorId === criadoPorId).map(clone);
  }

  async pageByCreator(criadoPorId: number, query: UserPageQuery): Promise<{ rows: BusinessUser[]; total: number }> {
    const term = query.q?.trim().toLocaleLowerCase('pt-BR');
    const matched = [...this.users.values()].filter((user) => {
      if (user.criadoPorId !== criadoPorId) return false;
      if (query.tipo && user.tipo !== query.tipo) return false;
      if (query.status && user.status !== query.status) return false;
      if (!term) return true;
      return `${user.nome} ${user.email ?? ''}`.toLocaleLowerCase('pt-BR').includes(term);
    }).sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.id - right.id);
    const start = (query.pagina - 1) * query.tamanho;
    return { rows: matched.slice(start, start + query.tamanho).map(clone), total: matched.length };
  }

  async countByType(tipo: UserType): Promise<number> {
    return [...this.users.values()].filter((user) => user.tipo === tipo).length;
  }

  async findById(id: number): Promise<BusinessUser | null> {
    const user = this.users.get(id);
    return user ? clone(user) : null;
  }

  async findBySubject(keycloakSub: string): Promise<BusinessUser | null> {
    const user = [...this.users.values()].find((item) => item.keycloakSub === keycloakSub);
    return user ? clone(user) : null;
  }

  async findByEmail(email: string): Promise<BusinessUser | null> {
    const user = [...this.users.values()].find((item) => item.email === email);
    return user ? clone(user) : null;
  }

  async save(user: BusinessUser): Promise<BusinessUser> {
    if (!this.users.has(user.id)) throw new Error('user missing from memory');
    this.assertAvailable(user.email, user.keycloakSub, user.id);
    this.users.set(user.id, user);
    return clone(user);
  }

  async remove(id: number): Promise<void> {
    if (!this.users.delete(id)) throw new UserNotFoundError();
  }

  private assertAvailable(email: string | null, keycloakSub: string | null, ignoreId: number | null) {
    for (const user of this.users.values()) {
      if (user.id === ignoreId) continue;
      if (email && user.email === email) throw new UserEmailConflictError();
      if (keycloakSub && user.keycloakSub === keycloakSub) throw new UserSubjectConflictError();
    }
  }
}
