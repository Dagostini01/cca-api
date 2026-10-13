import { Prisma, PrismaClient } from '@prisma/client';
import type { CompanyRepository, NewCompany } from '../../application/ports/company-repository.js';
import type { Company } from '../../domain/company.js';
import { CompanyDocumentConflictError, CompanyNotFoundError } from '../../domain/company-errors.js';

function toCompany(row: {
  id: string;
  nome: string;
  cnpj: string | null;
  status: Company['status'];
  criadoEm: Date;
  atualizadoEm: Date;
}): Company {
  return {
    id: row.id,
    nome: row.nome,
    cnpj: row.cnpj,
    status: row.status,
    criadoEm: row.criadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new CompanyDocumentConflictError();
    if (error.code === 'P2025') throw new CompanyNotFoundError();
  }
  throw error;
}

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(company: NewCompany): Promise<Company> {
    try {
      const row = await this.prisma.empresa.create({ data: company });
      return toCompany(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }

  async list(): Promise<Company[]> {
    const rows = await this.prisma.empresa.findMany();
    return rows.map(toCompany);
  }

  async findById(id: string): Promise<Company | null> {
    const row = await this.prisma.empresa.findUnique({ where: { id } });
    return row ? toCompany(row) : null;
  }

  async save(company: Company): Promise<Company> {
    try {
      const row = await this.prisma.empresa.update({
        where: { id: company.id },
        data: { nome: company.nome, cnpj: company.cnpj, status: company.status },
      });
      return toCompany(row);
    } catch (error) {
      mapPersistenceError(error);
    }
  }
}

export function createPrismaCompanyRepository(prisma: PrismaClient): CompanyRepository {
  return new PrismaCompanyRepository(prisma);
}
