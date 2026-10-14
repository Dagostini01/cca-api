import {
  emptyLegacyCatalog,
  type LegacyAccess,
  type LegacyCatalog,
  type LegacyCompany,
  type LegacyNode,
  type LegacyProfile,
  type LegacyStatus,
  type LegacyUser,
} from '../../domain/legacy-catalog.js';

const PASSWORD_TABLE = 't047_usuarios_senhas';

export function readLegacyDump(sql: string): LegacyCatalog {
  const catalog = emptyLegacyCatalog();
  const emailsByUserId = new Map<number, string | null>();
  const pendingAccesses: Array<{ columns: string[]; row: Array<string | null> }> = [];
  let cursor = 0;
  while (cursor < sql.length) {
    const start = sql.indexOf('INSERT INTO `', cursor);
    if (start === -1) break;
    const tableStart = start + 'INSERT INTO `'.length;
    const tableEnd = sql.indexOf('`', tableStart);
    if (tableEnd === -1) break;
    const table = sql.slice(tableStart, tableEnd);
    const columnsStart = sql.indexOf('(', tableEnd);
    const columnsEnd = sql.indexOf(')', columnsStart);
    const valuesAt = sql.indexOf('VALUES', columnsEnd);
    if (columnsStart === -1 || columnsEnd === -1 || valuesAt === -1) break;
    const columns = sql.slice(columnsStart + 1, columnsEnd).split(',').map((column) => column.trim().replaceAll('`', ''));
    const tuples = readTuples(sql, valuesAt + 'VALUES'.length);
    cursor = tuples.end;
    if (table === PASSWORD_TABLE) {
      catalog.senhasIgnoradas += tuples.rows.length;
      continue;
    }
    for (const row of tuples.rows) {
      if (table === 't052_usuarios_acessos') pendingAccesses.push({ columns, row });
      else absorb(catalog, table, columns, row, emailsByUserId);
    }
  }
  for (const pending of pendingAccesses) {
    const access = accessOf(pending.columns, pending.row, emailsByUserId);
    if (access) catalog.accesses.push(access);
  }
  return catalog;
}

function absorb(
  catalog: LegacyCatalog,
  table: string,
  columns: string[],
  row: Array<string | null>,
  emailsByUserId: Map<number, string | null>,
) {
  if (table === 't046_tp_status') {
    const status = statusOf(columns, row);
    if (status) catalog.statuses.push(status);
    return;
  }
  if (table === 't010_empresas') {
    const company = companyOf(columns, row);
    if (company) catalog.companies.push(company);
    return;
  }
  if (table === 't025_sistemas') {
    const system = nodeOf(columns, row, 'ID_SISTEMA', null, 'DS_SISTEMA');
    if (system) catalog.systems.push(system);
    return;
  }
  if (table === 't030_modulos') {
    const module = nodeOf(columns, row, 'ID_MODULO', 'ID_SISTEMA', 'DS_MODULO');
    if (module) catalog.modules.push(module);
    return;
  }
  if (table === 't035_menus') {
    const menu = nodeOf(columns, row, 'ID_MENU', 'ID_MODULO', 'DS_MENU');
    if (menu) catalog.menus.push(menu);
    return;
  }
  if (table === 't040_submenus') {
    const submenu = nodeOf(columns, row, 'ID_SUB_MENU', 'ID_MENU', 'DS_SUBMENU');
    if (submenu) catalog.submenus.push(submenu);
    return;
  }
  if (table === 't048_tp_usuarios') {
    const profile = profileOf(columns, row);
    if (profile) catalog.profiles.push(profile);
    return;
  }
  if (table === 't045_usuarios') {
    const user = userOf(columns, row);
    if (!user) return;
    catalog.users.push(user.publicUser);
    if (user.id !== null) emailsByUserId.set(user.id, user.publicUser.email);
  }
}

function statusOf(columns: string[], row: Array<string | null>): LegacyStatus | null {
  const id = integer(cell(columns, row, 'ID_TP_STATUS'));
  const nome = cell(columns, row, 'DS_STATUS')?.trim() ?? '';
  if (id === null || nome.length === 0) return null;
  return { id, nome };
}

function companyOf(columns: string[], row: Array<string | null>): LegacyCompany | null {
  const id = integer(cell(columns, row, 'ID_EMPRESA'));
  if (id === null) return null;
  const fantasia = cell(columns, row, 'DS_NM_FANTASIA')?.trim() ?? '';
  const razao = cell(columns, row, 'RAZAO_SOCIAL')?.trim() ?? '';
  return {
    id,
    nome: fantasia || razao,
    cnpj: cell(columns, row, 'CNPJ'),
    statusId: integer(cell(columns, row, 'ID_TP_STATUS')),
  };
}

