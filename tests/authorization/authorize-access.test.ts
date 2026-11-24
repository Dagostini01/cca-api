import { describe, expect, it } from 'vitest';
import { createAccessServices } from '../../src/modules/accesses/application/factories/access-services-factory.js';
import { createAuthorizer } from '../../src/modules/authorization/application/services/authorize-access.js';
import { ForbiddenError } from '../../src/modules/authorization/domain/forbidden-error.js';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createMenuServices } from '../../src/modules/menus/application/factories/menu-services-factory.js';
import { createModuleServices } from '../../src/modules/system-modules/application/factories/module-services-factory.js';
import { createSubmenuServices } from '../../src/modules/submenus/application/factories/submenu-services-factory.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { UserNotFoundError } from '../../src/modules/users/domain/user-errors.js';
import { createMemoryGraph, createMemoryUserServices } from '../helpers/memory-graph.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('authorize access', () => {
  function world() {
    const graph = createMemoryGraph();
    return {
      graph,
      companies: createCompanyServices(graph.companies),
      systems: createSystemServices(graph.systems),
      modules: createModuleServices(graph.modules, graph.systems),
      menus: createMenuServices(graph.menus, graph.modules),
      submenus: createSubmenuServices(graph.submenus, graph.menus),
      users: createMemoryUserServices(graph),
      accesses: createAccessServices(graph.accesses, graph.users, graph.chain),
      authorizer: createAuthorizer({ users: graph.users, accesses: graph.accesses }),
    };
  }

  it('lets any valid token operate the catalog while no administrator exists', async () => {
    const { authorizer } = world();
    await expect(authorizer.assertCatalog(subject)).resolves.toBeUndefined();
    await expect(authorizer.assertCatalog(otherSubject)).resolves.toBeUndefined();
  });

  it('requires an active administrator after the first one exists', async () => {
    const { users, authorizer } = world();
    await users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
      tipo: 'ADMINITRADOR',
    }, subject);
    await expect(authorizer.assertCatalog(subject)).resolves.toBeUndefined();
    await expect(authorizer.assertCatalog(otherSubject)).rejects.toBeInstanceOf(ForbiddenError);

    const supervisor = await users.createUser.execute({
      nome: 'Bruno',
      email: 'bruno@exemplo.com',
      keycloakSub: otherSubject,
      tipo: 'SUPERVISOR',
    }, subject);
    await expect(authorizer.assertCatalog(otherSubject)).rejects.toBeInstanceOf(ForbiddenError);
    await users.updateUser.execute(supervisor.id, { tipo: 'ADMINITRADOR', status: 'DESATIVADO' });
    await expect(authorizer.assertCatalog(otherSubject)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('lets the creating administrator manage that user, and any administrator manage an unowned user', async () => {
    const { users, authorizer } = world();
    const admin = await users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
    }, subject);
    const child = await users.createUser.execute({
      nome: 'Bruno',
      email: 'bruno@exemplo.com',
      keycloakSub: otherSubject,
      tipo: 'SUPERVISOR',
    }, subject);
    const outsider = 'cccccccc-dddd-4eee-8fff-000000000000';
    await users.createUser.execute({
      nome: 'Carla',
      email: 'carla@exemplo.com',
      keycloakSub: outsider,
    }, subject);

    await expect(authorizer.assertCanManageUser(subject, child.id)).resolves.toBeUndefined();
    await expect(authorizer.assertCanManageUser(outsider, child.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(authorizer.assertCanManageUser(outsider, admin.id)).resolves.toBeUndefined();
    await expect(authorizer.assertCanManageUser(subject, 999)).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('opens a screen only when the user has an active row for that submenu', async () => {
    const services = world();
    const company = await services.companies.createCompany.execute({ razaoSocial: 'Alfa' });
    const system = await services.systems.createSystem.execute({ nome: 'Escala', empresaIds: [company.id] });
    const module = await services.modules.createModule.execute({ nome: 'Cadastro', sistemaId: system.id });
    const menu = await services.menus.createMenu.execute({ nome: 'Pessoas', moduloId: module.id });
    const submenu = await services.submenus.createSubmenu.execute({ nome: 'Novo', menuId: menu.id });
    const user = await services.users.createUser.execute({
      nome: 'Bruno',
      email: 'bruno@exemplo.com',
      keycloakSub: otherSubject,
      tipo: 'SUPERVISOR',
    }, otherSubject);
    const access = await services.accesses.createAccess.execute({
      usuarioId: user.id,
      empresaId: company.id,
      sistemaId: system.id,
      moduloId: module.id,
      menuId: menu.id,
      submenuId: submenu.id,
    });

    await expect(services.authorizer.assertScreen(otherSubject, submenu.id)).resolves.toBeUndefined();
    await expect(services.authorizer.assertScreen(subject, submenu.id)).rejects.toBeInstanceOf(ForbiddenError);
    await services.accesses.updateAccess.execute(access.id, { status: 'DESATIVADO' });
    await expect(services.authorizer.assertScreen(otherSubject, submenu.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
