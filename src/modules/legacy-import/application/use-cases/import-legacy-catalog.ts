import type { AccessRepository } from '../../../accesses/application/ports/access-repository.js';
import type { ScreenAccess } from '../../../accesses/domain/access.js';
import type { AuditRecorder } from '../../../audits/application/ports/audit-recorder.js';
import type { AuditResource } from '../../../audits/domain/audit.js';
import type { CompanyRepository } from '../../../companies/application/ports/company-repository.js';
import { normalizeCnpj, normalizeCompanyName, type Company, type CompanyStatus } from '../../../companies/domain/company.js';
import { InvalidCompanyDocumentError, InvalidCompanyNameError } from '../../../companies/domain/company-errors.js';
import type { MenuRepository } from '../../../menus/application/ports/menu-repository.js';
import { menuNamesConflict, normalizeMenuName, type Menu } from '../../../menus/domain/menu.js';
import { InvalidMenuNameError } from '../../../menus/domain/menu-errors.js';
import type { ModuleRepository } from '../../../system-modules/application/ports/module-repository.js';
import { moduleNamesConflict, normalizeModuleName, type Module } from '../../../system-modules/domain/module.js';
import { InvalidModuleNameError } from '../../../system-modules/domain/module-errors.js';
import type { SubmenuRepository } from '../../../submenus/application/ports/submenu-repository.js';
import { normalizeSubmenuName, submenuNamesConflict, type Submenu } from '../../../submenus/domain/submenu.js';
import { InvalidSubmenuNameError } from '../../../submenus/domain/submenu-errors.js';
import type { SystemRepository } from '../../../systems/application/ports/system-repository.js';
import { normalizeSystemName, systemNamesConflict, type System } from '../../../systems/domain/system.js';
import { InvalidSystemNameError } from '../../../systems/domain/system-errors.js';
import type { UserType } from '../../../../shared/catalog/status.js';
import type { IdentityDirectory } from '../../../users/application/ports/identity-directory.js';
import type { UserRepository } from '../../../users/application/ports/user-repository.js';
import { normalizeKeycloakSubject, normalizeUserEmail, normalizeUserName } from '../../../users/domain/user.js';
import { InvalidUserEmailError, InvalidUserNameError, InvalidUserSubjectError } from '../../../users/domain/user-errors.js';
import type { ImportCounts, LegacyCatalog, LegacyImportReport, LegacyNode, LegacyStatus } from '../../domain/legacy-catalog.js';

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
  users?: UserRepository;
  accesses?: AccessRepository;
  directory?: IdentityDirectory;
  audits?: AuditRecorder;
};

type Named = { id: number; nome: string };

export class ImportLegacyCatalog {
  constructor(private readonly dependencies: ImportLegacyCatalogDependencies) {}

