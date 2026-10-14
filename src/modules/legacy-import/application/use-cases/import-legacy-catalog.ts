import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { Access } from '../../../accesses/domain/access.js';
import type { AuditRecorder } from '../../../audits/application/ports/audit-recorder.js';
import type { AuditResource } from '../../../audits/domain/audit.js';
import type { CompanyRepository } from '../../../companies/application/ports/company-repository.js';
import { normalizeCnpj, normalizeCompanyName, type Company, type CompanyStatus } from '../../../companies/domain/company.js';
import { InvalidCompanyDocumentError, InvalidCompanyNameError } from '../../../companies/domain/company-errors.js';
import type { MenuRepository } from '../../../menus/application/ports/menu-repository.js';
import { menuNamesConflict, normalizeMenuName, type Menu } from '../../../menus/domain/menu.js';
import { InvalidMenuNameError } from '../../../menus/domain/menu-errors.js';
import type { PermissionRepository } from '../../../permissions/application/ports/permission-repository.js';
import type { Permission } from '../../../permissions/domain/permission.js';
import type { ProfileRepository } from '../../../profiles/application/ports/profile-repository.js';
import { normalizeProfileName, profileNamesConflict, type Profile } from '../../../profiles/domain/profile.js';
import { InvalidProfileNameError } from '../../../profiles/domain/profile-errors.js';
import type { ModuleRepository } from '../../../system-modules/application/ports/module-repository.js';
import { moduleNamesConflict, normalizeModuleName, type Module } from '../../../system-modules/domain/module.js';
import { InvalidModuleNameError } from '../../../system-modules/domain/module-errors.js';
import type { SubmenuRepository } from '../../../submenus/application/ports/submenu-repository.js';
import { normalizeSubmenuName, submenuNamesConflict, type Submenu } from '../../../submenus/domain/submenu.js';
import { InvalidSubmenuNameError } from '../../../submenus/domain/submenu-errors.js';
import type { SystemRepository } from '../../../systems/application/ports/system-repository.js';
import { normalizeSystemName, systemNamesConflict, type System } from '../../../systems/domain/system.js';
import { InvalidSystemNameError } from '../../../systems/domain/system-errors.js';
import type { IdentityDirectory } from '../../../users/application/ports/identity-directory.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import { normalizeKeycloakSubject, normalizeUserEmail, normalizeUserName, type BusinessUser } from '../../../users/domain/user.js';
import { InvalidUserEmailError, InvalidUserNameError, InvalidUserSubjectError } from '../../../users/domain/user-errors.js';
import type { ImportCounts, LegacyCatalog, LegacyImportReport, LegacyNode, LegacyStatus } from '../../domain/legacy-catalog.js';
import { LegacySystemOwnerUnknownError } from '../../domain/legacy-import-error.js';

export type LegacySubjectLink = {
  email: string;
  keycloakSub: string;
};

export type ImportLegacyCatalogDependencies = {
  companies: CompanyRepository;
  systems: SystemRepository;
  modules: ModuleRepository;
  menus: MenuRepository;
  submenus: SubmenuRepository;
  profiles: ProfileRepository;
  users?: UserRepository;
  permissions?: PermissionRepository;
  accesses?: AccessRepository;
  directory?: IdentityDirectory;
  audits?: AuditRecorder;
};

type Placed = { id: string; nome: string };

export class ImportLegacyCatalog {
  constructor(private readonly dependencies: ImportLegacyCatalogDependencies) {}