function nodeOf(columns: string[], row: Array<string | null>, idColumn: string, parentColumn: string | null, nameColumn: string): LegacyNode | null {
  const id = integer(cell(columns, row, idColumn));
  if (id === null) return null;
  return {
    id,
    parentId: parentColumn ? integer(cell(columns, row, parentColumn)) : null,
    nome: cell(columns, row, nameColumn)?.trim() ?? '',
    statusId: integer(cell(columns, row, 'ID_TP_STATUS')),
  };
}

function profileOf(columns: string[], row: Array<string | null>): LegacyProfile | null {
  const id = integer(cell(columns, row, 'ID_TP_USUARIO'));
  if (id === null) return null;
  return {
    id,
    nome: cell(columns, row, 'DS_TP_USUARIO')?.trim() ?? '',
    statusId: integer(cell(columns, row, 'ID_TP_STATUS')),
  };
}

function userOf(columns: string[], row: Array<string | null>): { id: number | null; publicUser: LegacyUser } | null {
  const nome = `${cell(columns, row, 'DS_NM_USUARIO') ?? ''} ${cell(columns, row, 'DS_SOBRENOME') ?? ''}`.trim();
  if (nome.length === 0) return null;
  return {
    id: integer(cell(columns, row, 'ID_USUARIO')),
    publicUser: {
      nome,
      email: emptyToNull(cell(columns, row, 'DS_EMAIL')),
      statusId: integer(cell(columns, row, 'ID_TP_STATUS')),
      perfilId: integer(cell(columns, row, 'ID_TP_USUARIO')),
    },
  };
}

function accessOf(columns: string[], row: Array<string | null>, emailsByUserId: Map<number, string | null>): LegacyAccess | null {
  const userId = integer(cell(columns, row, 'ID_USUARIO'));
  return {
    email: userId === null ? null : emailsByUserId.get(userId) ?? null,
    empresaId: integer(cell(columns, row, 'ID_EMPRESA')),
    sistemaId: integer(cell(columns, row, 'ID_SISTEMA')),
    submenuId: integer(cell(columns, row, 'ID_SUB_MENU')),
    perfilId: integer(cell(columns, row, 'ID_TP_USUARIO')),
    statusId: integer(cell(columns, row, 'ID_TP_STATUS')),
  };
}

function cell(columns: string[], row: Array<string | null>, name: string): string | null {
  const index = columns.indexOf(name);
  if (index < 0) return null;
  return row[index] ?? null;
}

function integer(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function emptyToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

function readTuples(sql: string, start: number): { rows: Array<Array<string | null>>; end: number } {
  const rows: Array<Array<string | null>> = [];
  let index = start;
  while (index < sql.length) {
    index = skipSpace(sql, index);
    if (sql[index] !== '(') break;
    index += 1;
    const row: Array<string | null> = [];
    while (index < sql.length) {
      index = skipSpace(sql, index);
      if (sql[index] === ')') {
        index += 1;
        break;
      }
      const cellValue = readCell(sql, index);
      row.push(cellValue.value);
      index = skipSpace(sql, cellValue.end);
      if (sql[index] === ',') {
        index += 1;
        continue;
      }
      if (sql[index] === ')') {
        index += 1;
        break;
      }
      break;
    }
    rows.push(row);
    index = skipSpace(sql, index);
    if (sql[index] === ',') {
      index += 1;
      continue;
    }
    if (sql[index] === ';') {
      index += 1;
      break;
    }
    break;
  }
  return { rows, end: index };
}

function readCell(sql: string, start: number): { value: string | null; end: number } {
  if (sql.startsWith('NULL', start) && !/[A-Za-z0-9_]/.test(sql[start + 4] ?? '')) return { value: null, end: start + 4 };
  if (sql[start] !== "'") {
    let index = start;
    while (index < sql.length && sql[index] !== ',' && sql[index] !== ')') index += 1;
    return { value: sql.slice(start, index).trim(), end: index };
  }
  let index = start + 1;
  let value = '';
  while (index < sql.length) {
    if (sql[index] === "'" && sql[index + 1] === "'") {
      value += "'";
      index += 2;
      continue;
    }
    if (sql[index] === '\\') {
      value += sql[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (sql[index] === "'") return { value, end: index + 1 };
    value += sql[index];
    index += 1;
  }
  return { value, end: index };
}

function skipSpace(sql: string, index: number): number {
  while (index < sql.length && /\s/.test(sql[index] ?? '')) index += 1;
  return index;
}
