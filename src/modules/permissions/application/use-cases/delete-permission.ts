import type { Permission } from '../../domain/permission.js';
import { PermissionNotFoundError } from '../../domain/permission-errors.js';
import type { PermissionRepository } from '../ports/permission-repository.js';

export class DeletePermission {
  constructor(private readonly permissions: PermissionRepository) {}

  async execute(id: string): Promise<Permission> {
    const permission = await this.permissions.findById(id);
    if (!permission) throw new PermissionNotFoundError();
    await this.permissions.remove(id);
    return permission;
  }
}