  async execute(catalog: LegacyCatalog, actorSubject?: string, links: LegacySubjectLink[] = []): Promise<LegacyImportReport> {
    const report = emptyReport(catalog.senhasIgnoradas);
    const owners = systemOwners(catalog);
    const companies = await this.dependencies.companies.list();
    const companyIds = new Map<number, string>();
    for (const source of catalog.companies) {
      const placed = await this.placeCompany(source, catalog.statuses, companies, report, actorSubject);
      if (placed) companyIds.set(source.id, placed.id);
    }

    const systems = await this.dependencies.systems.list();
    const systemIds = new Map<string, string>();
    for (const source of catalog.systems) {
      for (const legacyCompanyId of owners.get(source.id) ?? []) {
        const empresaId = companyIds.get(legacyCompanyId);
        if (!empresaId) {
          report.sistemas.ignoradas += 1;
          continue;
        }
        const placed = await this.placeNode(source, empresaId, catalog.statuses, systems, report.sistemas, 'SISTEMA', actorSubject, {
          normalize: normalizeSystemName,
          invalid: InvalidSystemNameError,
          conflicts: systemNamesConflict,
          parentId: (item) => item.empresaId,
          add: (nome, status) => this.dependencies.systems.add({ empresaId, nome, status }),
        });
        if (placed) systemIds.set(pair(source.id, empresaId), placed.id);
      }
    }

    const modules = await this.dependencies.modules.list();
    const moduleIds = await this.placeChildren(catalog.modules, catalog.statuses, systemIds, modules, report.modulos, 'MODULO', actorSubject, {
      normalize: normalizeModuleName,
      invalid: InvalidModuleNameError,
      conflicts: moduleNamesConflict,
      parentId: (item) => item.sistemaId,
      add: (parentId, nome, status) => this.dependencies.modules.add({ sistemaId: parentId, nome, status }),
    });
    const menus = await this.dependencies.menus.list();
    const menuIds = await this.placeChildren(catalog.menus, catalog.statuses, moduleIds, menus, report.menus, 'MENU', actorSubject, {
      normalize: normalizeMenuName,
      invalid: InvalidMenuNameError,
      conflicts: menuNamesConflict,
      parentId: (item) => item.moduloId,
      add: (parentId, nome, status) => this.dependencies.menus.add({ moduloId: parentId, nome, status }),
    });
    const submenus = await this.dependencies.submenus.list();
    const submenuIds = await this.placeChildren(catalog.submenus, catalog.statuses, menuIds, submenus, report.submenus, 'SUBMENU', actorSubject, {
      normalize: normalizeSubmenuName,
      invalid: InvalidSubmenuNameError,
      conflicts: submenuNamesConflict,
      parentId: (item) => item.menuId,
      add: (parentId, nome, status) => this.dependencies.submenus.add({ menuId: parentId, nome, status }),
    });

    const profiles = await this.dependencies.profiles.list();
    const profileIds = new Map<string, string>();
    for (const empresaId of companyIds.values()) {
      for (const source of catalog.profiles) {
        const placed = await this.placeProfile(source, empresaId, catalog.statuses, profiles, report, actorSubject);
        if (placed) profileIds.set(pair(source.id, empresaId), placed.id);
      }
    }

    const users = this.dependencies.users ? await this.dependencies.users.list() : [];
    const userIds = new Map<string, string>();
    for (const source of catalog.users) {
      const placed = await this.placeUser(source, catalog, companyIds, links, users, report, actorSubject);
      if (placed && source.email) userIds.set(source.email.trim().toLowerCase(), placed.id);
    }

    if (this.dependencies.permissions && this.dependencies.accesses) {
      const permissions = await this.dependencies.permissions.list();
      const accesses = await this.dependencies.accesses.list();
      for (const source of catalog.accesses) {
        await this.placeAccess(source, catalog.statuses, companyIds, systemIds, submenuIds, profileIds, userIds, permissions, accesses, report, actorSubject);
      }
    } else {
      report.acessos.ignoradas += catalog.accesses.length;
      report.permissoes.ignoradas += catalog.accesses.length;
    }
    return report;
  }

