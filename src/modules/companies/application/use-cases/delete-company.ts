import type { Company } from '../../domain/company.js';
import { CompanyNotFoundError } from '../../domain/company-errors.js';
import type { CompanyRepository } from '../ports/company-repository.js';
import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import type { ProfileRepository } from '../../../profiles/application/ports/profile-repository.js';
import type { SystemRepository } from '../../../systems/application/ports/system-repository.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import { DeleteRestrictedError } from '../../../../shared/errors/delete-restricted-error.js';
import { hasPermissionOn } from '../../../permissions/application/services/has-permission-on.js';

export type CompanyDeleteBlockers = {
  systems?: SystemRepository;
  users?: UserRepository;
  profiles?: ProfileRepository;
  permissions?: PermissionRepository;
};

export class DeleteCompany {
  constructor(private readonly companies: CompanyRepository, private readonly blockers: CompanyDeleteBlockers = {}) {}

  async execute(id: string): Promise<Company> {
    const company = await this.ensureDeletable(id);
    await this.companies.remove(id);
    return company;
  }

  async ensureDeletable(id: string): Promise<Company> {
    const company = await this.companies.findById(id);
    if (!company) throw new CompanyNotFoundError();
    if (await this.blocked(id)) throw new DeleteRestrictedError();
    return company;
  }

  private async blocked(id: string): Promise<boolean> {
    if ((await this.blockers.systems?.list(id))?.length) return true;
    if ((await this.blockers.users?.list(id))?.length) return true;
    if ((await this.blockers.profiles?.list(id))?.length) return true;
    return this.blockers.permissions ? hasPermissionOn(this.blockers.permissions, 'EMPRESA', id) : false;
  }
}
