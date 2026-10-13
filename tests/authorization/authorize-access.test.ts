import { describe, expect, it } from 'vitest';
import { createAccessServices } from '../../src/modules/accesses/application/factories/access-services-factory.js';
import { createAuthorizer } from '../../src/modules/authorization/application/services/authorize-access.js';
import { ForbiddenError } from '../../src/modules/authorization/domain/forbidden-error.js';
import { createCompanyServices } from '../../src/modules/companies/application/factories/company-services-factory.js';
import { CompanyNotFoundError } from '../../src/modules/companies/domain/company-errors.js';
import { createModuleServices } from '../../src/modules/system-modules/application/factories/module-services-factory.js';
import { createPermissionServices } from '../../src/modules/permissions/application/factories/permission-services-factory.js';
import { createWalkingChainResourceLookup } from '../../src/modules/permissions/application/services/walking-chain-resource-lookup.js';
import type { PermissionActions, ResourceKind } from '../../src/modules/permissions/domain/permission.js';
import { createProfileServices } from '../../src/modules/profiles/application/factories/profile-services-factory.js';
import { createSystemServices } from '../../src/modules/systems/application/factories/system-services-factory.js';
import { createUserServices } from '../../src/modules/users/application/factories/user-services-factory.js';
import { InMemoryAccessRepository } from '../accesses/in-memory-access-repository.js';
import { InMemoryCompanyRepository } from '../companies/in-memory-company-repository.js';
import { InMemoryMenuRepository } from '../ownership/in-memory-menu-repository.js';
import { InMemoryModuleRepository } from '../ownership/in-memory-module-repository.js';
import { InMemorySubmenuRepository } from '../ownership/in-memory-submenu-repository.js';
import { InMemoryPermissionRepository } from '../permissions/in-memory-permission-repository.js';
import { InMemoryProfileRepository } from '../profiles/in-memory-profile-repository.js';
import { InMemorySystemRepository } from '../systems/in-memory-system-repository.js';
import { InMemoryUserRepository } from '../users/in-memory-user-repository.js';

const subject = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherSubject = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const missingId = '5b6c2f0a-1d4e-4a7b-9c3d-8e2f1a0b6c5d';

const none: PermissionActions = { visualizar: false, criar: false, editar: false, excluir: false };

