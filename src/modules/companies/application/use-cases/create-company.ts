import { normalizeCnpj, normalizeCompanyName, type Company, type CompanyStatus } from '../../domain/company.js';
import type { CompanyRepository } from '../ports/company-repository.js';

export type CreateCompanyInput = {
  nome: string;
  cnpj?: string | null;
  status?: CompanyStatus;
};

export class CreateCompany {
  constructor(private readonly companies: CompanyRepository) {}

  async execute(input: CreateCompanyInput): Promise<Company> {
    return this.companies.add({
      nome: normalizeCompanyName(input.nome),
      cnpj: normalizeCnpj(input.cnpj),
      status: input.status ?? 'ATIVO',
    });
  }
}
