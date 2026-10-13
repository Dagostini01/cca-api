import { assertGrantedActions, type Permission, type PermissionActions, type ResourceKind } from '../../domain/permission.js';
import { PermissionCompanyMismatchError, PermissionProfileNotFoundError, PermissionResourceNotFoundError } from '../../domain/permission-errors.js';
import type { ChainResourceLookup } from '../ports/chain-resource-lookup.js';
import type { PermissionRepository } from '../ports/permission-repository.js';
import type { ProfileOwnerLookup } from '../ports/profile-owner-lookup.js';

export type CreatePermissionInput = PermissionActions & {
  perfilId: string;
  recursoTipo: ResourceKind;
  recursoId: string;
};

export class CreatePermission {
  constructor(
    private readonly permissions: PermissionRepository,
    private readonly profiles: ProfileOwnerLookup,
    private readonly resources: ChainResourceLookup,
  ) {}

  async execute(input: CreatePermissionInput): Promise<Permission> {
    const actions = assertGrantedActions(input);
    const profile = await this.profiles.findById(input.perfilId);
    if (!profile) throw new PermissionProfileNotFoundError();
    const owner = await this.resources.findOwner(input.recursoTipo, input.recursoId);
    if (!owner) throw new PermissionResourceNotFoundError();
    if (owner.empresaId !== profile.empresaId) throw new PermissionCompanyMismatchError();
    return this.permissions.add({
      perfilId: input.perfilId,
      recursoTipo: input.recursoTipo,
      recursoId: input.recursoId,
      ...actions,
    });
  }
}