  private async placeCompany(source: LegacyCatalog['companies'][number], statuses: LegacyStatus[], companies: Company[], report: LegacyImportReport, actorSubject?: string): Promise<Placed | null> {
    let nome: string;
    try {
      nome = normalizeCompanyName(source.nome);
    } catch (error) {
      if (error instanceof InvalidCompanyNameError) {
        report.empresas.ignoradas += 1;
        return null;
      }
      throw error;
    }
    let cnpj: string | null = null;
    if (source.cnpj && source.cnpj.trim().length > 0) {
      try {
        cnpj = normalizeCnpj(source.cnpj);
      } catch (error) {
        if (!(error instanceof InvalidCompanyDocumentError)) throw error;
        report.documentosIgnorados += 1;
      }
    }
    const existing = companies.find((company) => (cnpj !== null && company.cnpj === cnpj) || sameLabel(company.nome, nome));
    if (existing) {
      report.empresas.existentes += 1;
      return existing;
    }
    const created = await this.dependencies.companies.add({ nome, cnpj, status: statusFrom(statuses, source.statusId) });
    companies.push(created);
    report.empresas.criadas += 1;
    await this.record(actorSubject, 'EMPRESA', created.id, created.nome);
    return created;
  }

  private async placeNode<T extends Placed>(
    source: LegacyNode,
    parentId: string,
    statuses: LegacyStatus[],
    current: T[],
    counts: ImportCounts,
    resource: AuditResource,
    actorSubject: string | undefined,
    behavior: {
      normalize: (nome: string) => string;
      invalid: new () => Error;
      conflicts: (left: string, right: string) => boolean;
      parentId: (item: T) => string;
      add: (nome: string, status: CompanyStatus) => Promise<T>;
    },
  ): Promise<Placed | null> {
    let nome: string;
    try {
      nome = behavior.normalize(source.nome);
    } catch (error) {
      if (error instanceof behavior.invalid) {
        counts.ignoradas += 1;
        return null;
      }
      throw error;
    }
    const existing = current.find((item) => behavior.parentId(item) === parentId && behavior.conflicts(item.nome, nome));
    if (existing) {
      counts.existentes += 1;
      return existing;
    }
    const created = await behavior.add(nome, statusFrom(statuses, source.statusId));
    current.push(created);
    counts.criadas += 1;
    await this.record(actorSubject, resource, created.id, created.nome);
    return created;
  }

  private async placeChildren<T extends Placed>(
    sources: LegacyNode[],
    statuses: LegacyStatus[],
    parents: Map<string, string>,
    current: T[],
    counts: ImportCounts,
    resource: AuditResource,
    actorSubject: string | undefined,
    behavior: {
      normalize: (nome: string) => string;
      invalid: new () => Error;
      conflicts: (left: string, right: string) => boolean;
      parentId: (item: T) => string;
      add: (parentId: string, nome: string, status: CompanyStatus) => Promise<T>;
    },
  ): Promise<Map<string, string>> {
    const ids = new Map<string, string>();
    for (const source of sources) {
      const matches = [...parents.entries()].filter(([parentKey]) => parentKey.startsWith(`${source.parentId}:`));
      if (source.parentId === null || matches.length === 0) {
        counts.ignoradas += 1;
        continue;
      }
      for (const [parentKey, parentId] of matches) {
        const empresaId = parentKey.slice(parentKey.indexOf(':') + 1);
        const placed = await this.placeNode(source, parentId, statuses, current, counts, resource, actorSubject, {
          ...behavior,
          add: (nome, status) => behavior.add(parentId, nome, status),
        });
        if (placed) ids.set(pair(source.id, empresaId), placed.id);
      }
    }
    return ids;
  }

