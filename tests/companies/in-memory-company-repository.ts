import type { CompanyListFilter, CompanyPageQuery, CompanyRepository, NewCompany } from '../../src/modules/companies/application/ports/company-repository.js';
import type { Company } from '../../src/modules/companies/domain/company.js';
import { CompanyDocumentConflictError, CompanyNotFoundError } from '../../src/modules/companies/domain/company-errors.js';
import { slicePage, textIncludes } from '../../src/shared/http/page.js';

function clone(company: Company): Company {
  return {
    ...company,
    dataConstituicao: company.dataConstituicao ? new Date(company.dataConstituicao) : null,
    criadoEm: new Date(company.criadoEm),
  };
}

export class InMemoryCompanyRepository implements CompanyRepository {
  private readonly companies = new Map<number, Company>();
  private nextId = 1;

  async add(company: NewCompany): Promise<Company> {
    this.assertDocumentAvailable(company.cnpj, null);
    const stored: Company = { id: this.nextId++, ...company, criadoEm: new Date() };
    this.companies.set(stored.id, stored);
    return clone(stored);
  }

  async list(filter: CompanyListFilter = {}): Promise<Company[]> {
    const q = filter.q?.trim() ?? '';
    const digits = q.replace(/\D/g, '');
    return [...this.companies.values()].filter((company) => {
      if (!q) return true;
      return textIncludes(company.razaoSocial, q)
        || textIncludes(company.nomeFantasia, q)
        || textIncludes(company.nomeReduzido, q)
        || (digits.length > 0 && (company.cnpj ?? '').includes(digits));
    }).map(clone);
  }

  async page(query: CompanyPageQuery) {
    const rows = (await this.list(query)).sort((left, right) => left.razaoSocial.localeCompare(right.razaoSocial, 'pt-BR') || left.id - right.id);
    return slicePage(rows, query.pagina, query.tamanho);
  }

  async findById(id: number): Promise<Company | null> {
    const company = this.companies.get(id);
    return company ? clone(company) : null;
  }

  async save(company: Company): Promise<Company> {
    if (!this.companies.has(company.id)) throw new Error('company missing from memory');
    this.assertDocumentAvailable(company.cnpj, company.id);
    this.companies.set(company.id, company);
    return clone(company);
  }

  async remove(id: number): Promise<void> {
    if (!this.companies.delete(id)) throw new CompanyNotFoundError();
  }

  private assertDocumentAvailable(cnpj: string | null, ignoreId: number | null) {
    if (cnpj == null) return;
    for (const company of this.companies.values()) {
      if (company.cnpj === cnpj && company.id !== ignoreId) throw new CompanyDocumentConflictError();
    }
  }
}
