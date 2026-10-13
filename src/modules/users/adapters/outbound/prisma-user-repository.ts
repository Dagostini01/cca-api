import { Prisma, PrismaClient } from '@prisma/client';
import type { NewBusinessUser, UserRepository } from '../../application/ports/user-repository.js';
import type { BusinessUser } from '../../domain/user.js';
import { UserCompanyNotFoundError, UserEmailConflictError, UserNotFoundError, UserSubjectConflictError } from '../../domain/user-errors.js';

function toUser(row: {
  id: string;
  keycloakSub: string;
  nome: string;
  email: string;
  empresaId: string;
  status: BusinessUser['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): BusinessUser {
  return {
    id: row.id,
    keycloakSub: row.keycloakSub,
    nome: row.nome,
    email: row.email,
    empresaId: row.empresaId,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '');
      if (target.includes('email')) throw new UserEmailConflictError();
      throw new UserSubjectConflictError();
    }
    if (error.code === 'P2003') throw new UserCompanyNotFoundError();
    if (error.code === 'P2025') throw new UserNotFoundError();
  }
  throw error;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(user: NewBusinessUser): Promise<BusinessUser> {
    try {
      const row = await this.prisma.usuario.create({ data: user });
      return toUser(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(empresaId?: string): Promise<BusinessUser[]> {
    const rows = await this.prisma.usuario.findMany({ where: empresaId ? { empresaId } : undefined });
    return rows.map(toUser);
  }

  async findById(id: string): Promise<BusinessUser | null> {
    const row = await this.prisma.usuario.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async findBySubject(keycloakSub: string): Promise<BusinessUser | null> {
    const row = await this.prisma.usuario.findUnique({ where: { keycloakSub } });
    return row ? toUser(row) : null;
  }

  async save(user: BusinessUser): Promise<BusinessUser> {
    try {
      const row = await this.prisma.usuario.update({
        where: { id: user.id },
        data: { nome: user.nome, email: user.email, empresaId: user.empresaId, status: user.status },
      });
      return toUser(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return new PrismaUserRepository(prisma);
}
