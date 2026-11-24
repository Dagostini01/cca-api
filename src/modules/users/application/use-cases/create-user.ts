import type { ScreenDraft } from '../../../accesses/application/ports/access-repository.js';
import { AccessConflictError } from '../../../accesses/domain/access-errors.js';
import type { ScreenRef } from '../../../accesses/domain/access.js';
import { resolveScreen, type ScreenChainLookup, type ScreenSelection } from '../../../accesses/application/services/screen-chain.js';
import type { UserType } from '../../../../shared/catalog/status.js';
import {
  normalizeKeycloakSubject,
  normalizeOptionalUserDocument,
  normalizeOptionalUserName,
  normalizeUserEmail,
  normalizeUserName,
  USER_DOCUMENT_MAX_LENGTH,
  USER_PHONE_MAX_LENGTH,
  type BusinessUser,
  type UserStatus,
} from '../../domain/user.js';
import { InvalidUserSubjectError } from '../../domain/user-errors.js';
import type { IdentityDirectory } from '../ports/identity-directory.js';
import type { UserRegistrar } from '../ports/user-registrar.js';
import type { UserRepository } from '../ports/user-repository.js';

export type CreateUserInput = {
  nome: string;
  sobrenome?: string | null;
  apelido?: string | null;
  rg?: string | null;
  cpf?: string | null;
  email: string;
  celular?: string | null;
  keycloakSub?: string;
  tipo?: UserType;
  status?: UserStatus;
  telas?: ScreenSelection[];
};

export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly registrar: UserRegistrar,
    private readonly chain: ScreenChainLookup,
    private readonly directory?: IdentityDirectory,
  ) {}

  async execute(input: CreateUserInput, actorSubject: string): Promise<BusinessUser> {
    const nome = normalizeUserName(input.nome);
    const email = normalizeUserEmail(input.email);
    const status = input.status ?? 'ATIVADO';
    const tipo = input.tipo ?? 'ADMINITRADOR';
    const telas = await this.prepareScreens(input.telas ?? []);
    const actor = await this.users.findBySubject(actorSubject);
    const linked = await this.resolveSubject(input.keycloakSub, { nome, email, enabled: status === 'ATIVADO' });
    const screens: ScreenDraft[] = telas.map((tela) => ({ ...tela, tipo, status: 'ATIVADO' }));
    try {
      return await this.registrar.register({
        keycloakSub: linked.id,
        nome,
        sobrenome: normalizeOptionalUserName(input.sobrenome),
        apelido: normalizeOptionalUserName(input.apelido),
        rg: normalizeOptionalUserDocument(input.rg, USER_DOCUMENT_MAX_LENGTH),
        cpf: normalizeOptionalUserDocument(input.cpf, USER_DOCUMENT_MAX_LENGTH),
        email,
        celular: normalizeOptionalUserDocument(input.celular, USER_PHONE_MAX_LENGTH),
        tipo,
        status,
        criadoPorId: actor?.id ?? null,
      }, screens);
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

  private async prepareScreens(telas: ScreenSelection[]): Promise<ScreenRef[]> {
    const seen = new Set<number>();
    const resolved: ScreenRef[] = [];
    for (const tela of telas) {
      if (seen.has(tela.submenuId)) throw new AccessConflictError();
      seen.add(tela.submenuId);
      resolved.push(await resolveScreen(this.chain, tela));
    }
    return resolved;
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
