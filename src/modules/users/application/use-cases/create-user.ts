import { normalizeKeycloakSubject, normalizeUserEmail, normalizeUserName, type BusinessUser, type UserStatus } from '../../domain/user.js';
import { UserCompanyNotFoundError } from '../../domain/user-errors.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { UserRepository } from '../ports/user-repository.js';

export type CreateUserInput = {
  nome: string;
  email: string;
  keycloakSub: string;
  empresaId: string;
  status?: UserStatus;
};

export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly companies: ParentCompanyLookup,
  ) {}

  async execute(input: CreateUserInput): Promise<BusinessUser> {
    const company = await this.companies.findById(input.empresaId);
    if (!company) throw new UserCompanyNotFoundError();
    return this.users.add({
      keycloakSub: normalizeKeycloakSubject(input.keycloakSub),
      nome: normalizeUserName(input.nome),
      email: normalizeUserEmail(input.email),
      empresaId: input.empresaId,
      status: input.status ?? 'ATIVO',
    });
  }
}
