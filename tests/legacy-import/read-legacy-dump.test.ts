import { describe, expect, it } from 'vitest';
import { readLegacyDump } from '../../src/modules/legacy-import/adapters/outbound/read-legacy-dump.js';

const dump = `
INSERT INTO \`t046_tp_status\` (\`ID_TP_STATUS\`, \`DS_STATUS\`) VALUES
	(1, 'ATIVADO');
INSERT INTO \`t010_empresas\` (\`ID_EMPRESA\`, \`RAZAO_SOCIAL\`, \`DS_NM_FANTASIA\`, \`CNPJ\`, \`ID_TP_STATUS\`) VALUES
	(1, 'RAZAO', 'Casa', '0', 1);
INSERT INTO \`t025_sistemas\` (\`ID_SISTEMA\`, \`DS_SISTEMA\`, \`ID_TP_STATUS\`) VALUES
	(1, 'Portal', 1);
INSERT INTO \`t030_modulos\` (\`ID_MODULO\`, \`ID_SISTEMA\`, \`DS_MODULO\`, \`ID_TP_STATUS\`) VALUES
	(1, 1, 'Operacao', 1);
INSERT INTO \`t035_menus\` (\`ID_MENU\`, \`ID_MODULO\`, \`DS_MENU\`, \`ID_TP_STATUS\`) VALUES
	(4, 1, 'Logistica', 1);
INSERT INTO \`t040_submenus\` (\`ID_SUB_MENU\`, \`ID_MENU\`, \`DS_SUBMENU\`, \`ID_TP_STATUS\`) VALUES
	(1, 4, 'Documento', 1);
INSERT INTO \`t048_tp_usuarios\` (\`ID_TP_USUARIO\`, \`DS_TP_USUARIO\`, \`ID_TP_STATUS\`) VALUES
	(1, 'Supervisor', 1);
INSERT INTO \`t045_usuarios\` (\`ID_USUARIO\`, \`DS_NM_USUARIO\`, \`DS_SOBRENOME\`, \`RG\`, \`CPF\`, \`DS_EMAIL\`, \`CELULAR\`, \`ID_TP_USUARIO\`, \`ID_TP_STATUS\`) VALUES
	(1, 'Ana', 'Costa', 'rg-must-not-leak', 'cpf-must-not-leak', NULL, '11999999999', 1, 1);
INSERT INTO \`t047_usuarios_senhas\` (\`ID_USUARIO_SENHA\`, \`ID_USUARIO\`, \`DS_SENHA\`, \`HASH\`, \`ID_TP_STATUS\`) VALUES
	(3, 1, 'secret-must-not-leak', 'hash-must-not-leak', 1);
INSERT INTO \`t052_usuarios_acessos\` (\`ID_USUARIO\`, \`ID_EMPRESA\`, \`ID_SISTEMA\`, \`ID_SUB_MENU\`, \`ID_TP_USUARIO\`, \`ID_TP_STATUS\`) VALUES
	(1, 1, 1, 1, 1, 1);
`;

describe('legacy dump reader', () => {
  it('keeps the catalog and drops password, RG and CPF', () => {
    const catalog = readLegacyDump(dump);
    const serialized = JSON.stringify(catalog);

    expect(serialized).not.toContain('secret-must-not-leak');
    expect(serialized).not.toContain('hash-must-not-leak');
    expect(serialized).not.toContain('rg-must-not-leak');
    expect(serialized).not.toContain('cpf-must-not-leak');
    expect(serialized).not.toContain('11999999999');
    expect(catalog.senhasIgnoradas).toBe(1);
    expect(catalog.companies).toEqual([{ id: 1, nome: 'Casa', cnpj: '0', statusId: 1 }]);
    expect(catalog.systems).toEqual([{ id: 1, parentId: null, nome: 'Portal', statusId: 1 }]);
    expect(catalog.modules[0]).toMatchObject({ id: 1, parentId: 1, nome: 'Operacao' });
    expect(catalog.menus[0]).toMatchObject({ parentId: 1, nome: 'Logistica' });
    expect(catalog.submenus[0]).toMatchObject({ parentId: 4, nome: 'Documento' });
    expect(catalog.profiles).toEqual([{ id: 1, nome: 'Supervisor', statusId: 1 }]);
    expect(catalog.users).toEqual([{ nome: 'Ana Costa', email: null, statusId: 1, perfilId: 1 }]);
    expect(catalog.accesses).toEqual([{
      email: null,
      empresaId: 1,
      sistemaId: 1,
      submenuId: 1,
      perfilId: 1,
      statusId: 1,
    }]);
  });
});
