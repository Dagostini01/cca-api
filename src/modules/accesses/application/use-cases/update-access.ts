import { sameCompany, type Access, type AccessStatus } from '../../domain/access.js';
import {
  AccessCompanyMismatchError,
  AccessNotFoundError,
  AccessProfileNotFoundError,
  AccessSystemNotFoundError,
  AccessUserNotFoundError,
  EmptyAccessUpdateError,
} from '../../domain/access-errors.js';
import type { AccessRepository } from '../ports/access-repository.js';
import type { AccessPartyLookup } from '../ports/access-party-lookup.js';

export type UpdateAccessInput = {
  perfilId?: string;
  status?: AccessStatus;
};

export class UpdateAccess {
  constructor(
    private readonly accesses: AccessRepository,
    private readonly users: AccessPartyLookup,
    private readonly profiles: AccessPartyLookup,
    private readonly systems: AccessPartyLookup,
  ) {}

  async execute(id: string, input: UpdateAccessInput): Promise<Access> {
    if (input.perfilId === undefined && input.status === undefined) throw new EmptyAccessUpdateError();
    const current = await this.accesses.findById(id);
    if (!current) throw new AccessNotFoundError();
    const perfilId = input.perfilId ?? current.perfilId;
    if (input.perfilId !== undefined) {
      const user = await this.users.findById(current.usuarioId);
      if (!user) throw new AccessUserNotFoundError();
      const profile = await this.profiles.findById(perfilId);
      if (!profile) throw new AccessProfileNotFoundError();
      const system = await this.systems.findById(current.sistemaId);
      if (!system) throw new AccessSystemNotFoundError();
      if (!sameCompany(user.empresaId, profile.empresaId, system.empresaId)) throw new AccessCompanyMismatchError();
    }
    return this.accesses.save({
      ...current,
      perfilId,
      status: input.status ?? current.status,
    });
  }
}
