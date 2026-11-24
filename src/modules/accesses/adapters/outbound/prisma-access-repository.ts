import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, statusOf, userTypeIdOf, userTypeOf } from '../../../../shared/catalog/status.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { AccessRepository, NewScreenAccess, ScreenDraft, ScreenListFilter, ScreenPageQuery, ScreenViewFilter } from '../../application/ports/access-repository.js';
import type { ScreenAccess, ScreenAccessView } from '../../domain/access.js';
import { AccessConflictError, AccessNotFoundError } from '../../domain/access-errors.js';

function toAccess(row: {
  id: number;
  usuarioId: number;
  empresaId: number;
  sistemaId: number;
  moduloId: number;
  menuId: number;
  submenuId: number;
  tipoId: number | null;
  statusId: number | null;
  criadoEm: Date;
}): ScreenAccess {
  return {
    id: row.id,
    usuarioId: row.usuarioId,
    empresaId: row.empresaId,
    sistemaId: row.sistemaId,
    moduloId: row.moduloId,
    menuId: row.menuId,
    submenuId: row.submenuId,
    tipo: userTypeOf(row.tipoId),
    status: statusOf(row.statusId),
    criadoEm: row.criadoEm,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new AccessConflictError();
    if (error.code === 'P2025') throw new AccessNotFoundError();
    if (error.code === 'P2003') throw new DeleteRestrictedError();
  }
  throw error;
}

function whereOf(filter: ScreenViewFilter = {}): Prisma.AcessoWhereInput {
  const q = filter.q?.trim();
  return {
    usuarioId: filter.usuarioId,
    empresaId: filter.empresaId,
    sistemaId: filter.sistemaId,
    moduloId: filter.moduloId,
    menuId: filter.menuId,
    submenuId: filter.submenuId,
    ...(q ? {
      OR: [
        { empresa: { razaoSocial: { contains: q } } },
        { sistema: { nome: { contains: q } } },
        { modulo: { nome: { contains: q } } },
        { menu: { nome: { contains: q } } },
        { submenu: { nome: { contains: q } } },
      ],
    } : {}),
  };
}

const viewInclude = {
  empresa: true,
  sistema: true,
  modulo: true,
  menu: true,
  submenu: true,
} satisfies Prisma.AcessoInclude;

type AccessViewRow = Prisma.AcessoGetPayload<{ include: typeof viewInclude }>;

function toView(row: AccessViewRow): ScreenAccessView {
  return {
    ...toAccess(row),
    empresa: row.empresa.razaoSocial,
    sistema: row.sistema.nome,
    modulo: row.modulo.nome,
    menu: row.menu.nome,
    submenu: row.submenu.nome,
  };
}

export class PrismaAccessRepository implements AccessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(access: NewScreenAccess): Promise<ScreenAccess> {
    try {
      const row = await this.prisma.acesso.create({
        data: {
          usuarioId: access.usuarioId,
          empresaId: access.empresaId,
          sistemaId: access.sistemaId,
          moduloId: access.moduloId,
          menuId: access.menuId,
          submenuId: access.submenuId,
          tipoId: userTypeIdOf(access.tipo),
          statusId: statusIdOf(access.status),
        },
      });
      return toAccess(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async replace(usuarioId: number, screens: ScreenDraft[]): Promise<ScreenAccess[]> {
    try {
      const rows = await this.prisma.$transaction(async (tx) => {
        await tx.acesso.deleteMany({ where: { usuarioId } });
        if (screens.length === 0) return [];
        await tx.acesso.createMany({
          data: screens.map((screen) => ({
            usuarioId,
            empresaId: screen.empresaId,
            sistemaId: screen.sistemaId,
            moduloId: screen.moduloId,
            menuId: screen.menuId,
            submenuId: screen.submenuId,
            tipoId: userTypeIdOf(screen.tipo),
            statusId: statusIdOf(screen.status),
          })),
        });
        return tx.acesso.findMany({ where: { usuarioId } });
      });
      return rows.map(toAccess);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(filter: ScreenListFilter = {}): Promise<ScreenAccess[]> {
    const rows = await this.prisma.acesso.findMany({ where: whereOf(filter) });
    return rows.map(toAccess);
  }

  async listViews(filter: ScreenViewFilter = {}): Promise<ScreenAccessView[]> {
    const rows = await this.prisma.acesso.findMany({
      where: whereOf(filter),
      include: viewInclude,
      orderBy: { id: 'asc' },
    });
    return rows.map(toView);
  }

  async pageViews(query: ScreenPageQuery): Promise<{ rows: ScreenAccessView[]; total: number }> {
    const where = whereOf(query);
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.acesso.count({ where }),
      this.prisma.acesso.findMany({
        where,
        include: viewInclude,
        orderBy: { id: 'asc' },
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toView), total };
  }

  async findById(id: number): Promise<ScreenAccess | null> {
    const row = await this.prisma.acesso.findUnique({ where: { id } });
    return row ? toAccess(row) : null;
  }

  async save(access: ScreenAccess): Promise<ScreenAccess> {
    try {
      const row = await this.prisma.acesso.update({
        where: { id: access.id },
        data: { statusId: statusIdOf(access.status), tipoId: userTypeIdOf(access.tipo) },
      });
      return toAccess(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.acesso.delete({ where: { id } });
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaAccessRepository(prisma: PrismaClient): AccessRepository {
  return new PrismaAccessRepository(prisma);
}
