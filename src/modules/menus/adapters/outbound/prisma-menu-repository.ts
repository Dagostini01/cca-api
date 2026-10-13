import { Prisma, PrismaClient } from '@prisma/client';
import type { MenuRepository, NewMenu } from '../../application/ports/menu-repository.js';
import type { Menu } from '../../domain/menu.js';
import { MenuModuleNotFoundError, MenuNameConflictError, MenuNotFoundError } from '../../domain/menu-errors.js';

function toMenu(row: {
  id: string;
  moduloId: string;
  nome: string;
  status: Menu['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): Menu {
  return {
    id: row.id,
    moduloId: row.moduloId,
    nome: row.nome,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
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
      const row = await this.prisma.menu.create({ data: menu });
      return toMenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(moduloId?: string): Promise<Menu[]> {
    const rows = await this.prisma.menu.findMany({ where: moduloId ? { moduloId } : undefined });
    return rows.map(toMenu);
  }

  async findById(id: string): Promise<Menu | null> {
    const row = await this.prisma.menu.findUnique({ where: { id } });
    return row ? toMenu(row) : null;
  }

  async save(menu: Menu): Promise<Menu> {
    try {
      const row = await this.prisma.menu.update({
        where: { id: menu.id },
        data: { moduloId: menu.moduloId, nome: menu.nome, status: menu.status },
      });
      return toMenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaMenuRepository(prisma: PrismaClient): MenuRepository {
  return new PrismaMenuRepository(prisma);
}
