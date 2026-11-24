import type { UserType } from '../../../../shared/catalog/status.js';
import type { ScreenAccess } from '../../domain/access.js';
import { AccessConflictError, AccessUserNotFoundError } from '../../domain/access-errors.js';
import { resolveScreen, type ScreenChainLookup, type ScreenSelection } from '../services/screen-chain.js';
import type { AccessRepository } from '../ports/access-repository.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import type { AccessStatus } from '../../domain/access.js';

export type CreateAccessInput = ScreenSelection & {
  usuarioId: number;
  status?: AccessStatus;
};

export class CreateAccess {
  constructor(
    private readonly accesses: AccessRepository,
    private readonly users: UserRepository,
    private readonly chain: ScreenChainLookup,
  ) {}

  async execute(input: CreateAccessInput): Promise<ScreenAccess> {
    const user = await this.users.findById(input.usuarioId);
    if (!user) throw new AccessUserNotFoundError();
    const screen = await resolveScreen(this.chain, input);
    const existing = await this.accesses.list({ usuarioId: user.id, submenuId: screen.submenuId });
    if (existing.length > 0) throw new AccessConflictError();
    return this.accesses.add({
      usuarioId: user.id,
      ...screen,
      tipo: user.tipo satisfies UserType,
      status: input.status ?? 'ATIVADO',
    });
  }
}
