import { Prisma, PrismaClient } from '@prisma/client';
import { statusIdOf, statusOf, userTypeIdOf, userTypeOf } from '../../../../shared/catalog/status.js';
import { trimChar } from '../../../../shared/catalog/text.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { NewBusinessUser, UserPageQuery, UserRepository } from '../../application/ports/user-repository.js';
import type { BusinessUser } from '../../domain/user.js';
import { UserEmailConflictError, UserNotFoundError, UserSubjectConflictError } from '../../domain/user-errors.js';
import type { UserType } from '../../../../shared/catalog/status.js';

export function toUser(row: {
  id: number;
  keycloakSub: string | null;
  nome: string;
  sobrenome: string | null;
  apelido: string | null;
  rg: string | null;
  cpf: string | null;
  email: string | null;
  celular: string | null;
  tipoId: number | null;
  statusId: number | null;
  criadoPorId: number | null;
  criadoEm: Date;
}): BusinessUser {
  return {
    id: row.id,
    keycloakSub: trimChar(row.keycloakSub),
    nome: row.nome,
    sobrenome: row.sobrenome,
    apelido: row.apelido,
    rg: trimChar(row.rg),
    cpf: trimChar(row.cpf),
    email: row.email,
    celular: row.celular,
    tipo: userTypeOf(row.tipoId),
    status: statusOf(row.statusId),
    criadoPorId: row.criadoPorId,
    criadoEm: row.criadoEm,
  };
}

export function userWriteData(user: {
  keycloakSub: string | null;
  nome: string;
  sobrenome: string | null;
  apelido: string | null;
  rg: string | null;
  cpf: string | null;
  email: string | null;
  celular: string | null;
  tipo: UserType;
  status: BusinessUser['status'];
  criadoPorId: number | null;
}) {
  return {
    keycloakSub: user.keycloakSub,
    nome: user.nome,
    sobrenome: user.sobrenome,
    apelido: user.apelido,
    rg: user.rg,
    cpf: user.cpf,
    email: user.email,
    celular: user.celular,
    tipoId: userTypeIdOf(user.tipo),
    statusId: statusIdOf(user.status),
    criadoPorId: user.criadoPorId,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '').toLowerCase();
      if (target.includes('email')) throw new UserEmailConflictError();
      throw new UserSubjectConflictError();
    }
    if (error.code === 'P2025') throw new UserNotFoundError();
    if (error.code === 'P2003') throw new DeleteRestrictedError();
  }
  throw error;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(user: NewBusinessUser): Promise<BusinessUser> {
    try {
      const row = await this.prisma.usuario.create({ data: userWriteData(user) });
      return toUser(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async listByCreator(criadoPorId: number): Promise<BusinessUser[]> {
    const rows = await this.prisma.usuario.findMany({ where: { criadoPorId } });
    return rows.map(toUser);
  }

  async pageByCreator(criadoPorId: number, query: UserPageQuery): Promise<{ rows: BusinessUser[]; total: number }> {
    const q = query.q?.trim();
    const where: Prisma.UsuarioWhereInput = {
      criadoPorId,
      ...(query.tipo ? { tipoId: userTypeIdOf(query.tipo) } : {}),
      ...(query.status ? { statusId: statusIdOf(query.status) } : {}),
      ...(q ? { OR: [{ nome: { contains: q } }, { email: { contains: q } }] } : {}),
    };
    const skip = (query.pagina - 1) * query.tamanho;
    const [total, rows] = await Promise.all([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip,
        take: query.tamanho,
      }),
    ]);
    return { rows: rows.map(toUser), total };
  }

  async countByType(tipo: UserType): Promise<number> {
    return this.prisma.usuario.count({ where: { tipoId: userTypeIdOf(tipo) } });
  }

  async findById(id: number): Promise<BusinessUser | null> {
    const row = await this.prisma.usuario.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async findBySubject(keycloakSub: string): Promise<BusinessUser | null> {
    const row = await this.prisma.usuario.findUnique({ where: { keycloakSub } });
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<BusinessUser | null> {
    const row = await this.prisma.usuario.findUnique({ where: { email } });
    return row ? toUser(row) : null;
  }

  async save(user: BusinessUser): Promise<BusinessUser> {
    try {
      const row = await this.prisma.usuario.update({
        where: { id: user.id },
        data: userWriteData(user),
      });
      return toUser(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.usuario.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new DeleteRestrictedError();
      mapPersistenceError(error);
    }
  }
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return new PrismaUserRepository(prisma);
}
