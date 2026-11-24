import type { AccessRepository, ScreenDraft } from '../../../accesses/application/ports/access-repository.js';
import { AccessConflictError } from '../../../accesses/domain/access-errors.js';
import { resolveScreen, type ScreenChainLookup, type ScreenSelection } from '../../../accesses/application/services/screen-chain.js';
import type { UserType } from '../../../../shared/catalog/status.js';
import {
  normalizeOptionalUserDocument,
  normalizeOptionalUserName,
  normalizeUserEmail,
  normalizeUserName,
  USER_DOCUMENT_MAX_LENGTH,
  USER_PHONE_MAX_LENGTH,
  type BusinessUser,
  type UserStatus,
} from '../../domain/user.js';
import { EmptyUserUpdateError, UserNotFoundError } from '../../domain/user-errors.js';
import type { IdentityDirectory } from '../ports/identity-directory.js';
import type { UserRepository } from '../ports/user-repository.js';

export type UpdateUserInput = {
  nome?: string;
  sobrenome?: string | null;
  apelido?: string | null;
  rg?: string | null;
  cpf?: string | null;
  email?: string;
  celular?: string | null;
  tipo?: UserType;
  status?: UserStatus;
  telas?: ScreenSelection[];
};

export class UpdateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly accesses: AccessRepository,
    private readonly chain: ScreenChainLookup,
    private readonly directory?: IdentityDirectory,
  ) {}

  async execute(id: number, input: UpdateUserInput): Promise<BusinessUser> {
    if (
      input.nome === undefined
      && input.sobrenome === undefined
      && input.apelido === undefined
      && input.rg === undefined
      && input.cpf === undefined
      && input.email === undefined
      && input.celular === undefined
      && input.tipo === undefined
      && input.status === undefined
      && input.telas === undefined
    ) {
      throw new EmptyUserUpdateError();
    }
    const current = await this.users.findById(id);
    if (!current) throw new UserNotFoundError();
    const next = {
      nome: input.nome === undefined ? current.nome : normalizeUserName(input.nome),
      sobrenome: input.sobrenome === undefined ? current.sobrenome : normalizeOptionalUserName(input.sobrenome),
      apelido: input.apelido === undefined ? current.apelido : normalizeOptionalUserName(input.apelido),
      rg: input.rg === undefined ? current.rg : normalizeOptionalUserDocument(input.rg, USER_DOCUMENT_MAX_LENGTH),
      cpf: input.cpf === undefined ? current.cpf : normalizeOptionalUserDocument(input.cpf, USER_DOCUMENT_MAX_LENGTH),
      email: input.email === undefined ? current.email : normalizeUserEmail(input.email),
      celular: input.celular === undefined ? current.celular : normalizeOptionalUserDocument(input.celular, USER_PHONE_MAX_LENGTH),
      tipo: input.tipo ?? current.tipo,
      status: input.status ?? current.status,
    };
    const screens = input.telas === undefined ? undefined : await this.screensFor(input.telas, next.tipo);
    const emailChanged = next.email !== current.email;
    const profileChanged = next.nome !== current.nome || emailChanged || next.status !== current.status;
    const canSync = this.directory && current.keycloakSub && current.email && next.email && profileChanged;
    if (canSync && current.keycloakSub && next.email) {
      await this.directory?.sync(current.keycloakSub, {
        nome: next.nome,
        ...(emailChanged ? { email: next.email } : {}),
        enabled: next.status === 'ATIVADO',
      });
    }
    try {
      const saved = await this.users.save({ ...current, ...next });
      if (screens) await this.accesses.replace(saved.id, screens);
      return saved;
    } catch (error) {
      if (canSync && current.keycloakSub && current.email) {
        try {
          await this.directory?.sync(current.keycloakSub, {
            nome: current.nome,
            ...(emailChanged ? { email: current.email } : {}),
            enabled: current.status === 'ATIVADO',
          });
        } catch {
          // The local failure stays the response.
        }
      }
      throw error;
    }
  }

  private async screensFor(telas: ScreenSelection[], tipo: UserType): Promise<ScreenDraft[]> {
    const seen = new Set<number>();
    const drafts: ScreenDraft[] = [];
    for (const tela of telas) {
      if (seen.has(tela.submenuId)) throw new AccessConflictError();
      seen.add(tela.submenuId);
      const screen = await resolveScreen(this.chain, tela);
      drafts.push({ ...screen, tipo, status: 'ATIVADO' });
    }
    return drafts;
  }
}
