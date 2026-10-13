import { normalizeKeycloakSubject, type BusinessUser } from '../../domain/user.js';
import { UserNotFoundError } from '../../domain/user-errors.js';
import type { UserRepository } from '../ports/user-repository.js';

export class GetUserBySubject {
  constructor(private readonly users: UserRepository) {}

  async execute(keycloakSub: string): Promise<BusinessUser> {
    const user = await this.users.findBySubject(normalizeKeycloakSubject(keycloakSub));
    if (!user) throw new UserNotFoundError();
    return user;
  }
}
