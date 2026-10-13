import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import { CompanyNotFoundError } from '../../../companies/domain/company-errors.js';
import { MenuNotFoundError } from '../../../menus/domain/menu-errors.js';
import type { Permission } from '../../../permissions/domain/permission.js';
import type { ChainResourceLookup } from '../../../permissions/application/ports/chain-resource-lookup.js';
import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import type { ProfileRepository } from '../../../profiles/application/ports/profile-repository.js';
import { ModuleNotFoundError } from '../../../system-modules/domain/module-errors.js';
import { SubmenuNotFoundError } from '../../../submenus/domain/submenu-errors.js';
import type { SystemRepository } from '../../../systems/application/ports/system-repository.js';
import { SystemNotFoundError } from '../../../systems/domain/system-errors.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import { ForbiddenError } from '../../domain/forbidden-error.js';
import type { AuthorizationAction, AuthorizationTarget, Authorizer } from '../ports/authorizer.js';

type Grant = {
  empresaId: string;
  sistemaId: string;
  permissions: Permission[];
};

type ResourceOwner = {
  empresaId: string;
  sistemaId: string | null;
};

export function createAuthorizer(dependencies: {
  users: UserRepository;
  accesses: AccessRepository;
  profiles: ProfileRepository;
  permissions: PermissionRepository;
  systems: SystemRepository;
  resources: ChainResourceLookup;
}): Authorizer {
  async function grantsFor(subject: string): Promise<Grant[] | 'bootstrap'> {
    if (await dependencies.accesses.count() === 0) return 'bootstrap';
    const user = await dependencies.users.findBySubject(subject);
    if (!user || user.status !== 'ATIVO') throw new ForbiddenError();
    const accesses = (await dependencies.accesses.list({ usuarioId: user.id })).filter((access) => access.status === 'ATIVO');
    const grants: Grant[] = [];
    for (const access of accesses) {
      const profile = await dependencies.profiles.findById(access.perfilId);
      const system = await dependencies.systems.findById(access.sistemaId);
      if (!profile || profile.status !== 'ATIVO' || !system || profile.empresaId !== system.empresaId) continue;
      grants.push({
        empresaId: system.empresaId,
        sistemaId: system.id,
        permissions: await dependencies.permissions.list(profile.id),
      });
    }
    return grants;
  }

  function covers(grant: Grant, action: AuthorizationAction, target: AuthorizationTarget, owner: ResourceOwner): boolean {
    if (target.tipo === 'EMPRESA') {
      if (grant.empresaId !== target.id) return false;
    } else if (grant.sistemaId !== owner.sistemaId) {
      return false;
    }
    return grant.permissions.some((permission) => permission.recursoTipo === target.tipo && permission.recursoId === target.id && permission[action]);
  }

  function missing(target: AuthorizationTarget): Error {
    if (target.tipo === 'EMPRESA') return new CompanyNotFoundError();
    if (target.tipo === 'SISTEMA') return new SystemNotFoundError();
    if (target.tipo === 'MODULO') return new ModuleNotFoundError();
    if (target.tipo === 'MENU') return new MenuNotFoundError();
    return new SubmenuNotFoundError();
  }

  return {
    async assert(subject, action, target) {
      const grants = await grantsFor(subject);
      if (grants === 'bootstrap') return;
      const owner = await dependencies.resources.findOwner(target.tipo, target.id);
      if (!owner) throw missing(target);
      if (!grants.some((grant) => covers(grant, action, target, owner))) throw new ForbiddenError();
    },

    async assertCanCreateCompany(subject) {
      const grants = await grantsFor(subject);
      if (grants === 'bootstrap') return;
      const allowed = grants.some((grant) => grant.permissions.some((permission) => (
        permission.recursoTipo === 'EMPRESA' && permission.recursoId === grant.empresaId && permission.criar
      )));
      if (!allowed) throw new ForbiddenError();
    },

    async filter(subject, action, items, targetOf) {
      const grants = await grantsFor(subject);
      if (grants === 'bootstrap') return items;
      const visible: typeof items = [];
      for (const item of items) {
        const target = targetOf(item);
        const owner = await dependencies.resources.findOwner(target.tipo, target.id);
        if (owner && grants.some((grant) => covers(grant, action, target, owner))) visible.push(item);
      }
      return visible;
    },
  };
}
