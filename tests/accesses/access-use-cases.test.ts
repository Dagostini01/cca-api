import { describe, expect, it } from 'vitest';
import { createAccessServices } from '../../src/modules/accesses/application/factories/access-services-factory.js';
import { AccessConflictError, AccessUserNotFoundError, IncoherentScreenError } from '../../src/modules/accesses/domain/access-errors.js';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createMenuServices } from '../../src/modules/menus/application/factories/menu-services-factory.js';
import { createModuleServices } from '../../src/modules/system-modules/application/factories/module-services-factory.js';
import { createSubmenuServices } from '../../src/modules/submenus/application/factories/submenu-services-factory.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { createMemoryGraph, createMemoryUserServices } from '../helpers/memory-graph.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('access use cases', () => {
  async function world() {
    const graph = createMemoryGraph();
    const companies = createCompanyServices(graph.companies);
    const systems = createSystemServices(graph.systems);
    const modules = createModuleServices(graph.modules, graph.systems);
    const menus = createMenuServices(graph.menus, graph.modules);
    const submenus = createSubmenuServices(graph.submenus, graph.menus);
    const users = createMemoryUserServices(graph);
    const accesses = createAccessServices(graph.accesses, graph.users, graph.chain);
    const company = await companies.createCompany.execute({ razaoSocial: 'Alfa' });
    const system = await systems.createSystem.execute({ nome: 'Escala', empresaIds: [company.id] });
    const module = await modules.createModule.execute({ nome: 'Cadastro', sistemaId: system.id });
    const menu = await menus.createMenu.execute({ nome: 'Pessoas', moduloId: module.id });
    const submenu = await submenus.createSubmenu.execute({ nome: 'Novo', menuId: menu.id });
    const otherSubmenu = await submenus.createSubmenu.execute({ nome: 'Lista', menuId: menu.id });
    const otherMenu = await menus.createMenu.execute({ nome: 'Outro', moduloId: module.id });
    const user = await users.createUser.execute({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      keycloakSub: subject,
    }, subject);
    const screen = {
      empresaId: company.id,
      sistemaId: system.id,
      moduloId: module.id,
      menuId: menu.id,
      submenuId: submenu.id,
    };
    return { accesses, user, screen, otherSubmenu, otherMenu };
  }

  it('grants one row per screen and replaces only the status later', async () => {
    const { accesses, user, screen, otherSubmenu } = await world();
    const created = await accesses.createAccess.execute({ usuarioId: user.id, ...screen });
    expect(created).toMatchObject({ usuarioId: user.id, submenuId: screen.submenuId, status: 'ATIVADO', tipo: 'ADMINITRADOR' });

    const other = await accesses.createAccess.execute({
      usuarioId: user.id,
      ...screen,
      submenuId: otherSubmenu.id,
    });
    expect(other.submenuId).toBe(otherSubmenu.id);

    await expect(accesses.createAccess.execute({ usuarioId: user.id, ...screen })).rejects.toBeInstanceOf(AccessConflictError);
    const changed = await accesses.updateAccess.execute(created.id, { status: 'DESATIVADO' });
    expect(changed).toMatchObject({ submenuId: screen.submenuId, status: 'DESATIVADO' });
    expect(await accesses.listAccesses.execute({ usuarioId: user.id, pagina: 1, tamanho: 20 })).toMatchObject({
      total: 2,
      itens: expect.any(Array),
    });
    const listed = await accesses.listAccesses.execute({ usuarioId: user.id, pagina: 1, tamanho: 20 });
    expect(listed.itens).toHaveLength(2);
    expect(listed.itens.map((item) => item.submenu).sort()).toEqual(['Lista', 'Novo']);
    expect(listed.itens.map((item) => item.empresa)).toEqual(['Alfa', 'Alfa']);
  });

  it('rejects a broken chain and a missing user', async () => {
    const { accesses, user, screen, otherMenu } = await world();
    await expect(accesses.createAccess.execute({
      usuarioId: user.id,
      ...screen,
      menuId: otherMenu.id,
    })).rejects.toBeInstanceOf(IncoherentScreenError);
    await expect(accesses.createAccess.execute({
      usuarioId: 999,
      ...screen,
    })).rejects.toBeInstanceOf(AccessUserNotFoundError);
  });

  it('resolves the chain from the company and the submenu', async () => {
    const { accesses, user, screen } = await world();
    const created = await accesses.createAccess.execute({
      usuarioId: user.id,
      empresaId: screen.empresaId,
      submenuId: screen.submenuId,
    });
    expect(created).toMatchObject({
      empresaId: screen.empresaId,
      sistemaId: screen.sistemaId,
      moduloId: screen.moduloId,
      menuId: screen.menuId,
      submenuId: screen.submenuId,
    });
  });
});
