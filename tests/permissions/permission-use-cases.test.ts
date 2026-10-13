import { describe, expect, it } from 'vitest';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { createMenuServices } from '../../src/modules/menus/application/factories/menu-services-factory.js';
import { createModuleServices } from '../../src/modules/system-modules/application/factories/module-services-factory.js';
import { createPermissionServices } from '../../src/modules/permissions/application/factories/permission-services-factory.js';
import { createWalkingChainResourceLookup } from '../../src/modules/permissions/application/services/walking-chain-resource-lookup.js';
import { InvalidPermissionActionsError, PermissionCompanyMismatchError, PermissionConflictError, PermissionResourceNotFoundError } from '../../src/modules/permissions/domain/permission-errors.js';
import { createProfileServices } from '../../src/modules/profiles/application/factories/profile-services-factory.js';
import { createSubmenuServices } from '../../src/modules/submenus/application/factories/submenu-services-factory.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryPermissionRepository } from './in-memory-permission-repository.js';

describe('permission use cases', () => {
  function services() {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const modules = new InMemoryModuleRepository();
    const menus = new InMemoryMenuRepository();
    const submenus = new InMemorySubmenuRepository();
    const profiles = new InMemoryProfileRepository();
    return {
      companies: createCompanyServices(companies),
      systems: createSystemServices(systems, companies),
      modules: createModuleServices(modules, systems),
      menus: createMenuServices(menus, modules),
      submenus: createSubmenuServices(submenus, menus),
      profiles: createProfileServices(profiles, companies),
      permissions: createPermissionServices(
        new InMemoryPermissionRepository(),
        profiles,
        createWalkingChainResourceLookup(companies, systems, modules, menus, submenus),
      ),
    };
  }

  it('grants actions on a submenu of the profile company and rejects another company', async () => {
    const { companies, systems, modules, menus, submenus, profiles, permissions } = services();
    const alfa = await companies.createCompany.execute({ nome: 'Alfa' });
    const beta = await companies.createCompany.execute({ nome: 'Beta' });
    const system = await systems.createSystem.execute({ nome: 'Escala', empresaId: alfa.id });
    const module = await modules.createModule.execute({ nome: 'Funcionários', sistemaId: system.id });
    const menu = await menus.createMenu.execute({ nome: 'Cadastro', moduloId: module.id });
    const submenu = await submenus.createSubmenu.execute({ nome: 'Visualizar', menuId: menu.id });
    const profile = await profiles.createProfile.execute({ nome: 'Supervisor', empresaId: alfa.id });
    const otherSystem = await systems.createSystem.execute({ nome: 'Portal', empresaId: beta.id });

    const created = await permissions.createPermission.execute({
      perfilId: profile.id,
      recursoTipo: 'SUBMENU',
      recursoId: submenu.id,
      visualizar: true,
      criar: false,
      editar: false,
      excluir: false,
    });
    expect(created).toMatchObject({ perfilId: profile.id, recursoTipo: 'SUBMENU', recursoId: submenu.id, visualizar: true, criar: false });

    await expect(permissions.createPermission.execute({
      perfilId: profile.id,
      recursoTipo: 'SISTEMA',
      recursoId: otherSystem.id,
      visualizar: true,
      criar: false,
      editar: false,
      excluir: false,
    })).rejects.toBeInstanceOf(PermissionCompanyMismatchError);
    await expect(permissions.createPermission.execute({
      perfilId: profile.id,
      recursoTipo: 'SUBMENU',
      recursoId: submenu.id,
      visualizar: true,
      criar: true,
      editar: false,
      excluir: false,
    })).rejects.toBeInstanceOf(PermissionConflictError);
  });

  it('rejects a missing resource and a grant with no action', async () => {
    const { companies, profiles, permissions } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const profile = await profiles.createProfile.execute({ nome: 'Supervisor', empresaId: company.id });
    const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';

    await expect(permissions.createPermission.execute({
      perfilId: profile.id,
      recursoTipo: 'MODULO',
      recursoId: missingId,
      visualizar: true,
      criar: false,
      editar: false,
      excluir: false,
    })).rejects.toBeInstanceOf(PermissionResourceNotFoundError);
    await expect(permissions.createPermission.execute({
      perfilId: profile.id,
      recursoTipo: 'MODULO',
      recursoId: missingId,
      visualizar: false,
      criar: false,
      editar: false,
      excluir: false,
    })).rejects.toBeInstanceOf(InvalidPermissionActionsError);
  });

  it('updates only the actions and can clear them without moving the resource', async () => {
    const { companies, systems, profiles, permissions } = services();
    const company = await companies.createCompany.execute({ nome: 'Alfa' });
    const system = await systems.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const profile = await profiles.createProfile.execute({ nome: 'Supervisor', empresaId: company.id });
    const created = await permissions.createPermission.execute({
      perfilId: profile.id,
      recursoTipo: 'SISTEMA',
      recursoId: system.id,
      visualizar: true,
      criar: true,
      editar: true,
      excluir: true,
    });

    const updated = await permissions.updatePermission.execute(created.id, { criar: false, editar: false, excluir: false });
    expect(updated).toMatchObject({ recursoId: system.id, visualizar: true, criar: false, editar: false, excluir: false });

    const cleared = await permissions.updatePermission.execute(created.id, { visualizar: false });
    expect(cleared).toMatchObject({ recursoTipo: 'SISTEMA', recursoId: system.id, visualizar: false, criar: false, editar: false, excluir: false });
    expect(await permissions.listPermissions.execute({ perfilId: profile.id })).toHaveLength(1);
  });
});
