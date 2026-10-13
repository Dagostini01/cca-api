import { Prisma, PrismaClient } from '@prisma/client';
import type { ModuleRepository, NewModule } from '../../application/ports/module-repository.js';
import type { Module } from '../../domain/module.js';
import { ModuleNameConflictError, ModuleNotFoundError, ModuleSystemNotFoundError } from '../../domain/module-errors.js';

function toModule(row: {
  id: string;
  sistemaId: string;
  nome: string;
  status: Module['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): Module {
  return {
    id: row.id,
    sistemaId: row.sistemaId,
    nome: row.nome,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ModuleNameConflictError();
    if (error.code === 'P2003') throw new ModuleSystemNotFoundError();
    if (error.code === 'P2025') throw new ModuleNotFoundError();
  }
  throw error;
}

export class PrismaModuleRepository implements ModuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(module: NewModule): Promise<Module> {
    try {
      const row = await this.prisma.modulo.create({ data: module });
      return toModule(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(sistemaId?: string): Promise<Module[]> {
    const rows = await this.prisma.modulo.findMany({ where: sistemaId ? { sistemaId } : undefined });
    return rows.map(toModule);
  }

  async findById(id: string): Promise<Module | null> {
    const row = await this.prisma.modulo.findUnique({ where: { id } });
    return row ? toModule(row) : null;
  }

  async save(module: Module): Promise<Module> {
    try {
      const row = await this.prisma.modulo.update({
        where: { id: module.id },
        data: { sistemaId: module.sistemaId, nome: module.nome, status: module.status },
      });
      return toModule(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaModuleRepository(prisma: PrismaClient): ModuleRepository {
  return new PrismaModuleRepository(prisma);
}
