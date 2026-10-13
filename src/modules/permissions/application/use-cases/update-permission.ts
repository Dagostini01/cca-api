import type { Permission, PermissionActions } from '../../domain/permission.js';
import { EmptyPermissionUpdateError, PermissionNotFoundError } from '../../domain/permission-errors.js';
import type { PermissionRepository } from '../ports/permission-repository.js';

export type UpdatePermissionInput = Partial<PermissionActions>;

export class UpdatePermission {
  constructor(private readonly permissions: PermissionRepository) {}

  async execute(id: string, input: UpdatePermissionInput): Promise<Permission> {
    if (input.visualizar === undefined && input.criar === undefined && input.editar === undefined && input.excluir === undefined) {
      throw new EmptyPermissionUpdateError();
    }
    const current = await this.permissions.findById(id);
    if (!current) throw new PermissionNotFoundError();
    return this.permissions.save({
      ...current,
      visualizar: input.visualizar ?? current.visualizar,
      criar: input.criar ?? current.criar,
      editar: input.editar ?? current.editar,
      excluir: input.excluir ?? current.excluir,
    });
  }
}
