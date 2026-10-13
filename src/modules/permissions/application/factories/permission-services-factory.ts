import type { ChainResourceLookup } from '../ports/chain-resource-lookup.js';
import type { PermissionRepository } from '../ports/permission-repository.js';
import type { ProfileOwnerLookup } from '../ports/profile-owner-lookup.js';
import { CreatePermission } from '../use-cases/create-permission.js';
import { GetPermission } from '../use-cases/get-permission.js';
import { ListPermissions } from '../use-cases/list-permissions.js';
import { UpdatePermission } from '../use-cases/update-permission.js';

export type PermissionServices = {
  createPermission: CreatePermission;
  listPermissions: ListPermissions;
  getPermission: GetPermission;
  updatePermission: UpdatePermission;
};

export function createPermissionServices(
  permissions: PermissionRepository,
  profiles: ProfileOwnerLookup,
  resources: ChainResourceLookup,
): PermissionServices {
  return {
    createPermission: new CreatePermission(permissions, profiles, resources),
    listPermissions: new ListPermissions(permissions),
    getPermission: new GetPermission(permissions),
    updatePermission: new UpdatePermission(permissions),
  };
}
