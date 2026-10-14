import type { FastifyInstance } from 'fastify';
import type { AccessRepository } from '../../../../accesses/application/ports/access-repository.js';
import type { AuditRecorder } from '../../../../audits/application/ports/audit-recorder.js';
import { authorizeCompanyCreation } from '../../../../authorization/adapters/inbound/http/authorize-request.js';
import type { Authorizer } from '../../../../authorization/application/ports/authorizer.js';
import type { CompanyRepository } from '../../../../companies/application/ports/company-repository.js';
import { requireUser } from '../../../../identity/adapters/inbound/http/require-user.js';
import type { GetCurrentUser } from '../../../../identity/application/use-cases/get-current-user.js';
import type { MenuRepository } from '../../../../menus/application/ports/menu-repository.js';
import type { PermissionRepository } from '../../../../permissions/application/ports/permission-repository.js';
import type { ProfileRepository } from '../../../../profiles/application/ports/profile-repository.js';
import type { ModuleRepository } from '../../../../system-modules/application/ports/module-repository.js';
import type { SubmenuRepository } from '../../../../submenus/application/ports/submenu-repository.js';
import type { SystemRepository } from '../../../../systems/application/ports/system-repository.js';
import type { IdentityDirectory } from '../../../../users/application/ports/identity-directory.js';
import type { UserRepository } from '../../../../users/application/ports/user-repository.js';
import { ImportLegacyCatalog } from '../../../application/use-cases/import-legacy-catalog.js';
import { importLegacyBodySchema } from './legacy-import-schemas.js';

export type LegacyImportRouteDependencies = {
  companies: CompanyRepository;
  systems: SystemRepository;
  modules: ModuleRepository;
  menus: MenuRepository;
  submenus: SubmenuRepository;
  profiles: ProfileRepository;
  users?: UserRepository;
  permissions?: PermissionRepository;
  accesses?: AccessRepository;
  directory?: IdentityDirectory;
};

export function registerLegacyImportRoutes(
  app: FastifyInstance,
  dependencies: LegacyImportRouteDependencies,
  getCurrentUser: GetCurrentUser,
  authorizer?: Authorizer,
  audits?: AuditRecorder,
) {
  const importer = new ImportLegacyCatalog({ ...dependencies, audits });
  app.post('/v1/importacoes/legado', async (request) => {
    const actor = await requireUser(request, getCurrentUser);
    const body = importLegacyBodySchema.parse(request.body);
    await authorizeCompanyCreation(authorizer, actor.id);
    const { vinculos, senhasIgnoradas, ...catalog } = body;
    return importer.execute({ ...catalog, senhasIgnoradas: senhasIgnoradas ?? 0 }, actor.id, vinculos ?? []);
  });
}
