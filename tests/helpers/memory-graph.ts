import type { IdentityDirectory } from '../../src/modules/users/application/ports/identity-directory.js';
import { createUserServices, type UserServices } from '../../src/modules/users/application/factories/user-services-factory.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { createInMemoryUserRegistrar } from '../users/in-memory-user-registrar.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

export function createMemoryGraph() {
  const companies = new InMemoryCompanyRepository();
  const systems = new InMemorySystemRepository();
  const modules = new InMemoryModuleRepository();
  const menus = new InMemoryMenuRepository();
  const submenus = new InMemorySubmenuRepository();
  const users = new InMemoryUserRepository();
  const accesses = new InMemoryAccessRepository({
    companyName: async (id) => (await companies.findById(id))?.razaoSocial ?? null,
    systemName: async (id) => (await systems.findById(id))?.nome ?? null,
    moduleName: async (id) => (await modules.findById(id))?.nome ?? null,
    menuName: async (id) => (await menus.findById(id))?.nome ?? null,
    submenuName: async (id) => (await submenus.findById(id))?.nome ?? null,
  });
  return {
    companies,
    systems,
    modules,
    menus,
    submenus,
    users,
    accesses,
    chain: { companies, systems, modules, menus, submenus },
  };
}

export type MemoryGraph = ReturnType<typeof createMemoryGraph>;

export function createMemoryUserServices(graph: MemoryGraph = createMemoryGraph(), directory?: IdentityDirectory): UserServices {
  return createUserServices({
    users: graph.users,
    accesses: graph.accesses,
    registrar: createInMemoryUserRegistrar(graph.users, graph.accesses),
    chain: graph.chain,
    systems: graph.systems,
    modules: graph.modules,
    menus: graph.menus,
    submenus: graph.submenus,
    directory,
  });
}