  private async placeProfile(source: LegacyCatalog['profiles'][number], empresaId: string, statuses: LegacyStatus[], profiles: Profile[], report: LegacyImportReport, actorSubject?: string): Promise<Placed | null> {
    let nome: string;
    try {
      nome = normalizeProfileName(source.nome);
    } catch (error) {
      if (error instanceof InvalidProfileNameError) {
        report.perfis.ignoradas += 1;
        return null;
      }
      throw error;
    }
    const existing = profiles.find((profile) => profile.empresaId === empresaId && profileNamesConflict(profile.nome, nome));
    if (existing) {
      report.perfis.existentes += 1;
      return existing;
    }
    const created = await this.dependencies.profiles.add({ empresaId, nome, descricao: null, status: statusFrom(statuses, source.statusId) });
    profiles.push(created);
    report.perfis.criadas += 1;
    await this.record(actorSubject, 'PERFIL', created.id, created.nome);
    return created;
  }

  private async placeUser(
    source: LegacyCatalog['users'][number],
    catalog: LegacyCatalog,
    companyIds: Map<number, string>,
    links: LegacySubjectLink[],
    users: BusinessUser[],
    report: LegacyImportReport,
    actorSubject?: string,
  ): Promise<Placed | null> {
    if (!this.dependencies.users) {
      report.usuarios.ignoradas += 1;
      return null;
    }
    let email: string;
    let nome: string;
    try {
      if (!source.email) throw new InvalidUserEmailError();
      email = normalizeUserEmail(source.email);
      nome = normalizeUserName(source.nome);
    } catch (error) {
      if (error instanceof InvalidUserEmailError || error instanceof InvalidUserNameError) {
        report.usuarios.ignoradas += 1;
        return null;
      }
      throw error;
    }
    const empresaId = companyForUser(email, catalog, companyIds);
    if (!empresaId) {
      report.usuarios.ignoradas += 1;
      return null;
    }
    const existing = users.find((user) => user.email === email);
    if (existing) {
      report.usuarios.existentes += 1;
      return existing;
    }
    const linked = links.find((link) => link.email.trim().toLowerCase() === email);
    let keycloakSub: string | null = null;
    try {
      if (linked) {
        keycloakSub = normalizeKeycloakSubject(linked.keycloakSub);
        if (this.dependencies.directory) await this.dependencies.directory.assertExists(keycloakSub);
      } else if (this.dependencies.directory) {
        const provisioned = await this.dependencies.directory.provision({ nome, email, enabled: statusFrom(catalog.statuses, source.statusId) === 'ATIVO' });
        keycloakSub = normalizeKeycloakSubject(provisioned.id);
      }
    } catch (error) {
      if (error instanceof InvalidUserSubjectError) {
        report.usuarios.ignoradas += 1;
        return null;
      }
      throw error;
    }
    if (!keycloakSub) {
      report.usuarios.ignoradas += 1;
      return null;
    }
    const created = await this.dependencies.users.add({ keycloakSub, nome, email, empresaId, status: statusFrom(catalog.statuses, source.statusId) });
    users.push(created);
    report.usuarios.criadas += 1;
    await this.record(actorSubject, 'USUARIO', created.id, created.nome);
    return created;
  }

