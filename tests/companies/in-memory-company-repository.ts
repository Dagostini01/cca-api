import { randomUUID } from 'node:crypto';
import type { CompanyRepository, NewCompany } from '../../src/modules/companies/application/ports/company-repository.js';
import type { Company } from '../../src/modules/companies/domain/company.js';
import { CompanyDocumentConflictError } from '../../src/modules/companies/domain/company-errors.js';

function clone(company: Company): Company {
  return {
    ...company,
    criadoEm: new Date(company.criadoEm),
    atualizadoEm: new Date(company.atualizadoEm),
  };
}

export class InMemoryCompanyRepository implements CompanyRepository {
  private readonly companies = new Map<string, Company>();

  async add(company: NewCompany): Promise<Company> {
    this.assertDocumentAvailable(company.cnpj, null);
    const now = new Date();
    const stored: Company = { id: randomUUID(), ...company, criadoEm: now, atualizadoEm: now };
    this.companies.set(stored.id, stored);
    return clone(stored);
  }

  async list(): Promise<Company[]> {
    return [...this.companies.values()].map(clone);
  }

  async findById(id: string): Promise<Company | null> {
    const company = this.companies.get(id);
    return company ? clone(company) : null;
  }

  async save(company: Company): Promise<Company> {
    if (!this.companies.has(company.id)) throw new Error('company missing from memory');
    this.assertDocumentAvailable(company.cnpj, company.id);
    const stored: Company = { ...company, atualizadoEm: new Date() };
    this.companies.set(company.id, stored);
    return clone(stored);
  }

  private assertDocumentAvailable(cnpj: string | null, ignoreId: string | null) {
    if (cnpj == null) return;
    for (const company of this.companies.values()) {
      if (company.cnpj === cnpj && company.id !== ignoreId) throw new CompanyDocumentConflictError();
    }
  }
}
