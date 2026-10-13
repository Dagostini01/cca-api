import { RESOURCE_KINDS, type Permission } from '../../domain/permission.js';
import type { PermissionRepository } from '../ports/permission-repository.js';

export class ListPermissions {
  constructor(private readonly permissions: PermissionRepository) {}

  async execute(filter: { perfilId?: string } = {}): Promise<Permission[]> {
    const permissions = await this.permissions.list(filter.perfilId);
    return [...permissions].sort((left, right) => {
      const byKind = RESOURCE_KINDS.indexOf(left.recursoTipo) - RESOURCE_KINDS.indexOf(right.recursoTipo);
      return byKind || left.recursoId.localeCompare(right.recursoId);
    });
  }
}
