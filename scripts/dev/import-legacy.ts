import { readFileSync } from 'node:fs';
import { createPrismaAccessRepository } from '../../src/modules/accesses/adapters/outbound/prisma-access-repository.js';
import { createPrismaCompanyRepository } from '../../src/modules/companies/adapters/outbound/prisma-company-repository.js';
import { readLegacyDump } from '../../src/modules/legacy-import/adapters/outbound/read-legacy-dump.js';
import { ImportLegacyCatalog } from '../../src/modules/legacy-import/application/use-cases/import-legacy-catalog.js';
import { createPrismaMenuRepository } from '../../src/modules/menus/adapters/outbound/prisma-menu-repository.js';
import { createPrismaModuleRepository } from '../../src/modules/system-modules/adapters/outbound/prisma-module-repository.js';
import { createPrismaSubmenuRepository } from '../../src/modules/submenus/adapters/outbound/prisma-submenu-repository.js';
import { createPrismaSystemRepository } from '../../src/modules/systems/adapters/outbound/prisma-system-repository.js';
import { createPrismaUserRepository } from '../../src/modules/users/adapters/outbound/prisma-user-repository.js';
import { loadDotEnv } from '../../src/shared/config/load-dot-env.js';
import { createPrismaClient } from '../../src/shared/database/prisma-client-factory.js';

loadDotEnv();
const file = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;
if (!file || !databaseUrl) {
  console.error('Use: npm run import:legacy -- caminho.sql');
  process.exit(1);
}

const catalog = readLegacyDump(readFileSync(file, 'utf8'));
const prisma = createPrismaClient(databaseUrl);
try {
  const report = await new ImportLegacyCatalog({
    companies: createPrismaCompanyRepository(prisma),
    systems: createPrismaSystemRepository(prisma),
    modules: createPrismaModuleRepository(prisma),
    menus: createPrismaMenuRepository(prisma),
    submenus: createPrismaSubmenuRepository(prisma),
    users: createPrismaUserRepository(prisma),
    accesses: createPrismaAccessRepository(prisma),
  }).execute(catalog);
  console.log(JSON.stringify(report));
} finally {
  await prisma.$disconnect();
}