  private async placeAccess(
    source: LegacyCatalog['accesses'][number],
    statuses: LegacyStatus[],
    companyIds: Map<number, string>,
    systemIds: Map<string, string>,
    submenuIds: Map<string, string>,
    profileIds: Map<string, string>,
    userIds: Map<string, string>,
    permissions: Permission[],
    accesses: Access[],
    report: LegacyImportReport,
    actorSubject?: string,
  ) {
    const empresaId = source.empresaId === null ? undefined : companyIds.get(source.empresaId);
    const usuarioId = source.email ? userIds.get(source.email.trim().toLowerCase()) : undefined;
    const sistemaId = empresaId && source.sistemaId !== null ? systemIds.get(pair(source.sistemaId, empresaId)) : undefined;
    const submenuId = empresaId && source.submenuId !== null ? submenuIds.get(pair(source.submenuId, empresaId)) : undefined;
    const perfilId = empresaId && source.perfilId !== null ? profileIds.get(pair(source.perfilId, empresaId)) : undefined;
    if (!usuarioId || !sistemaId || !submenuId || !perfilId || !this.dependencies.permissions || !this.dependencies.accesses) {
      report.acessos.ignoradas += 1;
      report.permissoes.ignoradas += 1;
      return;
    }
    const permission = permissions.find((item) => item.perfilId === perfilId && item.recursoTipo === 'SUBMENU' && item.recursoId === submenuId);
    if (permission) report.permissoes.existentes += 1;
    else {
      const created = await this.dependencies.permissions.add({
        perfilId,
        recursoTipo: 'SUBMENU',
        recursoId: submenuId,
        visualizar: true,
        criar: false,
        editar: false,
        excluir: false,
      });
      permissions.push(created);
      report.permissoes.criadas += 1;
      await this.record(actorSubject, 'PERMISSAO', created.id, 'SUBMENU');
    }
    const access = accesses.find((item) => item.usuarioId === usuarioId && item.sistemaId === sistemaId);
    if (access) {
      report.acessos.existentes += 1;
      return;
    }
    const created = await this.dependencies.accesses.add({ usuarioId, perfilId, sistemaId, status: statusFrom(statuses, source.statusId) });
    accesses.push(created);
    report.acessos.criadas += 1;
    await this.record(actorSubject, 'ACESSO', created.id, 'acesso');
  }

  private async record(subject: string | undefined, recursoTipo: AuditResource, recursoId: string, descricao: string) {
    if (!subject || !this.dependencies.audits) return;
    await this.dependencies.audits.record({ subject, acao: 'CRIAR', recursoTipo, recursoId, descricao });
  }
}

function systemOwners(catalog: LegacyCatalog): Map<number, number[]> {
  const owners = new Map<number, number[]>();
  for (const system of catalog.systems) {
    const linked = [...new Set(catalog.accesses.flatMap((access) => access.sistemaId === system.id && access.empresaId !== null ? [access.empresaId] : []))];
    const chosen = linked.length > 0 ? linked : catalog.companies.length === 1 && catalog.companies[0] ? [catalog.companies[0].id] : [];
    if (chosen.length === 0) throw new LegacySystemOwnerUnknownError();
    owners.set(system.id, chosen);
  }
  return owners;
}

function companyForUser(email: string, catalog: LegacyCatalog, companyIds: Map<number, string>): string | undefined {
  const linked = [...new Set(catalog.accesses.flatMap((access) => (access.email ?? '').trim().toLowerCase() === email && access.empresaId !== null ? [access.empresaId] : []))];
  const legacyId = linked.length === 1 ? linked[0] : linked.length === 0 && catalog.companies.length === 1 ? catalog.companies[0]?.id : undefined;
  return legacyId === undefined ? undefined : companyIds.get(legacyId);
}

function statusFrom(statuses: LegacyStatus[], statusId: number | null): CompanyStatus {
  const label = statuses.find((status) => status.id === statusId)?.nome ?? '';
  return label.trim().toLocaleLowerCase('pt-BR').startsWith('ativ') ? 'ATIVO' : 'INATIVO';
}

function pair(legacyId: number, parentId: string): string {
  return `${legacyId}:${parentId}`;
}

function sameLabel(left: string, right: string): boolean {
  return left.localeCompare(right, 'pt-BR', { sensitivity: 'accent' }) === 0;
}

function emptyCounts(): ImportCounts {
  return { criadas: 0, existentes: 0, ignoradas: 0 };
}

function emptyReport(senhasIgnoradas: number): LegacyImportReport {
  return {
    empresas: emptyCounts(),
    sistemas: emptyCounts(),
    modulos: emptyCounts(),
    menus: emptyCounts(),
    submenus: emptyCounts(),
    perfis: emptyCounts(),
    usuarios: emptyCounts(),
    permissoes: emptyCounts(),
    acessos: emptyCounts(),
    documentosIgnorados: 0,
    senhasIgnoradas,
  };
}
