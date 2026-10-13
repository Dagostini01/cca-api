import type { BusinessUser } from '../../domain/user.js';
import type { UserRepository } from '../ports/user-repository.js';

export class ListUsers {
  constructor(private readonly users: UserRepository) {}

  async execute(filter: { empresaId?: string } = {}): Promise<BusinessUser[]> {
    const users = await this.users.list(filter.empresaId);
    return [...users].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR') || left.email.localeCompare(right.email));
  }
}