  async execute(catalog: LegacyCatalog, actorSubject?: string, links: LegacySubjectLink[] = []): Promise<LegacyImportReport> {
    const report = emptyReport(catalog.senhasIgnoradas);
    const companies = await this.dependencies.companies.list();
    const companyIds = new Map<number, number>();
    for (const source of catalog.companies) {
      const placed = await this.placeCompany(source, catalog.statuses, companies, report, actorSubject);
      if (placed) companyIds.set(source.id, placed.id);
    }

    const systems = await this.dependencies.systems.list();
    const systemIds = new Map<number, number>();
    for (const source of catalog.systems) {
      const placed = await this.placeNode(source, null, catalog.statuses, systems, report.sistemas, 'SISTEMA', actorSubject, {
        normalize: normalizeSystemName,
        invalid: InvalidSystemNameError,
        conflicts: systemNamesConflict,
        parentId: () => null,
        add: (nome, status) => this.dependencies.systems.add({ nome, descricaoCurta: null, descricaoLonga: null, status }),
      });
      if (placed) systemIds.set(source.id, placed.id);
    }

    const modules = await this.dependencies.modules.list();
    const moduleIds = await this.placeChildren(catalog.modules, catalog.statuses, systemIds, modules, report.modulos, 'MODULO', actorSubject, {
      normalize: normalizeModuleName,
      invalid: InvalidModuleNameError,
      conflicts: moduleNamesConflict,
      parentId: (item) => item.sistemaId,
      add: (parentId, nome, status) => this.dependencies.modules.add({ sistemaId: parentId, nome, descricaoCurta: null, descricaoLonga: null, status }),
    });
    const menus = await this.dependencies.menus.list();
    const menuIds = await this.placeChildren(catalog.menus, catalog.statuses, moduleIds, menus, report.menus, 'MENU', actorSubject, {
      normalize: normalizeMenuName,
      invalid: InvalidMenuNameError,
      conflicts: menuNamesConflict,
      parentId: (item) => item.moduloId,
      add: (parentId, nome, status) => this.dependencies.menus.add({ moduloId: parentId, nome, descricaoCurta: null, descricaoLonga: null, status }),
    });
    const submenus = await this.dependencies.submenus.list();
    const submenuIds = await this.placeChildren(catalog.submenus, catalog.statuses, menuIds, submenus, report.submenus, 'SUBMENU', actorSubject, {
      normalize: normalizeSubmenuName,
      invalid: InvalidSubmenuNameError,
      conflicts: submenuNamesConflict,
      parentId: (item) => item.menuId,
      add: (parentId, nome, status) => this.dependencies.submenus.add({ menuId: parentId, nome, descricaoCurta: null, descricaoLonga: null, status }),
    });

    const actor = actorSubject && this.dependencies.users ? await this.dependencies.users.findBySubject(actorSubject) : null;
    const userIds = new Map<string, number>();
    for (const source of catalog.users) {
      const placed = await this.placeUser(source, catalog, links, report, actorSubject, actor?.id ?? null);
      if (placed && source.email) userIds.set(source.email.trim().toLowerCase(), placed.id);
    }

    if (this.dependencies.accesses) {
      const accesses = await this.dependencies.accesses.list();
      for (const source of catalog.accesses) {
        await this.placeAccess(source, catalog, companyIds, systemIds, moduleIds, menuIds, submenuIds, userIds, accesses, report, actorSubject);
      }
    } else {
      report.acessos.ignoradas += catalog.accesses.length;
    }
    return report;
  }

  private async placeCompany(source: LegacyCatalog['companies'][number], statuses: LegacyStatus[], companies: Company[], report: LegacyImportReport, actorSubject?: string): Promise<{ id: number } | null> {
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
    const existing = companies.find((company) => (cnpj !== null && company.cnpj === cnpj) || sameLabel(company.razaoSocial, nome));
    if (existing) {
      report.empresas.existentes += 1;
      return existing;
    }
    const created = await this.dependencies.companies.add({
      razaoSocial: nome,
      nomeFantasia: null,
      nomeReduzido: null,
      cnpj,
      dataConstituicao: null,
      status: statusFrom(statuses, source.statusId),
    });
    companies.push(created);
    report.empresas.criadas += 1;
    await this.record(actorSubject, 'EMPRESA', created.id, created.razaoSocial);
    return created;
  }

