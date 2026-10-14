import type { PermissionRepository } from '../ports/permission-repository.js';
import type { ResourceKind } from '../../domain/permission.js';

export async function hasPermissionOn(permissions: PermissionRepository, tipo: ResourceKind, id: string): Promise<boolean> {
  const rows = await permissions.list();
  return rows.some((row) => row.recursoTipo === tipo && row.recursoId === id);
}
