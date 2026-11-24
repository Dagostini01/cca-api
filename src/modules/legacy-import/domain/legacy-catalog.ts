export type LegacyStatus = {
  id: number;
  nome: string;
};

export type LegacyCompany = {
  id: number;
  nome: string;
  cnpj: string | null;
  statusId: number | null;
};

export type LegacyNode = {
  id: number;
  parentId: number | null;
  nome: string;
  statusId: number | null;
};

export type LegacyProfile = {
  id: number;
  nome: string;
  statusId: number | null;
};

export type LegacyUser = {
  nome: string;
  email: string | null;
  statusId: number | null;
  perfilId: number | null;
};

export type LegacyAccess = {
  email: string | null;
  empresaId: number | null;
  sistemaId: number | null;
  submenuId: number | null;
  perfilId: number | null;
  statusId: number | null;
};

export type LegacyCatalog = {
  statuses: LegacyStatus[];
  companies: LegacyCompany[];
  systems: LegacyNode[];
  modules: LegacyNode[];
  menus: LegacyNode[];
  submenus: LegacyNode[];
  profiles: LegacyProfile[];
  users: LegacyUser[];
  accesses: LegacyAccess[];
  senhasIgnoradas: number;
};

export type ImportCounts = {
  criadas: number;
  existentes: number;
  ignoradas: number;
};

export type LegacyImportReport = {
  empresas: ImportCounts;
  sistemas: ImportCounts;
  modulos: ImportCounts;
  menus: ImportCounts;
  submenus: ImportCounts;
  usuarios: ImportCounts;
  acessos: ImportCounts;
  documentosIgnorados: number;
  senhasIgnoradas: number;
};

export function emptyLegacyCatalog(): LegacyCatalog {
  return {
    statuses: [],
    companies: [],
    systems: [],
    modules: [],
    menus: [],
    submenus: [],
    profiles: [],
    users: [],
    accesses: [],
    senhasIgnoradas: 0,
  };
}
