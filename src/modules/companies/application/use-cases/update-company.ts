import { normalizeCnpj, normalizeCompanyName, type Company, type CompanyStatus } from '../../domain/company.js';
import { CompanyNotFoundError, EmptyCompanyUpdateError } from '../../domain/company-errors.js';
import type { CompanyRepository } from '../ports/company-repository.js';

export type UpdateCompanyInput = {
  nome?: string;
  cnpj?: string | null;
  status?: CompanyStatus;
};

export class UpdateCompany {
  constructor(private readonly companies: CompanyRepository) {}

  async execute(id: string, input: UpdateCompanyInput): Promise<Company> {
    if (input.nome === undefined && input.cnpj === undefined && input.status === undefined) {
      throw new EmptyCompanyUpdateError();
    }
    const current = await this.companies.findById(id);
    if (!current) throw new CompanyNotFoundError();
    return this.companies.save({
      ...current,
      nome: input.nome === undefined ? current.nome : normalizeCompanyName(input.nome),
      cnpj: input.cnpj === undefined ? current.cnpj : normalizeCnpj(input.cnpj),
      status: input.status ?? current.status,
    });
  }
}
