import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, statusOf } from '../../../../shared/catalog/status.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { MenuListFilter, MenuPageQuery, MenuRepository, NewMenu } from '../../application/ports/menu-repository.js';
import type { Menu } from '../../domain/menu.js';
import { MenuModuleNotFoundError, MenuNameConflictError, MenuNotFoundError } from '../../domain/menu-errors.js';

function toMenu(row: {
  id: number;
  moduloId: number;
  nome: string;
  descricaoCurta: string | null;
  descricaoLonga: string | null;
  statusId: number | null;
  criadoEm: Date | null;
}): Menu {
  return {
    id: row.id,
    moduloId: row.moduloId,
    nome: row.nome,
    descricaoCurta: row.descricaoCurta,
    descricaoLonga: row.descricaoLonga,
    status: statusOf(row.statusId),
    criadoEm: row.criadoEm ?? new Date(),
  };
}

function whereOf(filter: MenuListFilter = {}): Prisma.MenuWhereInput {
  const q = filter.q?.trim();
  return {
    ...(filter.moduloId === undefined ? {} : { moduloId: filter.moduloId }),
    ...(q ? {
      OR: [
        { nome: { contains: q } },
        { descricaoCurta: { contains: q } },
        { descricaoLonga: { contains: q } },
        { modulo: { nome: { contains: q } } },
        { modulo: { sistema: { nome: { contains: q } } } },
        { modulo: { sistema: { empresas: { some: { empresa: { razaoSocial: { contains: q } } } } } } },
      ],
    } : {}),
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new MenuNameConflictError();
    if (error.code === 'P2003') throw new MenuModuleNotFoundError();
    if (error.code === 'P2025') throw new MenuNotFoundError();
  }
  throw error;
}

export class PrismaMenuRepository implements MenuRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(menu: NewMenu): Promise<Menu> {
    try {
      const row = await this.prisma.menu.create({
        data: {
          moduloId: menu.moduloId,
          nome: menu.nome,
          descricaoCurta: menu.descricaoCurta,
          descricaoLonga: menu.descricaoLonga,
          statusId: statusIdOf(menu.status),
        },
      });
      return toMenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(filter: MenuListFilter = {}): Promise<Menu[]> {
    const rows = await this.prisma.menu.findMany({ where: whereOf(filter) });
    return rows.map(toMenu);
  }

  async page(query: MenuPageQuery): Promise<{ rows: Menu[]; total: number }> {
    const where = whereOf(query);
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.menu.count({ where }),
      this.prisma.menu.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { moduloId: 'asc' }, { id: 'asc' }],
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toMenu), total };
  }

  async findById(id: number): Promise<Menu | null> {
    const row = await this.prisma.menu.findUnique({ where: { id } });
    return row ? toMenu(row) : null;
  }

  async save(menu: Menu): Promise<Menu> {
    try {
      const row = await this.prisma.menu.update({
        where: { id: menu.id },
        data: {
          moduloId: menu.moduloId,
          nome: menu.nome,
          descricaoCurta: menu.descricaoCurta,
          descricaoLonga: menu.descricaoLonga,
          statusId: statusIdOf(menu.status),
        },
      });
      return toMenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.menu.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new DeleteRestrictedError();
      mapPersistenceError(error);
    }
  }
}

export function createPrismaMenuRepository(prisma: PrismaClient): MenuRepository {
  return new PrismaMenuRepository(prisma);
}
