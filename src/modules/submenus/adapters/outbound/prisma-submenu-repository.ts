import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, statusOf } from '../../../../shared/catalog/status.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { NewSubmenu, SubmenuListFilter, SubmenuPageQuery, SubmenuRepository } from '../../application/ports/submenu-repository.js';
import type { Submenu } from '../../domain/submenu.js';
import { SubmenuMenuNotFoundError, SubmenuNameConflictError, SubmenuNotFoundError } from '../../domain/submenu-errors.js';

function toSubmenu(row: {
  id: number;
  menuId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  statusId: number | null;
  criadoEm: Date | null;
}): Submenu {
  return {
    id: row.id,
    menuId: row.menuId,
    nome: row.nome,
    descricaoCurta: row.descricaoCurta,
    descricaoLonga: row.descricaoLonga,
    status: statusOf(row.statusId),
    criadoEm: row.criadoEm ?? new Date(),
  };
}

function whereOf(filter: SubmenuListFilter = {}): Prisma.SubmenuWhereInput {
  const q = filter.q?.trim();
  return {
    ...(filter.menuId === undefined ? {} : { menuId: filter.menuId }),
    ...(q ? {
      OR: [
        { nome: { contains: q } },
        { descricaoCurta: { contains: q } },
        { descricaoLonga: { contains: q } },
        { menu: { nome: { contains: q } } },
        { menu: { modulo: { nome: { contains: q } } } },
        { menu: { modulo: { sistema: { nome: { contains: q } } } } },
        { menu: { modulo: { sistema: { empresas: { some: { empresa: { razaoSocial: { contains: q } } } } } } } },
      ],
    } : {}),
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new SubmenuNameConflictError();
    if (error.code === 'P2003') throw new SubmenuMenuNotFoundError();
    if (error.code === 'P2025') throw new SubmenuNotFoundError();
  }
  throw error;
}

export class PrismaSubmenuRepository implements SubmenuRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(submenu: NewSubmenu): Promise<Submenu> {
    try {
      const row = await this.prisma.submenu.create({
        data: {
          menuId: submenu.menuId,
          nome: submenu.nome,
          descricaoCurta: submenu.descricaoCurta,
          descricaoLonga: submenu.descricaoLonga,
          statusId: statusIdOf(submenu.status),
        },
      });
      return toSubmenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(filter: SubmenuListFilter = {}): Promise<Submenu[]> {
    const rows = await this.prisma.submenu.findMany({ where: whereOf(filter) });
    return rows.map(toSubmenu);
  }

  async page(query: SubmenuPageQuery): Promise<{ rows: Submenu[]; total: number }> {
    const where = whereOf(query);
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.submenu.count({ where }),
      this.prisma.submenu.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { menuId: 'asc' }, { id: 'asc' }],
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toSubmenu), total };
  }

  async findById(id: number): Promise<Submenu | null> {
    const row = await this.prisma.submenu.findUnique({ where: { id } });
    return row ? toSubmenu(row) : null;
  }

  async save(submenu: Submenu): Promise<Submenu> {
    try {
      const row = await this.prisma.submenu.update({
        where: { id: submenu.id },
        data: {
          menuId: submenu.menuId,
          nome: submenu.nome,
          descricaoCurta: submenu.descricaoCurta,
          descricaoLonga: submenu.descricaoLonga,
          statusId: statusIdOf(submenu.status),
        },
      });
      return toSubmenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.submenu.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new DeleteRestrictedError();
      mapPersistenceError(error);
    }
  }
}

export function createPrismaSubmenuRepository(prisma: PrismaClient): SubmenuRepository {
  return new PrismaSubmenuRepository(prisma);
}
