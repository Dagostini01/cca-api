import type { Permission, PermissionActions, ResourceKind } from '../../domain/permission.js';

export type NewPermission = PermissionActions & {
  perfilId: string;
  recursoTipo: ResourceKind;
  recursoId: string;
};

export interface PermissionRepository {
  add(permission: NewPermission): Promise<Permission>;
  list(perfilId?: string): Promise<Permission[]>;
  findById(id: string): Promise<Permission | null>;
  save(permission: Permission): Promise<Permission>;
}
