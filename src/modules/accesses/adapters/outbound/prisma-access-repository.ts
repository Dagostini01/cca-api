import { Prisma, PrismaClient } from '@prisma/client';
import type { AccessListFilter, AccessRepository, NewAccess } from '../../application/ports/access-repository.js';
import type { Access } from '../../domain/access.js';
import { AccessConflictError, AccessNotFoundError, AccessProfileNotFoundError, AccessSystemNotFoundError, AccessUserNotFoundError } from '../../domain/access-errors.js';

function toAccess(row: {
  id: string;
  usuarioId: string;
  perfilId: string;
  sistemaId: string;
  status: Access['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): Access {
  return {
    id: row.id,
    usuarioId: row.usuarioId,
    perfilId: row.perfilId,
    sistemaId: row.sistemaId,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new AccessConflictError();
    if (error.code === 'P2025') throw new AccessNotFoundError();
    if (error.code === 'P2003') {
      const field = String(error.meta?.field_name ?? '');
      if (field.includes('usuario')) throw new AccessUserNotFoundError();
      if (field.includes('perfil')) throw new AccessProfileNotFoundError();
      throw new AccessSystemNotFoundError();
    }
  }
  throw error;
}

export class PrismaAccessRepository implements AccessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(access: NewAccess): Promise<Access> {
    try {
      const row = await this.prisma.acesso.create({ data: access });
      return toAccess(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(filter: AccessListFilter = {}): Promise<Access[]> {
    const rows = await this.prisma.acesso.findMany({
      where: {
        usuarioId: filter.usuarioId,
        sistemaId: filter.sistemaId,
      },
    });
    return rows.map(toAccess);
  }

  async count(): Promise<number> {
    return this.prisma.acesso.count();
  }

  async findById(id: string): Promise<Access | null> {
    const row = await this.prisma.acesso.findUnique({ where: { id } });
    return row ? toAccess(row) : null;
  }

  async save(access: Access): Promise<Access> {
    try {
      const row = await this.prisma.acesso.update({
        where: { id: access.id },
        data: { perfilId: access.perfilId, status: access.status },
      });
      return toAccess(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaAccessRepository(prisma: PrismaClient): AccessRepository {
  return new PrismaAccessRepository(prisma);
}
