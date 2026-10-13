import type { BusinessUser } from '../../domain/user.js';
import { UserNotFoundError } from '../../domain/user-errors.js';
import type { UserRepository } from '../ports/user-repository.js';

export class GetUser {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string): Promise<BusinessUser> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError();
    return user;
  }
}
