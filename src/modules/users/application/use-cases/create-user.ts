import { normalizeKeycloakSubject, normalizeUserEmail, normalizeUserName, type BusinessUser, type UserStatus } from '../../domain/user.js';
import { InvalidUserSubjectError, UserCompanyNotFoundError } from '../../domain/user-errors.js';
import type { IdentityDirectory } from '../ports/identity-directory.js';
import type { ParentCompanyLookup } from '../ports/parent-company-lookup.js';
import type { UserRepository } from '../ports/user-repository.js';

export type CreateUserInput = {
  nome: string;
  email: string;
  keycloakSub?: string;
  empresaId: string;
  status?: UserStatus;
};

export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly companies: ParentCompanyLookup,
    private readonly directory?: IdentityDirectory,
  ) {}

  async execute(input: CreateUserInput): Promise<BusinessUser> {
    const company = await this.companies.findById(input.empresaId);
    if (!company) throw new UserCompanyNotFoundError();
    const nome = normalizeUserName(input.nome);
    const email = normalizeUserEmail(input.email);
    const status = input.status ?? 'ATIVO';
    const linked = await this.resolveSubject(input.keycloakSub, { nome, email, enabled: status === 'ATIVO' });
    try {
      return await this.users.add({
        keycloakSub: linked.id,
        nome,
        email,
        empresaId: input.empresaId,
        status,
      });
    } catch (error) {
      if (linked.created && this.directory) {
        try {
          await this.directory.remove(linked.id);
        } catch {
          // The local failure stays the response. The directory account may remain.
        }
      }
      throw error;
    }
  }

  private async resolveSubject(
    keycloakSub: string | undefined,
    profile: { nome: string; email: string; enabled: boolean },
  ): Promise<{ id: string; created: boolean }> {
    if (keycloakSub !== undefined) {
      const id = normalizeKeycloakSubject(keycloakSub);
      if (this.directory) await this.directory.assertExists(id);
      return { id, created: false };
    }
    if (!this.directory) throw new InvalidUserSubjectError();
    const created = await this.directory.provision(profile);
    return { id: normalizeKeycloakSubject(created.id), created: true };
  }
}
