import { Prisma, PrismaClient } from '@prisma/client';
import type { NewSubmenu, SubmenuRepository } from '../../application/ports/submenu-repository.js';
import type { Submenu } from '../../domain/submenu.js';
import { SubmenuMenuNotFoundError, SubmenuNameConflictError, SubmenuNotFoundError } from '../../domain/submenu-errors.js';

function toSubmenu(row: {
  id: string;
  menuId: string;
  nome: string;
  status: Submenu['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): Submenu {
  return {
    id: row.id,
    menuId: row.menuId,
    nome: row.nome,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
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
      const row = await this.prisma.submenu.create({ data: submenu });
      return toSubmenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(menuId?: string): Promise<Submenu[]> {
    const rows = await this.prisma.submenu.findMany({ where: menuId ? { menuId } : undefined });
    return rows.map(toSubmenu);
  }

  async findById(id: string): Promise<Submenu | null> {
    const row = await this.prisma.submenu.findUnique({ where: { id } });
    return row ? toSubmenu(row) : null;
  }

  async save(submenu: Submenu): Promise<Submenu> {
    try {
      const row = await this.prisma.submenu.update({
        where: { id: submenu.id },
        data: { menuId: submenu.menuId, nome: submenu.nome, status: submenu.status },
      });
      return toSubmenu(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaSubmenuRepository(prisma: PrismaClient): SubmenuRepository {
  return new PrismaSubmenuRepository(prisma);
}
