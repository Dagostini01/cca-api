import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { companyIdParamsSchema, companyListQuerySchema, companyResponseSchema, createCompanyBodySchema, updateCompanyBodySchema } from '../../modules/companies/adapters/inbound/http/company-schemas.js';
import { createSystemBodySchema, systemIdParamsSchema, systemListQuerySchema, systemResponseSchema, updateSystemBodySchema } from '../../modules/systems/adapters/inbound/http/system-schemas.js';
import { createModuleBodySchema, listModulesQuerySchema, moduleIdParamsSchema, moduleResponseSchema, updateModuleBodySchema } from '../../modules/system-modules/adapters/inbound/http/module-schemas.js';
import { createMenuBodySchema, listMenusQuerySchema, menuIdParamsSchema, menuResponseSchema, updateMenuBodySchema } from '../../modules/menus/adapters/inbound/http/menu-schemas.js';
import { createSubmenuBodySchema, listSubmenusQuerySchema, submenuIdParamsSchema, submenuResponseSchema, updateSubmenuBodySchema } from '../../modules/submenus/adapters/inbound/http/submenu-schemas.js';
import { createUserBodySchema, screenViewSchema, updateUserBodySchema, userIdParamsSchema, userListQuerySchema, userPageSchema, userResponseSchema } from '../../modules/users/adapters/inbound/http/user-schemas.js';
import { accessIdParamsSchema, accessPageSchema, accessResponseSchema, createAccessBodySchema, listAccessesQuerySchema, updateAccessBodySchema } from '../../modules/accesses/adapters/inbound/http/access-schemas.js';
import { auditIdParamsSchema, auditResponseSchema, listAuditsQuerySchema } from '../../modules/audits/adapters/inbound/http/audit-schemas.js';
import { importLegacyBodySchema, legacyImportReportSchema } from '../../modules/legacy-import/adapters/inbound/http/legacy-import-schemas.js';

const errorSchema = z.object({
  error: z.string(),
});

const validationIssueSchema = z.object({
  path: z.string(),
  code: z.string(),
  keys: z.array(z.string()).optional(),
});

const validationErrorSchema = z.object({
  error: z.literal('validation_error'),
  issues: z.array(validationIssueSchema),
});

const healthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('cca-api'),
});

const currentUserSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  email: z.string().optional(),
});

const bearerAuth = [{ bearerAuth: [] }];

function json(schema: z.ZodTypeAny) {
  return { 'application/json': { schema } };
}