describe('authorize access', () => {
  function world() {
    const companies = new InMemoryCompanyRepository();
    const systems = new InMemorySystemRepository();
    const modules = new InMemoryModuleRepository();
    const menus = new InMemoryMenuRepository();
    const submenus = new InMemorySubmenuRepository();
    const users = new InMemoryUserRepository();
    const profiles = new InMemoryProfileRepository();
    const permissions = new InMemoryPermissionRepository();
    const accesses = new InMemoryAccessRepository();
    const resources = createWalkingChainResourceLookup(companies, systems, modules, menus, submenus);
    return {
      companies: createCompanyServices(companies),
      systems: createSystemServices(systems, companies),
      modules: createModuleServices(modules, systems),
      users: createUserServices(users, companies),
      profiles: createProfileServices(profiles, companies),
      permissions: createPermissionServices(permissions, profiles, resources),
      accesses: createAccessServices(accesses, users, profiles, systems),
      authorizer: createAuthorizer({ users, accesses, profiles, permissions, systems, resources }),
    };
  }

  async function granted(options?: { secondSystem?: boolean }) {
    const services = world();
    const company = await services.companies.createCompany.execute({ nome: 'Alfa' });
    const system = await services.systems.createSystem.execute({ nome: 'Escala', empresaId: company.id });
    const other = options?.secondSystem
      ? await services.systems.createSystem.execute({ nome: 'Portal', empresaId: company.id })
      : null;
    const module = await services.modules.createModule.execute({ nome: 'Funcionários', sistemaId: system.id });
    const sibling = await services.modules.createModule.execute({ nome: 'Ponto', sistemaId: system.id });
    const user = await services.users.createUser.execute({
      nome: 'Ana',
      email: 'ana@example.com',
      keycloakSub: subject,
      empresaId: company.id,
    });
    const profile = await services.profiles.createProfile.execute({ nome: 'Supervisor', empresaId: company.id });
    await services.accesses.createAccess.execute({ usuarioId: user.id, perfilId: profile.id, sistemaId: system.id });
    return { ...services, company, system, other, module, sibling, user, profile };
  }

  async function permit(
    services: Awaited<ReturnType<typeof granted>>,
    recursoTipo: ResourceKind,
    recursoId: string,
    action: keyof PermissionActions,
    perfilId = services.profile.id,
  ) {
    return services.permissions.createPermission.execute({
      perfilId,
      recursoTipo,
      recursoId,
      ...none,
      [action]: true,
    });
  }

  it('allows every target while the access table is empty', async () => {
    const { authorizer } = world();
    await expect(authorizer.assert(subject, 'criar', { tipo: 'EMPRESA', id: missingId })).resolves.toBeUndefined();
    await expect(authorizer.assertCanCreateCompany(otherSubject)).resolves.toBeUndefined();
    await expect(authorizer.filter(subject, 'visualizar', [{ id: missingId }], (item) => ({ tipo: 'EMPRESA', id: item.id }))).resolves.toEqual([{ id: missingId }]);
  });

  it('requires an active local user and the exact action after the first access', async () => {
    const seeded = await granted();
    await expect(seeded.authorizer.assert(otherSubject, 'visualizar', { tipo: 'EMPRESA', id: seeded.company.id })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'EMPRESA', id: missingId })).rejects.toBeInstanceOf(CompanyNotFoundError);
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'EMPRESA', id: seeded.company.id })).rejects.toBeInstanceOf(ForbiddenError);

    const companyPermission = await permit(seeded, 'EMPRESA', seeded.company.id, 'visualizar');
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'EMPRESA', id: seeded.company.id })).resolves.toBeUndefined();
    await expect(seeded.authorizer.assert(subject, 'criar', { tipo: 'EMPRESA', id: seeded.company.id })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(seeded.authorizer.assertCanCreateCompany(subject)).rejects.toBeInstanceOf(ForbiddenError);

    await seeded.permissions.updatePermission.execute(companyPermission.id, { criar: true });
    await expect(seeded.authorizer.assertCanCreateCompany(subject)).resolves.toBeUndefined();
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'SISTEMA', id: seeded.system.id })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('scopes a system grant to that access and does not inherit it downward', async () => {
    const seeded = await granted({ secondSystem: true });
    const systemPermission = await permit(seeded, 'SISTEMA', seeded.system.id, 'criar');
    await permit(seeded, 'MODULO', seeded.module.id, 'visualizar');

    await expect(seeded.authorizer.assert(subject, 'criar', { tipo: 'SISTEMA', id: seeded.system.id })).resolves.toBeUndefined();
    await expect(seeded.authorizer.assert(subject, 'criar', { tipo: 'SISTEMA', id: seeded.other!.id })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'MODULO', id: seeded.module.id })).resolves.toBeUndefined();
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'MODULO', id: seeded.sibling.id })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(seeded.authorizer.assert(subject, 'criar', { tipo: 'MODULO', id: seeded.module.id })).rejects.toBeInstanceOf(ForbiddenError);

    const visible = await seeded.authorizer.filter(subject, 'visualizar', [seeded.system, seeded.other!], (system) => ({ tipo: 'SISTEMA', id: system.id }));
    expect(visible.map((system) => system.id)).toEqual([]);

    await seeded.permissions.updatePermission.execute(systemPermission.id, { visualizar: true });
    const systems = await seeded.authorizer.filter(subject, 'visualizar', [seeded.system, seeded.other!], (system) => ({ tipo: 'SISTEMA', id: system.id }));
    expect(systems.map((system) => system.id)).toEqual([seeded.system.id]);
  });

  it('joins grants from another access and ignores an inactive profile, access or user', async () => {
    const seeded = await granted({ secondSystem: true });
    const otherProfile = await seeded.profiles.createProfile.execute({ nome: 'Operador', empresaId: seeded.company.id });
    await seeded.accesses.createAccess.execute({ usuarioId: seeded.user.id, perfilId: otherProfile.id, sistemaId: seeded.other!.id });
    await permit(seeded, 'SISTEMA', seeded.other!.id, 'visualizar', otherProfile.id);
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'SISTEMA', id: seeded.other!.id })).resolves.toBeUndefined();

    await seeded.profiles.updateProfile.execute(otherProfile.id, { status: 'INATIVO' });
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'SISTEMA', id: seeded.other!.id })).rejects.toBeInstanceOf(ForbiddenError);

    await seeded.profiles.updateProfile.execute(otherProfile.id, { status: 'ATIVO' });
    const accesses = await seeded.accesses.listAccesses.execute({ sistemaId: seeded.other!.id });
    await seeded.accesses.updateAccess.execute(accesses[0].id, { status: 'INATIVO' });
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'SISTEMA', id: seeded.other!.id })).rejects.toBeInstanceOf(ForbiddenError);

    await permit(seeded, 'EMPRESA', seeded.company.id, 'visualizar');
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'EMPRESA', id: seeded.company.id })).resolves.toBeUndefined();
    await seeded.users.updateUser.execute(seeded.user.id, { status: 'INATIVO' });
    await expect(seeded.authorizer.assert(subject, 'visualizar', { tipo: 'EMPRESA', id: seeded.company.id })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
