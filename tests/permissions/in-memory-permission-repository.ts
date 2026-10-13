import { randomUUID } from 'node:crypto';
import type { NewPermission, PermissionRepository } from '../../src/modules/permissions/application/ports/permission-repository.js';
import type { Permission } from '../../src/modules/permissions/domain/permission.js';
import { PermissionConflictError, PermissionNotFoundError } from '../../src/modules/permissions/domain/permission-errors.js';

function clone(permission: Permission): Permission {
  return {
    ...permission,
    criadoEm: new Date(permission.criadoEm),
    atualizadoEm: new Date(permission.atualizadoEm),
  };
}

export class InMemoryPermissionRepository implements PermissionRepository {
  private readonly permissions = new Map<string, Permission>();

  async add(permission: NewPermission): Promise<Permission> {
    this.assertAvailable(permission.perfilId, permission.recursoTipo, permission.recursoId, null);
    const now = new Date();
    const stored: Permission = { id: randomUUID(), ...permission, criadoEm: now, atualizadoEm: now };
    this.permissions.set(stored.id, stored);
    return clone(stored);
  }

  async list(perfilId?: string): Promise<Permission[]> {
    return [...this.permissions.values()].filter((permission) => perfilId === undefined || permission.perfilId === perfilId).map(clone);
  }

  async findById(id: string): Promise<Permission | null> {
    const permission = this.permissions.get(id);
    return permission ? clone(permission) : null;
  }

  async save(permission: Permission): Promise<Permission> {
    const current = this.permissions.get(permission.id);
    if (!current) throw new PermissionNotFoundError();
    if (current.perfilId !== permission.perfilId || current.recursoTipo !== permission.recursoTipo || current.recursoId !== permission.recursoId) {
      throw new PermissionConflictError();
    }
    const stored: Permission = { ...current, visualizar: permission.visualizar, criar: permission.criar, editar: permission.editar, excluir: permission.excluir, atualizadoEm: new Date() };
    this.permissions.set(permission.id, stored);
    return clone(stored);
  }

  private assertAvailable(perfilId: string, recursoTipo: Permission['recursoTipo'], recursoId: string, ignoreId: string | null) {
    for (const permission of this.permissions.values()) {
      if (permission.id !== ignoreId && permission.perfilId === perfilId && permission.recursoTipo === recursoTipo && permission.recursoId === recursoId) {
        throw new PermissionConflictError();
      }
    }
  }
}