function registerOwnedResource(registry: OpenAPIRegistry, resource: {
  collectionPath: string;
  tag: string;
  noun: string;
  parentField: string;
  parentNotFound: string;
  notFound: string;
  conflict: string;
  createBody: z.ZodTypeAny;
  updateBody: z.ZodTypeAny;
  params: z.AnyZodObject;
  query: z.AnyZodObject;
  response: z.ZodTypeAny;
}) {
  const authErrors = {
    400: { description: 'validation_error', content: json(validationErrorSchema) },
    401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
    403: { description: 'forbidden', content: json(errorSchema) },
    503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
  };
  const itemPath = `${resource.collectionPath}/{id}`;

  registry.registerPath({
    method: 'post',
    path: resource.collectionPath,
    tags: [resource.tag],
    summary: `Cria um ${resource.noun} ligado ao ${resource.parentField}`,
    description: `O pai é obrigatório e precisa existir. O nome é único dentro do ${resource.parentField}. Sem status, o padrão é ATIVADO. Exige administrador.`,
    security: bearerAuth,
    request: { body: { required: true, content: json(resource.createBody) } },
    responses: {
      201: { description: `${resource.noun} criado`, content: json(resource.response) },
      ...authErrors,
      404: { description: resource.parentNotFound, content: json(errorSchema) },
      409: { description: resource.conflict, content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: resource.collectionPath,
    tags: [resource.tag],
    summary: `Lista ${resource.tag.toLowerCase()}`,
    description: `Catálogo global para o administrador. O parâmetro do ${resource.parentField} restringe o pai. q procura no nome, na descrição e na cadeia acima. Com pagina, a resposta é uma página.`,
    security: bearerAuth,
    request: { query: resource.query },
    responses: {
      200: { description: 'Registros ordenados por nome', content: json(z.array(resource.response)) },
      ...authErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: itemPath,
    tags: [resource.tag],
    summary: `Consulta um ${resource.noun}`,
    security: bearerAuth,
    request: { params: resource.params },
    responses: {
      200: { description: `${resource.noun} encontrado`, content: json(resource.response) },
      ...authErrors,
      404: { description: resource.notFound, content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: itemPath,
    tags: [resource.tag],
    summary: `Atualiza um ${resource.noun}`,
    description: `Informe ao menos um campo. Trocar o pai move o registro para outro ${resource.parentField} existente. A exclusão é a rota DELETE.`,
    security: bearerAuth,
    request: {
      params: resource.params,
      body: { required: true, content: json(resource.updateBody) },
    },
    responses: {
      200: { description: `${resource.noun} atualizado`, content: json(resource.response) },
      ...authErrors,
      404: { description: `${resource.notFound} ou ${resource.parentNotFound}`, content: json(errorSchema) },
      409: { description: resource.conflict, content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: itemPath,
    tags: [resource.tag],
    summary: `Exclui um ${resource.noun}`,
    description: 'A exclusão remove o registro quando ele não tem filhos nem tela apontando para ele. Com vínculo, a resposta é 409 delete_restricted.',
    security: bearerAuth,
    request: { params: resource.params },
    responses: {
      204: { description: 'Registro excluído' },
      ...authErrors,
      404: { description: resource.notFound, content: json(errorSchema) },
      409: { description: 'delete_restricted', content: json(errorSchema) },
    },
  });
}

const authErrors = {
  400: { description: 'validation_error', content: json(validationErrorSchema) },
  401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
  403: { description: 'forbidden', content: json(errorSchema) },
  503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
};

export function createOpenApiDocument() {
  extendZodWithOpenApi(z);
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Access token do Keycloak com audiência cca-api. O login não faz parte desta API.',
  });

  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Saúde'],
    summary: 'Disponibilidade do processo',
    responses: {
      200: { description: 'Processo no ar. Não consulta MySQL nem Keycloak.', content: json(healthSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/me',
    tags: ['Identidade'],
    summary: 'Usuário do access token',
    security: bearerAuth,
    responses: {
      200: { description: 'Claims já verificadas. Não consulta cadastro local.', content: json(currentUserSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/empresas',
    tags: ['Empresas'],
    summary: 'Cria uma empresa',
    description: 'CNPJ é opcional. Quando informado, a API valida os dígitos e grava somente os 14 números. Sem status, o padrão é ATIVADO. Exige administrador.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createCompanyBodySchema) } },
    responses: {
      201: { description: 'Empresa criada', content: json(companyResponseSchema) },
      ...authErrors,
      409: { description: 'company_document_conflict', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/empresas',
    tags: ['Empresas'],
    summary: 'Lista empresas',
    description: 'Sem pagina, devolve a lista inteira. q filtra razão social, nome fantasia, CNPJ e o sistema ligado. Com pagina, a resposta traz itens, total, pagina e tamanho.',
    security: bearerAuth,
    request: { query: companyListQuerySchema },
    responses: {
      200: { description: 'Empresas ordenadas por razão social', content: json(z.array(companyResponseSchema)) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/empresas/{id}',
    tags: ['Empresas'],
    summary: 'Consulta uma empresa',
    security: bearerAuth,
    request: { params: companyIdParamsSchema },
    responses: {
      200: { description: 'Empresa encontrada', content: json(companyResponseSchema) },
      ...authErrors,
      404: { description: 'company_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/v1/empresas/{id}',
    tags: ['Empresas'],
    summary: 'Atualiza uma empresa',
    description: 'Informe ao menos um campo. cnpj nulo remove o documento. A exclusão é a rota DELETE.',
    security: bearerAuth,
    request: { params: companyIdParamsSchema, body: { required: true, content: json(updateCompanyBodySchema) } },
    responses: {
      200: { description: 'Empresa atualizada', content: json(companyResponseSchema) },
      ...authErrors,
      404: { description: 'company_not_found', content: json(errorSchema) },
      409: { description: 'company_document_conflict', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/v1/empresas/{id}',
    tags: ['Empresas'],
    summary: 'Exclui uma empresa',
    description: 'Remove a empresa quando ela não tem endereço, contato nem tela. Com vínculo, a resposta é 409 delete_restricted.',
    security: bearerAuth,
    request: { params: companyIdParamsSchema },
    responses: {
      204: { description: 'Empresa excluída' },
      ...authErrors,
      404: { description: 'company_not_found', content: json(errorSchema) },
      409: { description: 'delete_restricted', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/sistemas',
    tags: ['Sistemas'],
    summary: 'Cria um sistema',
    description: 'O nome é único no catálogo. empresaIds é obrigatório e liga o sistema às empresas donas; só essas empresas podem receber telas dele. Sem status, o padrão é ATIVADO. Exige administrador.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createSystemBodySchema) } },
    responses: {
      201: { description: 'Sistema criado', content: json(systemResponseSchema) },
      ...authErrors,
      404: { description: 'company_not_found', content: json(errorSchema) },
      409: { description: 'system_name_conflict', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/sistemas',
    tags: ['Sistemas'],
    summary: 'Lista sistemas',
    description: 'empresaId restringe às empresas ligadas. q procura no nome, na descrição e na empresa. Com pagina, a resposta é uma página.',
    security: bearerAuth,
    request: { query: systemListQuerySchema },
    responses: {
      200: { description: 'Sistemas ordenados por nome', content: json(z.array(systemResponseSchema)) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/sistemas/{id}',
    tags: ['Sistemas'],
    summary: 'Consulta um sistema',
    security: bearerAuth,
    request: { params: systemIdParamsSchema },
    responses: {
      200: { description: 'Sistema encontrado', content: json(systemResponseSchema) },
      ...authErrors,
      404: { description: 'system_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/v1/sistemas/{id}',
    tags: ['Sistemas'],
    summary: 'Atualiza um sistema',
    description: 'Informe ao menos um campo. empresaIds substitui as empresas ligadas; tirar uma empresa que ainda tem tela desse sistema devolve 409 system_company_in_use. A exclusão é a rota DELETE.',
    security: bearerAuth,
    request: { params: systemIdParamsSchema, body: { required: true, content: json(updateSystemBodySchema) } },
    responses: {
      200: { description: 'Sistema atualizado', content: json(systemResponseSchema) },
      ...authErrors,
      404: { description: 'system_not_found ou company_not_found', content: json(errorSchema) },
      409: { description: 'system_name_conflict ou system_company_in_use', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/v1/sistemas/{id}',
    tags: ['Sistemas'],
    summary: 'Exclui um sistema',
    description: 'Remove o sistema quando ele não tem módulo nem tela. Com vínculo, a resposta é 409 delete_restricted.',
    security: bearerAuth,
    request: { params: systemIdParamsSchema },
    responses: {
      204: { description: 'Sistema excluído' },
      ...authErrors,
      404: { description: 'system_not_found', content: json(errorSchema) },
      409: { description: 'delete_restricted', content: json(errorSchema) },
    },
  });

  registerOwnedResource(registry, {
    collectionPath: '/v1/modulos',
    tag: 'Módulos',
    noun: 'módulo',
    parentField: 'sistema',
    parentNotFound: 'system_not_found',
    notFound: 'module_not_found',
    conflict: 'module_name_conflict',
    createBody: createModuleBodySchema,
    updateBody: updateModuleBodySchema,
    params: moduleIdParamsSchema,
    query: listModulesQuerySchema,
    response: moduleResponseSchema,
  });

  registerOwnedResource(registry, {
    collectionPath: '/v1/menus',
    tag: 'Menus',
    noun: 'menu',
    parentField: 'módulo',
    parentNotFound: 'module_not_found',
    notFound: 'menu_not_found',
    conflict: 'menu_name_conflict',
    createBody: createMenuBodySchema,
    updateBody: updateMenuBodySchema,
    params: menuIdParamsSchema,
    query: listMenusQuerySchema,
    response: menuResponseSchema,
  });

  registerOwnedResource(registry, {
    collectionPath: '/v1/submenus',
    tag: 'Submenus',
    noun: 'submenu',
    parentField: 'menu',
    parentNotFound: 'menu_not_found',
    notFound: 'submenu_not_found',
    conflict: 'submenu_name_conflict',
    createBody: createSubmenuBodySchema,
    updateBody: updateSubmenuBodySchema,
    params: submenuIdParamsSchema,
    query: listSubmenusQuerySchema,
    response: submenuResponseSchema,
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/usuarios',
    tags: ['Usuários'],
    summary: 'Cria um usuário e as telas dele',
    description: 'Grava a pessoa e, na mesma transação, uma linha de acesso por tela. E-mail presente cria o usuário no Keycloak sem senha. keycloakSub é opcional e não é obrigatório no corpo. Exige administrador. Enquanto não existir administrador, um token válido cria o primeiro.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createUserBodySchema) } },
    responses: {
      201: { description: 'Usuário criado', content: json(userResponseSchema) },
      ...authErrors,
      404: { description: 'company_not_found, system_not_found, module_not_found, menu_not_found ou submenu_not_found', content: json(errorSchema) },
      409: { description: 'user_email_conflict, user_subject_conflict, identity_email_conflict ou access_conflict', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/usuarios/eu',
    tags: ['Usuários'],
    summary: 'Usuário local do token',
    security: bearerAuth,
    responses: {
      200: { description: 'Cadastro local do subject', content: json(userResponseSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      404: { description: 'user_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/usuarios',
    tags: ['Usuários'],
    summary: 'Lista uma página dos usuários criados pelo administrador',
    description: 'Filtros q, tipo e status. pagina começa em 1 e tamanho vai de 1 a 50. A resposta traz itens, total, pagina e tamanho.',
    security: bearerAuth,
    request: { query: userListQuerySchema },
    responses: {
      200: { description: 'Somente quem tem ID_USUARIO_INCLUSAO igual ao administrador logado', content: json(userPageSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/usuarios/{id}/telas',
    tags: ['Usuários'],
    summary: 'Telas que o usuário pode abrir',
    description: 'O mesmo recorte da consulta de acesso: sistema, módulo, menu e submenu. O próprio usuário ativo lê as suas. O administrador que o criou também.',
    security: bearerAuth,
    request: { params: userIdParamsSchema },
    responses: {
      200: { description: 'Telas ativas', content: json(z.array(screenViewSchema)) },
      ...authErrors,
      404: { description: 'user_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/usuarios/{id}/codigo-acesso',
    tags: ['Usuários'],
    summary: 'Gera o código de primeiro acesso',
    description: 'Grava no Keycloak uma senha temporária de uso único e encerra as sessões da conta. No login, a pessoa troca o código pela própria senha. O código só aparece nesta resposta e não é guardado no CCA. Exige o administrador que pode gerir o usuário.',
    security: bearerAuth,
    request: { params: userIdParamsSchema },
    responses: {
      201: { description: 'Código emitido', content: json(z.object({ codigo: z.string() })) },
      ...authErrors,
      404: { description: 'user_not_found ou identity_subject_not_found', content: json(errorSchema) },
      409: { description: 'access_code_unavailable: usuário desativado, sem sub ou sem provisionador', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable ou identity_directory_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/usuarios/{id}',
    tags: ['Usuários'],
    summary: 'Consulta um usuário criado pelo administrador',
    security: bearerAuth,
    request: { params: userIdParamsSchema },
    responses: {
      200: { description: 'Usuário encontrado', content: json(userResponseSchema) },
      ...authErrors,
      404: { description: 'user_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/v1/usuarios/{id}',
    tags: ['Usuários'],
    summary: 'Atualiza um usuário e pode trocar o conjunto de telas',
    description: 'telas, quando informado, substitui as linhas de acesso daquele usuário. keycloakSub não muda. Nome, e-mail e status também atualizam o Keycloak. A exclusão não apaga a conta no diretório.',
    security: bearerAuth,
    request: { params: userIdParamsSchema, body: { required: true, content: json(updateUserBodySchema) } },
    responses: {
      200: { description: 'Usuário atualizado', content: json(userResponseSchema) },
      ...authErrors,
      404: { description: 'user_not_found ou recurso da tela', content: json(errorSchema) },
      409: { description: 'user_email_conflict, identity_email_conflict ou access_conflict', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/v1/usuarios/{id}',
    tags: ['Usuários'],
    summary: 'Exclui um usuário',
    description: 'Remove o cadastro quando ele não criou outros usuários e não tem tela nem auditoria. A conta no Keycloak permanece.',
    security: bearerAuth,
    request: { params: userIdParamsSchema },
    responses: {
      204: { description: 'Usuário excluído' },
      ...authErrors,
      404: { description: 'user_not_found', content: json(errorSchema) },
      409: { description: 'delete_restricted', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/acessos',
    tags: ['Acessos'],
    summary: 'Concede uma tela a um usuário',
    description: 'empresaId e submenuId identificam a tela. sistemaId, moduloId e menuId são opcionais: se os três vierem, a API confere a cadeia; se faltarem, ela resolve a cadeia a partir do submenu e confere a empresa.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createAccessBodySchema) } },
    responses: {
      201: { description: 'Tela concedida', content: json(accessResponseSchema) },
      ...authErrors,
      404: { description: 'user_not_found ou recurso da cadeia', content: json(errorSchema) },
      409: { description: 'access_conflict', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/acessos',
    tags: ['Acessos'],
    summary: 'Lista uma página das telas de um usuário',
    description: 'usuarioId é obrigatório. q procura na empresa, no sistema, no módulo, no menu e no submenu. empresaId e sistemaId filtram a cadeia. Cada item já traz os nomes. pagina começa em 1 e tamanho vai de 1 a 50.',
    security: bearerAuth,
    request: { query: listAccessesQuerySchema },
    responses: {
      200: { description: 'Linhas de acesso com a cadeia montada', content: json(accessPageSchema) },
      ...authErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/acessos/{id}',
    tags: ['Acessos'],
    summary: 'Consulta uma tela',
    security: bearerAuth,
    request: { params: accessIdParamsSchema },
    responses: {
      200: { description: 'Tela encontrada', content: json(accessResponseSchema) },
      ...authErrors,
      404: { description: 'access_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/v1/acessos/{id}',
    tags: ['Acessos'],
    summary: 'Atualiza o status de uma tela',
    security: bearerAuth,
    request: { params: accessIdParamsSchema, body: { required: true, content: json(updateAccessBodySchema) } },
    responses: {
      200: { description: 'Tela atualizada', content: json(accessResponseSchema) },
      ...authErrors,
      404: { description: 'access_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/v1/acessos/{id}',
    tags: ['Acessos'],
    summary: 'Remove uma tela',
    security: bearerAuth,
    request: { params: accessIdParamsSchema },
    responses: {
      204: { description: 'Tela removida' },
      ...authErrors,
      404: { description: 'access_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/auditorias',
    tags: ['Auditoria'],
    summary: 'Lista a auditoria do cadastro',
    description: 'Somente leitura. q procura na descrição, no usuário, na ação e no recurso. desde e ate limitam o período. Com pagina, a resposta é uma página. Login e logout ficam no Keycloak.',
    security: bearerAuth,
    request: { query: listAuditsQuerySchema },
    responses: {
      200: { description: 'Eventos mais recentes primeiro', content: json(z.array(auditResponseSchema)) },
      ...authErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/auditorias/{id}',
    tags: ['Auditoria'],
    summary: 'Consulta um evento',
    security: bearerAuth,
    request: { params: auditIdParamsSchema },
    responses: {
      200: { description: 'Evento encontrado', content: json(auditResponseSchema) },
      ...authErrors,
      404: { description: 'audit_not_found', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/importacoes/legado',
    tags: ['Importação'],
    summary: 'Importa o catálogo legado já saneado',
    description: 'Grava empresa, sistema global, módulo, menu e submenu. Acesso antigo vira uma linha de tela. Senha, RG e CPF não fazem parte do corpo. Usuário sem e-mail ou sem sub é ignorado.',
    security: bearerAuth,
    request: { body: { required: true, content: json(importLegacyBodySchema) } },
    responses: {
      200: { description: 'Contagens da importação', content: json(legacyImportReportSchema) },
      ...authErrors,
      503: { description: 'token_verifier_unavailable ou identity_directory_unavailable', content: json(errorSchema) },
    },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'CCA API',
      version: '0.1.0',
      description: 'Central de Controle de Acessos. A autenticação fica no Keycloak. As rotas /v1 exigem Bearer token. O cadastro exige usuário local ATIVADO do tipo ADMINITRADOR. Enquanto não existir administrador, um token válido cria o primeiro. A tela que uma pessoa pode abrir é uma linha de acesso. GET /v1/me só lê as claims. A referência interativa está em /docs/.',
    },
    servers: [{ url: '/' }],
  });
}
