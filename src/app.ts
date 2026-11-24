import cors from '@fastify/cors';
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
import type { IdentityDirectory } from './modules/users/application/ports/identity-directory.js';
import type { UserRegistrar } from './modules/users/application/ports/user-registrar.js';
import type { UserRepository } from './modules/users/application/ports/user-repository.js';
import { createUserServices } from './modules/users/application/factories/user-services-factory.js';
import { registerUserRoutes } from './modules/users/adapters/inbound/http/user-routes.js';
import type { AccessRepository } from './modules/accesses/application/ports/access-repository.js';
import { createAccessServices } from './modules/accesses/application/factories/access-services-factory.js';
import { registerAccessRoutes } from './modules/accesses/adapters/inbound/http/access-routes.js';
import type { Authorizer } from './modules/authorization/application/ports/authorizer.js';
import type { AuditRecorder } from './modules/audits/application/ports/audit-recorder.js';
import type { AuditRepository } from './modules/audits/application/ports/audit-repository.js';
import { createAuditServices } from './modules/audits/application/factories/audit-services-factory.js';
import { registerAuditRoutes } from './modules/audits/adapters/inbound/http/audit-routes.js';
import { registerLegacyImportRoutes } from './modules/legacy-import/adapters/inbound/http/legacy-import-routes.js';

export type BuildAppOptions = {
  tokenVerifier?: TokenVerifier;
  companyRepository?: CompanyRepository;
  systemRepository?: SystemRepository;
  moduleRepository?: ModuleRepository;
  menuRepository?: MenuRepository;
  submenuRepository?: SubmenuRepository;
  userRepository?: UserRepository;
  userRegistrar?: UserRegistrar;
  identityDirectory?: IdentityDirectory;
  accessRepository?: AccessRepository;
  authorizer?: Authorizer;
  auditRepository?: AuditRepository;
  auditRecorder?: AuditRecorder;
  logger?: boolean;
};

export function buildApp(env: Env, options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  void app.register(cors, {
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
  });
  const verifier = options.tokenVerifier ?? createKeycloakTokenVerifier(env);
  const getCurrentUser = createGetCurrentUser(verifier);
  registerErrorHandler(app);
  app.get('/health', async () => ({ status: 'ok', service: 'cca-api' }));
  registerIdentityRoutes(app, getCurrentUser);
  const authorizer = options.authorizer;
  const audits = options.auditRecorder;
  if (options.companyRepository) {
    registerCompanyRoutes(app, createCompanyServices(options.companyRepository, {
      accesses: options.accessRepository,
    }), getCurrentUser, authorizer, audits);
  }
  if (options.systemRepository) {
    registerSystemRoutes(app, createSystemServices(options.systemRepository, {
      modules: options.moduleRepository,
      accesses: options.accessRepository,
    }, options.companyRepository), getCurrentUser, authorizer, audits);
  }
  if (options.systemRepository && options.moduleRepository) {
    registerModuleRoutes(app, createModuleServices(options.moduleRepository, options.systemRepository, {
      menus: options.menuRepository,
      accesses: options.accessRepository,
    }), getCurrentUser, authorizer, audits);
  }
  if (options.moduleRepository && options.menuRepository) {
    registerMenuRoutes(app, createMenuServices(options.menuRepository, options.moduleRepository, {
      submenus: options.submenuRepository,
      accesses: options.accessRepository,
    }), getCurrentUser, authorizer, audits);
  }
  if (options.menuRepository && options.submenuRepository) {
    registerSubmenuRoutes(app, createSubmenuServices(options.submenuRepository, options.menuRepository, {
      accesses: options.accessRepository,
    }), getCurrentUser, authorizer, audits);
  }
  if (
    options.userRepository
    && options.userRegistrar
    && options.accessRepository
    && options.companyRepository
    && options.systemRepository
    && options.moduleRepository
    && options.menuRepository
    && options.submenuRepository
  ) {
    registerUserRoutes(app, createUserServices({
      users: options.userRepository,
      accesses: options.accessRepository,
      registrar: options.userRegistrar,
      chain: {
        companies: options.companyRepository,
        systems: options.systemRepository,
        modules: options.moduleRepository,
        menus: options.menuRepository,
        submenus: options.submenuRepository,
      },
      systems: options.systemRepository,
      modules: options.moduleRepository,
      menus: options.menuRepository,
      submenus: options.submenuRepository,
      directory: options.identityDirectory,
      blockers: {
        accesses: options.accessRepository,
        audits: options.auditRepository,
      },
    }), getCurrentUser, authorizer, audits);
  }
  if (
    options.userRepository
    && options.accessRepository
    && options.companyRepository
    && options.systemRepository
    && options.moduleRepository
    && options.menuRepository
    && options.submenuRepository
  ) {
    registerAccessRoutes(
      app,
      createAccessServices(options.accessRepository, options.userRepository, {
        companies: options.companyRepository,
        systems: options.systemRepository,
        modules: options.moduleRepository,
        menus: options.menuRepository,
        submenus: options.submenuRepository,
      }),
      options.userRepository,
      getCurrentUser,
      authorizer,
      audits,
    );
  }
  if (options.auditRepository) {
    registerAuditRoutes(app, createAuditServices(options.auditRepository), getCurrentUser, authorizer);
  }
  if (
    options.companyRepository
    && options.systemRepository
    && options.moduleRepository
    && options.menuRepository
    && options.submenuRepository
  ) {
    registerLegacyImportRoutes(app, {
      companies: options.companyRepository,
      systems: options.systemRepository,
      modules: options.moduleRepository,
      menus: options.menuRepository,
      submenus: options.submenuRepository,
      users: options.userRepository,
      accesses: options.accessRepository,
      directory: options.identityDirectory,
    }, getCurrentUser, authorizer, audits);
  }
  registerApiReference(app);
  return app;
}
