import { normalizeCnpj, normalizeCompanyAlias, normalizeCompanyName, type Company, type CompanyStatus } from '../../domain/company.js';
import type { CompanyRepository } from '../ports/company-repository.js';

export type CreateCompanyInput = {
  razaoSocial: string;
  nomeFantasia?: string | null;
  nomeReduzido?: string | null;
  cnpj?: string | null;
  dataConstituicao?: Date | null;
  status?: CompanyStatus;
};

export class CreateCompany {
  constructor(private readonly companies: CompanyRepository) {}

  async execute(input: CreateCompanyInput): Promise<Company> {
    return this.companies.add({
      razaoSocial: normalizeCompanyName(input.razaoSocial),
      nomeFantasia: normalizeCompanyAlias(input.nomeFantasia),
      nomeReduzido: normalizeCompanyAlias(input.nomeReduzido),
      cnpj: normalizeCnpj(input.cnpj),
      dataConstituicao: input.dataConstituicao ?? null,
      status: input.status ?? 'ATIVADO',
    });
  }
}
