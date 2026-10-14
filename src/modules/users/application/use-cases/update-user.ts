import { normalizeUserEmail, normalizeUserName, type BusinessUser, type UserStatus } from '../../domain/user.js';
import { EmptyUserUpdateError, UserCompanyNotFoundError, UserNotFoundError } from '../../domain/user-errors.js';
import type { IdentityDirectory } from '../ports/identity-directory.js';
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
    private readonly directory?: IdentityDirectory,
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
    const next = {
      nome: input.nome === undefined ? current.nome : normalizeUserName(input.nome),
      email: input.email === undefined ? current.email : normalizeUserEmail(input.email),
      empresaId: input.empresaId ?? current.empresaId,
      status: input.status ?? current.status,
    };
    const profileChanged = next.nome !== current.nome || next.email !== current.email || next.status !== current.status;
    if (this.directory && profileChanged) {
      await this.directory.sync(current.keycloakSub, {
        nome: next.nome,
        email: next.email,
        enabled: next.status === 'ATIVO',
      });
    }
    try {
      return await this.users.save({ ...current, ...next });
    } catch (error) {
      if (this.directory && profileChanged) {
        try {
          await this.directory.sync(current.keycloakSub, {
            nome: current.nome,
            email: current.email,
            enabled: current.status === 'ATIVO',
          });
        } catch {
          // The local failure stays the response.
        }
      }
      throw error;
    }
  }
}
