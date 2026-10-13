import type { Company } from '../../domain/company.js';
import { CompanyNotFoundError } from '../../domain/company-errors.js';
import type { CompanyRepository } from '../ports/company-repository.js';

export class GetCompany {
  constructor(private readonly companies: CompanyRepository) {}

  async execute(id: string): Promise<Company> {
    const company = await this.companies.findById(id);
    if (!company) throw new CompanyNotFoundError();
    return company;
  }
}
