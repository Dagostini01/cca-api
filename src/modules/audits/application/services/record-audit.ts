import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import type { ResourceKind } from '../../../permissions/domain/permission.js';
import type { ChainResourceLookup } from '../../../permissions/application/ports/chain-resource-lookup.js';
import type { ProfileRepository } from '../../../profiles/application/ports/profile-repository.js';
import type { SystemRepository } from '../../../systems/application/ports/system-repository.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import { normalizeAuditDescription, type AuditResource } from '../../domain/audit.js';
import type { AuditRecorder, AuditChange } from '../ports/audit-recorder.js';
import type { AuditRepository } from '../ports/audit-repository.js';

const CHAIN_RESOURCES = new Set<AuditResource>(['EMPRESA', 'SISTEMA', 'MODULO', 'MENU', 'SUBMENU']);

export function createAuditRecorder(dependencies: {
  audits: AuditRepository;
  users: UserRepository;
  profiles: ProfileRepository;
  permissions: PermissionRepository;
  accesses: AccessRepository;
  systems: SystemRepository;
  resources: ChainResourceLookup;
}): AuditRecorder {
  return {
    async record(change: AuditChange) {
      const descricao = normalizeAuditDescription(change.descricao);
      const actor = await dependencies.users.findBySubject(change.subject);
      await dependencies.audits.add({
        ocorridoEm: new Date(),
        usuarioId: actor?.id ?? null,
        usuarioNome: actor?.nome ?? null,
        acao: change.acao,
        recursoTipo: change.recursoTipo,
        recursoId: change.recursoId,
        descricao,
        empresaId: await companyOf(dependencies, change.recursoTipo, change.recursoId),
      });
    },
  };
}

async function companyOf(dependencies: {
  users: UserRepository;
  profiles: ProfileRepository;
  permissions: PermissionRepository;
  accesses: AccessRepository;
  systems: SystemRepository;
  resources: ChainResourceLookup;
}, tipo: AuditResource, id: string): Promise<string> {
  if (tipo === 'EMPRESA') return id;
  if (CHAIN_RESOURCES.has(tipo)) {
    const owner = await dependencies.resources.findOwner(tipo as ResourceKind, id);
    if (!owner) throw new Error('audit target is missing its company');
    return owner.empresaId;
  }
  if (tipo === 'USUARIO') {
    const user = await dependencies.users.findById(id);
    if (!user) throw new Error('audit target is missing its company');
    return user.empresaId;
  }
  if (tipo === 'PERFIL') {
    const profile = await dependencies.profiles.findById(id);
    if (!profile) throw new Error('audit target is missing its company');
    return profile.empresaId;
  }
  if (tipo === 'PERMISSAO') {
    const permission = await dependencies.permissions.findById(id);
    const profile = permission ? await dependencies.profiles.findById(permission.perfilId) : null;
    if (!profile) throw new Error('audit target is missing its company');
    return profile.empresaId;
  }
  const access = await dependencies.accesses.findById(id);
  const system = access ? await dependencies.systems.findById(access.sistemaId) : null;
  if (!system) throw new Error('audit target is missing its company');
  return system.empresaId;
}
