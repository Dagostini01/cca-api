import { Prisma, PrismaClient } from '@prisma/client';
import type { NewSystem, SystemRepository } from '../../application/ports/system-repository.js';
import type { System } from '../../domain/system.js';
import { SystemCompanyNotFoundError, SystemNameConflictError, SystemNotFoundError } from '../../domain/system-errors.js';

function toSystem(row: {
  id: string;
  empresaId: string;
  nome: string;
  status: System['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): System {
  return {
    id: row.id,
    empresaId: row.empresaId,
    nome: row.nome,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new SystemNameConflictError();
    if (error.code === 'P2003') throw new SystemCompanyNotFoundError();
    if (error.code === 'P2025') throw new SystemNotFoundError();
  }
  throw error;
}

export class PrismaSystemRepository implements SystemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(system: NewSystem): Promise<System> {
    try {
      const row = await this.prisma.sistema.create({ data: system });
      return toSystem(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(empresaId?: string): Promise<System[]> {
    const rows = await this.prisma.sistema.findMany({ where: empresaId ? { empresaId } : undefined });
    return rows.map(toSystem);
  }

  async findById(id: string): Promise<System | null> {
    const row = await this.prisma.sistema.findUnique({ where: { id } });
    return row ? toSystem(row) : null;
  }

  async save(system: System): Promise<System> {
    try {
      const row = await this.prisma.sistema.update({
        where: { id: system.id },
        data: { empresaId: system.empresaId, nome: system.nome, status: system.status },
      });
      return toSystem(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaSystemRepository(prisma: PrismaClient): SystemRepository {
  return new PrismaSystemRepository(prisma);
}
