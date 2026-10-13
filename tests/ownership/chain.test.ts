import { describe, expect, it } from 'vitest';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createMenuServices } from '../../src/modules/menus/application/factories/menu-services-factory.js';
import { MenuModuleNotFoundError, MenuNameConflictError } from '../../src/modules/menus/domain/menu-errors.js';
import { createSubmenuServices } from '../../src/modules/submenus/application/factories/submenu-services-factory.js';
import { SubmenuMenuNotFoundError } from '../../src/modules/submenus/domain/submenu-errors.js';
import { createModuleServices } from '../../src/modules/system-modules/application/factories/module-services-factory.js';
import { ModuleNameConflictError, ModuleSystemNotFoundError } from '../../src/modules/system-modules/domain/module-errors.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryMenuRepository } from './in-memory-menu-repository.js';
import { InMemoryModuleRepository } from './in-memory-module-repository.js';
import { InMemorySubmenuRepository } from './in-memory-submenu-repository.js';

const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';

describe('ownership chain below the system', () => {
  function services() {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const modules = new InMemoryModuleRepository();
    const menus = new InMemoryMenuRepository();
    const submenus = new InMemorySubmenuRepository();
    return {
      companies: createCompanyServices(companies),
      systems: createSystemServices(systems, companies),
      modules: createModuleServices(modules, systems),
      menus: createMenuServices(menus, modules),
      submenus: createSubmenuServices(submenus, menus),
    };
  }

  it('builds módulo, menu and submenu only under an existing parent', async () => {
    const { companies, systems, modules, menus, submenus } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const system = await systems.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const module = await modules.createModule.execute({ nome: '  Cadastro  ', sistemaId: system.id });
    const menu = await menus.createMenu.execute({ nome: 'Pessoas', moduloId: module.id });
    const submenu = await submenus.createSubmenu.execute({ nome: 'Novo', menuId: menu.id });

    expect(module).toMatchObject({ nome: 'Cadastro', sistemaId: system.id, status: 'ATIVO' });
    expect(menu).toMatchObject({ nome: 'Pessoas', moduloId: module.id });
    expect(submenu).toMatchObject({ nome: 'Novo', menuId: menu.id });

    await expect(modules.createModule.execute({ nome: 'Outro', sistemaId: missingId })).rejects.toBeInstanceOf(ModuleSystemNotFoundError);
    await expect(menus.createMenu.execute({ nome: 'Outro', moduloId: missingId })).rejects.toBeInstanceOf(MenuModuleNotFoundError);
    await expect(submenus.createSubmenu.execute({ nome: 'Outro', menuId: missingId })).rejects.toBeInstanceOf(SubmenuMenuNotFoundError);
  });

  it('rejects a repeated name under the same parent and allows it under another', async () => {
    const { companies, systems, modules } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const first = await systems.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const second = await systems.createSystem.execute({ nome: 'Ponto', empresaId: company.id });
    await modules.createModule.execute({ nome: 'Cadastro', sistemaId: first.id });
    const elsewhere = await modules.createModule.execute({ nome: 'cadastro', sistemaId: second.id });
    expect(elsewhere.sistemaId).toBe(second.id);
    await expect(modules.createModule.execute({ nome: 'CADASTRO', sistemaId: first.id })).rejects.toBeInstanceOf(ModuleNameConflictError);

    const listed = await modules.listModules.execute({ sistemaId: first.id });
    expect(listed.map((module) => module.nome)).toEqual(['Cadastro']);
  });

  it('moves a menu to another module and inactivates the submenu', async () => {
    const { companies, systems, modules, menus, submenus } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const system = await systems.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const origin = await modules.createModule.execute({ nome: 'Cadastro', sistemaId: system.id });
    const destination = await modules.createModule.execute({ nome: 'Relatórios', sistemaId: system.id });
    const menu = await menus.createMenu.execute({ nome: 'Pessoas', moduloId: origin.id });
    const submenu = await submenus.createSubmenu.execute({ nome: 'Novo', menuId: menu.id });

    const moved = await menus.updateMenu.execute(menu.id, { moduloId: destination.id });
    const inactive = await submenus.updateSubmenu.execute(submenu.id, { status: 'INATIVO' });
    expect(moved.moduloId).toBe(destination.id);
    expect(inactive).toMatchObject({ menuId: menu.id, status: 'INATIVO' });
    expect(await menus.listMenus.execute({ moduloId: origin.id })).toEqual([]);
    await expect(menus.updateMenu.execute(menu.id, { moduloId: missingId })).rejects.toBeInstanceOf(MenuModuleNotFoundError);
    await expect(menus.createMenu.execute({ nome: 'pessoas', moduloId: destination.id })).rejects.toBeInstanceOf(MenuNameConflictError);
  });
});
