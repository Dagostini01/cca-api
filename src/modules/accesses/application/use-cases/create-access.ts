import { sameCompany, type Access, type AccessStatus } from '../../domain/access.js';
import { AccessCompanyMismatchError, AccessProfileNotFoundError, AccessSystemNotFoundError, AccessUserNotFoundError } from '../../domain/access-errors.js';
import type { AccessRepository } from '../ports/access-repository.js';
import type { AccessPartyLookup } from '../ports/access-party-lookup.js';

export type CreateAccessInput = {
  usuarioId: string;
  perfilId: string;
  sistemaId: string;
  status?: AccessStatus;
};

export class CreateAccess {
  constructor(
    private readonly accesses: AccessRepository,
    private readonly users: AccessPartyLookup,
    private readonly profiles: AccessPartyLookup,
    private readonly systems: AccessPartyLookup,
  ) {}

  async execute(input: CreateAccessInput): Promise<Access> {
    await this.assertSameCompany(input.usuarioId, input.perfilId, input.sistemaId);
    return this.accesses.add({
      usuarioId: input.usuarioId,
      perfilId: input.perfilId,
      sistemaId: input.sistemaId,
      status: input.status ?? 'ATIVO',
    });
  }

  private async assertSameCompany(usuarioId: string, perfilId: string, sistemaId: string): Promise<void> {
    const user = await this.users.findById(usuarioId);
    if (!user) throw new AccessUserNotFoundError();
    const profile = await this.profiles.findById(perfilId);
    if (!profile) throw new AccessProfileNotFoundError();
    const system = await this.systems.findById(sistemaId);
    if (!system) throw new AccessSystemNotFoundError();
    if (!sameCompany(user.empresaId, profile.empresaId, system.empresaId)) throw new AccessCompanyMismatchError();
  }
}
