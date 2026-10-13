import Fastify from 'fastify';
import type { Env } from './shared/config/env.js';
import { registerApiReference } from './shared/http/api-reference.js';
import { registerErrorHandler } from './shared/http/error-handler.js';
import type { CompanyRepository } from './modules/companies/application/ports/company-repository.js';
import { createCompanyServices } from './modules/companies/application/factories/company-services-factory.js';
import { registerCompanyRoutes } from './modules/companies/adapters/inbound/http/company-routes.js';
import { createGetCurrentUser, createKeycloakTokenVerifier } from './modules/identity/application/factories/identity-services-factory.js';
import type { TokenVerifier } from './modules/identity/application/ports/token-verifier.js';
import { registerIdentityRoutes } from './modules/identity/adapters/inbound/http/identity-routes.js';
import type { SystemRepository } from './modules/systems/application/ports/system-repository.js';
import { createSystemServices } from './modules/systems/application/factories/system-services-factory.js';
import { registerSystemRoutes } from './modules/systems/adapters/inbound/http/system-routes.js';
import type { ModuleRepository } from './modules/system-modules/application/ports/module-repository.js';
import { createModuleServices } from './modules/system-modules/application/factories/module-services-factory.js';
import { registerModuleRoutes } from './modules/system-modules/adapters/inbound/http/module-routes.js';
import type { MenuRepository } from './modules/menus/application/ports/menu-repository.js';
import { createMenuServices } from './modules/menus/application/factories/menu-services-factory.js';
import { registerMenuRoutes } from './modules/menus/adapters/inbound/http/menu-routes.js';
import type { SubmenuRepository } from './modules/submenus/application/ports/submenu-repository.js';
import { createSubmenuServices } from './modules/submenus/application/factories/submenu-services-factory.js';
import { registerSubmenuRoutes } from './modules/submenus/adapters/inbound/http/submenu-routes.js';
import type { UserRepository } from './modules/users/application/ports/user-repository.js';
import { createUserServices } from './modules/users/application/factories/user-services-factory.js';
import { registerUserRoutes } from './modules/users/adapters/inbound/http/user-routes.js';
import type { ProfileRepository } from './modules/profiles/application/ports/profile-repository.js';
import { createProfileServices } from './modules/profiles/application/factories/profile-services-factory.js';
import { registerProfileRoutes } from './modules/profiles/adapters/inbound/http/profile-routes.js';
import type { PermissionRepository } from './modules/permissions/application/ports/permission-repository.js';
import type { ChainResourceLookup } from './modules/permissions/application/ports/chain-resource-lookup.js';
import { createPermissionServices } from './modules/permissions/application/factories/permission-services-factory.js';
import { registerPermissionRoutes } from './modules/permissions/adapters/inbound/http/permission-routes.js';
import type { AccessRepository } from './modules/accesses/application/ports/access-repository.js';
import { createAccessServices } from './modules/accesses/application/factories/access-services-factory.js';
import { registerAccessRoutes } from './modules/accesses/adapters/inbound/http/access-routes.js';
import type { Authorizer } from './modules/authorization/application/ports/authorizer.js';

export type BuildAppOptions = {
  tokenVerifier?: TokenVerifier;
  companyRepository?: CompanyRepository;
  systemRepository?: SystemRepository;
  moduleRepository?: ModuleRepository;
  menuRepository?: MenuRepository;
  submenuRepository?: SubmenuRepository;
  userRepository?: UserRepository;
  profileRepository?: ProfileRepository;
  permissionRepository?: PermissionRepository;
  chainResourceLookup?: ChainResourceLookup;
  accessRepository?: AccessRepository;
  authorizer?: Authorizer;
  logger?: boolean;
};

export function buildApp(env: Env, options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const verifier = options.tokenVerifier ?? createKeycloakTokenVerifier(env);
  const getCurrentUser = createGetCurrentUser(verifier);
  registerErrorHandler(app);
  app.get('/health', async () => ({ status: 'ok', service: 'cca-api' }));
  registerIdentityRoutes(app, getCurrentUser);
  const authorizer = options.authorizer;
  if (options.companyRepository) {
    registerCompanyRoutes(app, createCompanyServices(options.companyRepository), getCurrentUser, authorizer);
  }
  if (options.companyRepository && options.systemRepository) {
    registerSystemRoutes(app, createSystemServices(options.systemRepository, options.companyRepository), getCurrentUser, authorizer);
  }
  if (options.systemRepository && options.moduleRepository) {
    registerModuleRoutes(app, createModuleServices(options.moduleRepository, options.systemRepository), getCurrentUser, authorizer);
  }
  if (options.moduleRepository && options.menuRepository) {
    registerMenuRoutes(app, createMenuServices(options.menuRepository, options.moduleRepository), getCurrentUser, authorizer);
  }
  if (options.menuRepository && options.submenuRepository) {
    registerSubmenuRoutes(app, createSubmenuServices(options.submenuRepository, options.menuRepository), getCurrentUser, authorizer);
  }
  if (options.companyRepository && options.userRepository) {
    registerUserRoutes(app, createUserServices(options.userRepository, options.companyRepository), getCurrentUser, authorizer);
  }
  if (options.companyRepository && options.profileRepository) {
    registerProfileRoutes(app, createProfileServices(options.profileRepository, options.companyRepository), getCurrentUser, authorizer);
  }
  if (options.profileRepository && options.permissionRepository && options.chainResourceLookup) {
    registerPermissionRoutes(
      app,
      createPermissionServices(options.permissionRepository, options.profileRepository, options.chainResourceLookup),
      getCurrentUser,
      authorizer,
      options.profileRepository,
    );
  }
  if (options.userRepository && options.profileRepository && options.systemRepository && options.accessRepository) {
    registerAccessRoutes(
      app,
      createAccessServices(options.accessRepository, options.userRepository, options.profileRepository, options.systemRepository),
      getCurrentUser,
      authorizer,
      { users: options.userRepository, systems: options.systemRepository },
    );
  }
  registerApiReference(app);
  return app;
}
