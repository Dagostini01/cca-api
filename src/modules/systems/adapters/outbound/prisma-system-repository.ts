import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, statusOf } from '../../../../shared/catalog/status.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { NewSystem, SystemListFilter, SystemPageQuery, SystemRepository } from '../../application/ports/system-repository.js';
import type { System } from '../../domain/system.js';
import { SystemCompanyNotFoundError, SystemNameConflictError, SystemNotFoundError } from '../../domain/system-errors.js';

const withCompanies = { empresas: { select: { empresaId: true } } } as const;

function toSystem(row: {
  id: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  statusId: number | null;
  criadoEm: Date;
  empresas: Array<{ empresaId: number }>;
}): System {
  return {
    id: row.id,
    nome: row.nome,
    descricaoCurta: row.descricaoCurta,
    descricaoLonga: row.descricaoLonga,
    status: statusOf(row.statusId),
    empresaIds: row.empresas.map((link) => link.empresaId).sort((left, right) => left - right),
    criadoEm: row.criadoEm,
  };
}

function whereOf(filter: SystemListFilter = {}): Prisma.SistemaWhereInput {
  const q = filter.q?.trim();
  return {
    ...(filter.empresaId === undefined ? {} : { empresas: { some: { empresaId: filter.empresaId } } }),
    ...(q ? {
      OR: [
        { nome: { contains: q } },
        { descricaoCurta: { contains: q } },
        { descricaoLonga: { contains: q } },
        { empresas: { some: { empresa: { razaoSocial: { contains: q } } } } },
        { empresas: { some: { empresa: { nomeFantasia: { contains: q } } } } },
      ],
    } : {}),
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new SystemNameConflictError();
    if (error.code === 'P2025') throw new SystemNotFoundError();
    if (error.code === 'P2003') throw new SystemCompanyNotFoundError();
  }
  throw error;
}

export class PrismaSystemRepository implements SystemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(system: NewSystem): Promise<System> {
    try {
      const row = await this.prisma.sistema.create({
        data: {
          nome: system.nome,
          descricaoCurta: system.descricaoCurta,
          descricaoLonga: system.descricaoLonga,
          statusId: statusIdOf(system.status),
          empresas: { create: (system.empresaIds ?? []).map((empresaId) => ({ empresaId })) },
        },
        include: withCompanies,
      });
      return toSystem(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(filter: SystemListFilter = {}): Promise<System[]> {
    const rows = await this.prisma.sistema.findMany({ where: whereOf(filter), include: withCompanies });
    return rows.map(toSystem);
  }

  async page(query: SystemPageQuery): Promise<{ rows: System[]; total: number }> {
    const where = whereOf(query);
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.sistema.count({ where }),
      this.prisma.sistema.findMany({
        where,
        include: withCompanies,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toSystem), total };
  }

  async findById(id: number): Promise<System | null> {
    const row = await this.prisma.sistema.findUnique({ where: { id }, include: withCompanies });
    return row ? toSystem(row) : null;
  }

  async save(system: System): Promise<System> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.empresaSistema.deleteMany({ where: { sistemaId: system.id, empresaId: { notIn: system.empresaIds } } });
        await tx.empresaSistema.createMany({
          data: system.empresaIds.map((empresaId) => ({ empresaId, sistemaId: system.id })),
          skipDuplicates: true,
        });
        return tx.sistema.update({
          where: { id: system.id },
          data: {
            nome: system.nome,
            descricaoCurta: system.descricaoCurta,
            descricaoLonga: system.descricaoLonga,
            statusId: statusIdOf(system.status),
          },
          include: withCompanies,
        });
      });
      return toSystem(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.sistema.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new DeleteRestrictedError();
      mapPersistenceError(error);
    }
  }

  async linkCompany(sistemaId: number, empresaId: number): Promise<void> {
    try {
      await this.prisma.empresaSistema.createMany({ data: [{ empresaId, sistemaId }], skipDuplicates: true });
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaSystemRepository(prisma: PrismaClient): SystemRepository {
  return new PrismaSystemRepository(prisma);
}
