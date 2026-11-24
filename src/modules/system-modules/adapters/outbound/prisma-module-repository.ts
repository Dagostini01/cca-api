import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, statusOf } from '../../../../shared/catalog/status.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { ModuleListFilter, ModulePageQuery, ModuleRepository, NewModule } from '../../application/ports/module-repository.js';
import type { Module } from '../../domain/module.js';
import { ModuleNameConflictError, ModuleNotFoundError, ModuleSystemNotFoundError } from '../../domain/module-errors.js';

function toModule(row: {
  id: number;
  sistemaId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  statusId: number | null;
  criadoEm: Date;
}): Module {
  return {
    id: row.id,
    sistemaId: row.sistemaId,
    nome: row.nome,
    descricaoCurta: row.descricaoCurta,
    descricaoLonga: row.descricaoLonga,
    status: statusOf(row.statusId),
    criadoEm: row.criadoEm,
  };
}

function whereOf(filter: ModuleListFilter = {}): Prisma.ModuloWhereInput {
  const q = filter.q?.trim();
  return {
    ...(filter.sistemaId === undefined ? {} : { sistemaId: filter.sistemaId }),
    ...(q ? {
      OR: [
        { nome: { contains: q } },
        { descricaoCurta: { contains: q } },
        { descricaoLonga: { contains: q } },
        { sistema: { nome: { contains: q } } },
        { sistema: { empresas: { some: { empresa: { razaoSocial: { contains: q } } } } } },
      ],
    } : {}),
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
      const row = await this.prisma.modulo.create({
        data: {
          sistemaId: module.sistemaId,
          nome: module.nome,
          descricaoCurta: module.descricaoCurta,
          descricaoLonga: module.descricaoLonga,
          statusId: statusIdOf(module.status),
        },
      });
      return toModule(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(filter: ModuleListFilter = {}): Promise<Module[]> {
    const rows = await this.prisma.modulo.findMany({ where: whereOf(filter) });
    return rows.map(toModule);
  }

  async page(query: ModulePageQuery): Promise<{ rows: Module[]; total: number }> {
    const where = whereOf(query);
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.modulo.count({ where }),
      this.prisma.modulo.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { sistemaId: 'asc' }, { id: 'asc' }],
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toModule), total };
  }

  async findById(id: number): Promise<Module | null> {
    const row = await this.prisma.modulo.findUnique({ where: { id } });
    return row ? toModule(row) : null;
  }

  async save(module: Module): Promise<Module> {
    try {
      const row = await this.prisma.modulo.update({
        where: { id: module.id },
        data: {
          sistemaId: module.sistemaId,
          nome: module.nome,
          descricaoCurta: module.descricaoCurta,
          descricaoLonga: module.descricaoLonga,
          statusId: statusIdOf(module.status),
        },
      });
      return toModule(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.modulo.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new DeleteRestrictedError();
      mapPersistenceError(error);
    }
  }
}

export function createPrismaModuleRepository(prisma: PrismaClient): ModuleRepository {
  return new PrismaModuleRepository(prisma);
}
