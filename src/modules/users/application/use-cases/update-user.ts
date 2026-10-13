import { normalizeUserEmail, normalizeUserName, type BusinessUser, type UserStatus } from '../../domain/user.js';
import { EmptyUserUpdateError, UserCompanyNotFoundError, UserNotFoundError } from '../../domain/user-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { UserRepository } from '../ports/user-repository.js';

export type UpdateUserInput = {
  nome?: string;
  email?: string;
  empresaId?: string;
  status?: UserStatus;
};

export class UpdateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly companies: ParentCompanyLookup,
  ) {}

  async execute(id: string, input: UpdateUserInput): Promise<BusinessUser> {
    if (input.nome === undefined && input.email === undefined && input.empresaId === undefined && input.status === undefined) {
      throw new EmptyUserUpdateError();
    }
    const current = await this.users.findById(id);
    if (!current) throw new UserNotFoundError();
    if (input.empresaId !== undefined && input.empresaId !== current.empresaId) {
      const company = await this.companies.findById(input.empresaId);
      if (!company) throw new UserCompanyNotFoundError();
    }
    return this.users.save({
      ...current,
      nome: input.nome === undefined ? current.nome : normalizeUserName(input.nome),
      email: input.email === undefined ? current.email : normalizeUserEmail(input.email),
      empresaId: input.empresaId ?? current.empresaId,
      status: input.status ?? current.status,
    });
  }
}
