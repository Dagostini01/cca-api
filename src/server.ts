import { buildApp } from './app.js';
import { createPrismaCompanyRepository } from './modules/companies/adapters/outbound/prisma-company-repository.js';
import { createPrismaSystemRepository } from './modules/systems/adapters/outbound/prisma-system-repository.js';
import { createPrismaModuleRepository } from './modules/system-modules/adapters/outbound/prisma-module-repository.js';
import { createPrismaMenuRepository } from './modules/menus/adapters/outbound/prisma-menu-repository.js';
import { createPrismaSubmenuRepository } from './modules/submenus/adapters/outbound/prisma-submenu-repository.js';
import { createPrismaUserRepository } from './modules/users/adapters/outbound/prisma-user-repository.js';
import { createKeycloakUserDirectory } from './modules/users/adapters/outbound/keycloak-user-directory.js';
import { createPrismaProfileRepository } from './modules/profiles/adapters/outbound/prisma-profile-repository.js';
import { createPrismaPermissionRepository } from './modules/permissions/adapters/outbound/prisma-permission-repository.js';
import { createPrismaAccessRepository } from './modules/accesses/adapters/outbound/prisma-access-repository.js';
import { createWalkingChainResourceLookup } from './modules/permissions/application/services/walking-chain-resource-lookup.js';
import { createAuthorizer } from './modules/authorization/application/services/authorize-access.js';
import { createPrismaAuditRepository } from './modules/audits/adapters/outbound/prisma-audit-repository.js';
import { createAuditRecorder } from './modules/audits/application/services/record-audit.js';
import { loadDotEnv } from './shared/config/load-dot-env.js';
import { loadEnv } from './shared/config/env.js';
import { createPrismaClient } from './shared/database/prisma-client-factory.js';

loadDotEnv();
const env = loadEnv();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = createPrismaClient(databaseUrl);
const companyRepository = createPrismaCompanyRepository(prisma);
const systemRepository = createPrismaSystemRepository(prisma);
const moduleRepository = createPrismaModuleRepository(prisma);
const menuRepository = createPrismaMenuRepository(prisma);
const submenuRepository = createPrismaSubmenuRepository(prisma);
const userRepository = createPrismaUserRepository(prisma);
const profileRepository = createPrismaProfileRepository(prisma);
const permissionRepository = createPrismaPermissionRepository(prisma);
const accessRepository = createPrismaAccessRepository(prisma);
const auditRepository = createPrismaAuditRepository(prisma);
const chainResourceLookup = createWalkingChainResourceLookup(companyRepository, systemRepository, moduleRepository, menuRepository, submenuRepository);
const app = buildApp(env, {
  companyRepository,
  systemRepository,
  moduleRepository,
  menuRepository,
  submenuRepository,
  userRepository,
  identityDirectory: createProductionIdentityDirectory(env.KEYCLOAK_ISSUER),
  profileRepository,
  permissionRepository,
  chainResourceLookup,
  accessRepository,
  auditRepository,
  auditRecorder: createAuditRecorder({
    audits: auditRepository,
    users: userRepository,
    profiles: profileRepository,
    permissions: permissionRepository,
    accesses: accessRepository,
    systems: systemRepository,
    resources: chainResourceLookup,
  }),
  authorizer: createAuthorizer({
    users: userRepository,
    accesses: accessRepository,
    profiles: profileRepository,
    permissions: permissionRepository,
    systems: systemRepository,
    resources: chainResourceLookup,
  }),
});

function createProductionIdentityDirectory(issuer: string) {
  const baseUrl = process.env.KEYCLOAK_ADMIN_BASE_URL;
  const clientSecret = process.env.KEYCLOAK_PROVISIONER_CLIENT_SECRET;
  const clientId = process.env.KEYCLOAK_PROVISIONER_CLIENT_ID ?? 'cca-provisioner';
  if (!baseUrl || !clientSecret) {
    throw new Error('KEYCLOAK_ADMIN_BASE_URL and KEYCLOAK_PROVISIONER_CLIENT_SECRET are required');
  }
  const realm = new URL(issuer).pathname.split('/').filter(Boolean).at(-1);
  if (!realm) throw new Error('KEYCLOAK_ISSUER must include the realm');
  return createKeycloakUserDirectory({
    baseUrl,
    realm,
    clientId,
    clientSecret,
  });
}

async function shutdown(exitCode: number) {
  try {
    await app.close();
    await prisma.$disconnect();
  } finally {
    process.exit(exitCode);
  }
}

process.once('SIGINT', () => {
  void shutdown(0);
});
process.once('SIGTERM', () => {
  void shutdown(0);
});

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
