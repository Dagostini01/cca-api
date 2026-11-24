import { normalizeCnpj, normalizeCompanyAlias, normalizeCompanyName, type Company, type CompanyStatus } from '../../domain/company.js';
import { CompanyNotFoundError, EmptyCompanyUpdateError } from '../../domain/company-errors.js';
import type { CompanyRepository } from '../ports/company-repository.js';

export type UpdateCompanyInput = {
  razaoSocial?: string;
  nomeFantasia?: string | null;
  nomeReduzido?: string | null;
  cnpj?: string | null;
  dataConstituicao?: Date | null;
  status?: CompanyStatus;
};

export class UpdateCompany {
  constructor(private readonly companies: CompanyRepository) {}

  async execute(id: number, input: UpdateCompanyInput): Promise<Company> {
    if (
      input.razaoSocial === undefined
      && input.nomeFantasia === undefined
      && input.nomeReduzido === undefined
      && input.cnpj === undefined
      && input.dataConstituicao === undefined
      && input.status === undefined
    ) {
      throw new EmptyCompanyUpdateError();
    }
    const current = await this.companies.findById(id);
    if (!current) throw new CompanyNotFoundError();
    return this.companies.save({
      ...current,
      razaoSocial: input.razaoSocial === undefined ? current.razaoSocial : normalizeCompanyName(input.razaoSocial),
      nomeFantasia: input.nomeFantasia === undefined ? current.nomeFantasia : normalizeCompanyAlias(input.nomeFantasia),
      nomeReduzido: input.nomeReduzido === undefined ? current.nomeReduzido : normalizeCompanyAlias(input.nomeReduzido),
      cnpj: input.cnpj === undefined ? current.cnpj : normalizeCnpj(input.cnpj),
      dataConstituicao: input.dataConstituicao === undefined ? current.dataConstituicao : input.dataConstituicao,
      status: input.status ?? current.status,
    });
  }
}