  private async placeNode<T extends Named>(
    source: LegacyNode,
    parentId: number | null,
    statuses: LegacyStatus[],
    current: T[],
    counts: ImportCounts,
    resource: AuditResource,
    actorSubject: string | undefined,
    behavior: {
      normalize: (nome: string) => string;
      invalid: new () => Error;
      conflicts: (left: string, right: string) => boolean;
      parentId: (item: T) => number | null;
      add: (nome: string, status: CompanyStatus) => Promise<T>;
    },
  ): Promise<Named | null> {
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

  private async placeChildren<T extends Named>(
    sources: LegacyNode[],
    statuses: LegacyStatus[],
    parents: Map<number, number>,
    current: T[],
    counts: ImportCounts,
    resource: AuditResource,
    actorSubject: string | undefined,
    behavior: {
      normalize: (nome: string) => string;
      invalid: new () => Error;
      conflicts: (left: string, right: string) => boolean;
      parentId: (item: T) => number | null;
      add: (parentId: number, nome: string, status: CompanyStatus) => Promise<T>;
    },
  ): Promise<Map<number, number>> {
    const ids = new Map<number, number>();
    for (const source of sources) {
      const parentId = source.parentId === null ? undefined : parents.get(source.parentId);
      if (parentId === undefined) {
        counts.ignoradas += 1;
        continue;
      }
      const placed = await this.placeNode(source, parentId, statuses, current, counts, resource, actorSubject, {
        ...behavior,
        add: (nome, status) => behavior.add(parentId, nome, status),
      });
      if (placed) ids.set(source.id, placed.id);
    }
    return ids;
  }

  private async placeUser(
    source: LegacyCatalog['users'][number],
    catalog: LegacyCatalog,
    links: LegacySubjectLink[],
    report: LegacyImportReport,
    actorSubject: string | undefined,
    criadoPorId: number | null,
  ): Promise<Named | null> {
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
    const existing = await this.dependencies.users.findByEmail(email);
    if (existing) {
      report.usuarios.existentes += 1;
      return existing;
    }
    const status = statusFrom(catalog.statuses, source.statusId);
    const linked = links.find((link) => link.email.trim().toLowerCase() === email);
    let keycloakSub: string | null = null;
    try {
      if (linked) {
        keycloakSub = normalizeKeycloakSubject(linked.keycloakSub);
        if (this.dependencies.directory) await this.dependencies.directory.assertExists(keycloakSub);
      } else if (this.dependencies.directory) {
        const provisioned = await this.dependencies.directory.provision({ nome, email, enabled: status === 'ATIVADO' });
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
    const created = await this.dependencies.users.add({
      keycloakSub,
      nome,
      sobrenome: null,
      apelido: null,
      rg: null,
      cpf: null,
      email,
      celular: null,
      tipo: userTypeFrom(catalog, source.perfilId),
      status,
      criadoPorId,
    });
    report.usuarios.criadas += 1;
    await this.record(actorSubject, 'USUARIO', created.id, created.nome);
    return created;
  }

  private async placeAccess(
    source: LegacyCatalog['accesses'][number],
    catalog: LegacyCatalog,
    companyIds: Map<number, number>,
    systemIds: Map<number, number>,
    moduleIds: Map<number, number>,
    menuIds: Map<number, number>,
    submenuIds: Map<number, number>,
    userIds: Map<string, number>,
    accesses: ScreenAccess[],
    report: LegacyImportReport,
    actorSubject?: string,
  ) {
    const submenu = source.submenuId === null ? undefined : catalog.submenus.find((item) => item.id === source.submenuId);
    const menu = submenu?.parentId == null ? undefined : catalog.menus.find((item) => item.id === submenu.parentId);
    const module = menu?.parentId == null ? undefined : catalog.modules.find((item) => item.id === menu.parentId);
    const empresaId = source.empresaId === null ? undefined : companyIds.get(source.empresaId);
    const sistemaId = source.sistemaId === null ? undefined : systemIds.get(source.sistemaId);
    const moduloId = module ? moduleIds.get(module.id) : undefined;
    const menuId = menu ? menuIds.get(menu.id) : undefined;
    const submenuId = submenu ? submenuIds.get(submenu.id) : undefined;
    const usuarioId = source.email ? userIds.get(source.email.trim().toLowerCase()) : undefined;
    const chainMatches = module?.parentId === source.sistemaId;
    if (!this.dependencies.accesses || !usuarioId || !empresaId || !sistemaId || !moduloId || !menuId || !submenuId || !chainMatches) {
      report.acessos.ignoradas += 1;
      return;
    }
    await this.dependencies.systems.linkCompany(sistemaId, empresaId);
    const existing = accesses.find((item) => item.usuarioId === usuarioId && item.submenuId === submenuId);
    if (existing) {
      report.acessos.existentes += 1;
      return;
    }
    const created = await this.dependencies.accesses.add({
      usuarioId,
      empresaId,
      sistemaId,
      moduloId,
      menuId,
      submenuId,
      tipo: userTypeFrom(catalog, source.perfilId),
      status: statusFrom(catalog.statuses, source.statusId),
    });
    accesses.push(created);
    report.acessos.criadas += 1;
    await this.record(actorSubject, 'ACESSO', created.id, 'acesso');
  }

  private async record(subject: string | undefined, recursoTipo: AuditResource, recursoId: number, descricao: string) {
    if (!subject || !this.dependencies.audits) return;
    await this.dependencies.audits.record({ subject, acao: 'CRIAR', recursoTipo, recursoId, descricao });
  }
}

function userTypeFrom(catalog: LegacyCatalog, perfilId: number | null): UserType {
  const nome = catalog.profiles.find((profile) => profile.id === perfilId)?.nome ?? '';
  return nome.trim().toLocaleUpperCase('pt-BR').startsWith('ADMIN') ? 'ADMINITRADOR' : 'SUPERVISOR';
}

function statusFrom(statuses: LegacyStatus[], statusId: number | null): CompanyStatus {
  const label = statuses.find((status) => status.id === statusId)?.nome ?? '';
  return label.trim().toLocaleLowerCase('pt-BR').startsWith('ativ') ? 'ATIVADO' : 'DESATIVADO';
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
    usuarios: emptyCounts(),
    acessos: emptyCounts(),
    documentosIgnorados: 0,
    senhasIgnoradas,
  };
}
