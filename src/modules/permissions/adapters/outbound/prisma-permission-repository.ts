import { Prisma, PrismaClient, TipoRecurso } from '@prisma/client';
import type { NewPermission, PermissionRepository } from '../../application/ports/permission-repository.js';
import type { Permission, ResourceKind } from '../../domain/permission.js';
import { PermissionConflictError, PermissionNotFoundError, PermissionProfileNotFoundError, PermissionResourceNotFoundError } from '../../domain/permission-errors.js';

function resourceId(row: {
  recursoTipo: TipoRecurso;
  empresaId: string | null;
  sistemaId: string | null;
  moduloId: string | null;
  menuId: string | null;
  submenuId: string | null;
}): string {
  const id = row.recursoTipo === 'EMPRESA' ? row.empresaId
    : row.recursoTipo === 'SISTEMA' ? row.sistemaId
      : row.recursoTipo === 'MODULO' ? row.moduloId
        : row.recursoTipo === 'MENU' ? row.menuId
          : row.submenuId;
  if (!id) throw new Error('permission row does not match its resource type');
  return id;
}

function toPermission(row: {
  id: string;
  perfilId: string;
  recursoTipo: TipoRecurso;
  empresaId: string | null;
  sistemaId: string | null;
  moduloId: string | null;
  menuId: string | null;
  submenuId: string | null;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}): Permission {
  return {
    id: row.id,
    perfilId: row.perfilId,
    recursoTipo: row.recursoTipo,
    recursoId: resourceId(row),
    visualizar: row.visualizar,
    criar: row.criar,
    editar: row.editar,
    excluir: row.excluir,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

function columnsFor(kind: ResourceKind, id: string) {
  return {
    recursoTipo: kind,
    empresaId: kind === 'EMPRESA' ? id : null,
    sistemaId: kind === 'SISTEMA' ? id : null,
    moduloId: kind === 'MODULO' ? id : null,
    menuId: kind === 'MENU' ? id : null,
    submenuId: kind === 'SUBMENU' ? id : null,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new PermissionConflictError();
    if (error.code === 'P2025') throw new PermissionNotFoundError();
    if (error.code === 'P2003') {
      const field = String(error.meta?.field_name ?? '');
      if (field.includes('perfil')) throw new PermissionProfileNotFoundError();
      throw new PermissionResourceNotFoundError();
    }
  }
  throw error;
}

export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(permission: NewPermission): Promise<Permission> {
    try {
      const row = await this.prisma.permissao.create({
        data: {
          perfilId: permission.perfilId,
          ...columnsFor(permission.recursoTipo, permission.recursoId),
          visualizar: permission.visualizar,
          criar: permission.criar,
          editar: permission.editar,
          excluir: permission.excluir,
        },
      });
      return toPermission(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(perfilId?: string): Promise<Permission[]> {
    const rows = await this.prisma.permissao.findMany({ where: perfilId ? { perfilId } : undefined });
    return rows.map(toPermission);
  }

  async findById(id: string): Promise<Permission | null> {
    const row = await this.prisma.permissao.findUnique({ where: { id } });
    return row ? toPermission(row) : null;
  }

  async save(permission: Permission): Promise<Permission> {
    try {
      const row = await this.prisma.permissao.update({
        where: { id: permission.id },
        data: {
          visualizar: permission.visualizar,
          criar: permission.criar,
          editar: permission.editar,
          excluir: permission.excluir,
        },
      });
      return toPermission(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaPermissionRepository(prisma: PrismaClient): PermissionRepository {
  return new PrismaPermissionRepository(prisma);
}
