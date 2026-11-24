import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import type { Company } from '../../domain/company.js';
import { CompanyNotFoundError } from '../../domain/company-errors.js';
import type { CompanyRepository } from '../ports/company-repository.js';

export type CompanyDeleteBlockers = {
  accesses?: AccessRepository;
};

export class DeleteCompany {
  constructor(private readonly companies: CompanyRepository, private readonly blockers: CompanyDeleteBlockers = {}) {}

  async execute(id: number): Promise<Company> {
    const company = await this.ensureDeletable(id);
    await this.companies.remove(id);
    return company;
  }

  async ensureDeletable(id: number): Promise<Company> {
    const company = await this.companies.findById(id);
    if (!company) throw new CompanyNotFoundError();
    if ((await this.blockers.accesses?.list({ empresaId: id }))?.length) throw new DeleteRestrictedError();
    return company;
  }
}
