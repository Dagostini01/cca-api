import type { Page } from '../../../../shared/http/page.js';
import type { Company } from '../../domain/company.js';
import type { CompanyListFilter, CompanyPageQuery, CompanyRepository } from '../ports/company-repository.js';

export class ListCompanies {
  constructor(private readonly companies: CompanyRepository) {}

  async execute(filter: CompanyListFilter = {}): Promise<Company[]> {
    const companies = await this.companies.list(filter);
    return [...companies].sort((left, right) => left.razaoSocial.localeCompare(right.razaoSocial, 'pt-BR') || left.id - right.id);
  }

  async page(query: CompanyPageQuery): Promise<Page<Company>> {
    const { rows, total } = await this.companies.page(query);
    return { itens: rows, total, pagina: query.pagina, tamanho: query.tamanho };
  }
}
