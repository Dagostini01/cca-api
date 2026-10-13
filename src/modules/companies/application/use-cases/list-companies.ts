import type { Company } from '../../domain/company.js';
import type { CompanyRepository } from '../ports/company-repository.js';

export class ListCompanies {
  constructor(private readonly companies: CompanyRepository) {}

  async execute(): Promise<Company[]> {
    const companies = await this.companies.list();
    return [...companies].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));
  }
}
