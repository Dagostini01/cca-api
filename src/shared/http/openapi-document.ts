import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { companyIdParamsSchema, companyResponseSchema, createCompanyBodySchema, updateCompanyBodySchema } from '../../modules/companies/adapters/inbound/http/company-schemas.js';
import { createSystemBodySchema, listSystemsQuerySchema, systemIdParamsSchema, systemResponseSchema, updateSystemBodySchema } from '../../modules/systems/adapters/inbound/http/system-schemas.js';
import { createModuleBodySchema, listModulesQuerySchema, moduleIdParamsSchema, moduleResponseSchema, updateModuleBodySchema } from '../../modules/system-modules/adapters/inbound/http/module-schemas.js';
import { createMenuBodySchema, listMenusQuerySchema, menuIdParamsSchema, menuResponseSchema, updateMenuBodySchema } from '../../modules/menus/adapters/inbound/http/menu-schemas.js';
import { createSubmenuBodySchema, listSubmenusQuerySchema, submenuIdParamsSchema, submenuResponseSchema, updateSubmenuBodySchema } from '../../modules/submenus/adapters/inbound/http/submenu-schemas.js';
import { createUserBodySchema, listUsersQuerySchema, updateUserBodySchema, userIdParamsSchema, userResponseSchema } from '../../modules/users/adapters/inbound/http/user-schemas.js';
import { createProfileBodySchema, listProfilesQuerySchema, profileIdParamsSchema, profileResponseSchema, updateProfileBodySchema } from '../../modules/profiles/adapters/inbound/http/profile-schemas.js';
import { createPermissionBodySchema, listPermissionsQuerySchema, permissionIdParamsSchema, permissionResponseSchema, updatePermissionBodySchema } from '../../modules/permissions/adapters/inbound/http/permission-schemas.js';
import { accessIdParamsSchema, accessResponseSchema, createAccessBodySchema, listAccessesQuerySchema, updateAccessBodySchema } from '../../modules/accesses/adapters/inbound/http/access-schemas.js';
import { auditIdParamsSchema, auditResponseSchema, listAuditsQuerySchema } from '../../modules/audits/adapters/inbound/http/audit-schemas.js';

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
    description: `O pai é obrigatório e precisa existir. O nome é único dentro do ${resource.parentField}. Sem status, o padrão é ATIVO.`,
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
    description: `Devolve os registros que o chamador pode visualizar. O parâmetro de query restringe ao ${resource.parentField}. Sem nenhum acesso gravado, a lista não é filtrada.`,
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
    description: `Informe ao menos um campo. Trocar o pai move o registro para outro ${resource.parentField} existente. Não há exclusão física.`,
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
}

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
    description: 'CNPJ é opcional. Quando informado, a API valida os dígitos e grava somente os 14 números. Sem status, o padrão é ATIVO.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createCompanyBodySchema) } },
    responses: {
      201: { description: 'Empresa criada', content: json(companyResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      409: { description: 'company_document_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/empresas',
    tags: ['Empresas'],
    summary: 'Lista empresas por nome',
    security: bearerAuth,
    responses: {
      200: { description: 'Empresas ordenadas por nome', content: json(z.array(companyResponseSchema)) },
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
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'company_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/v1/empresas/{id}',
    tags: ['Empresas'],
    summary: 'Atualiza uma empresa',
    description: 'Informe ao menos um campo. cnpj nulo remove o documento. Não há exclusão física.',
    security: bearerAuth,
    request: {
      params: companyIdParamsSchema,
      body: { required: true, content: json(updateCompanyBodySchema) },
    },
    responses: {
      200: { description: 'Empresa atualizada', content: json(companyResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'company_not_found', content: json(errorSchema) },
      409: { description: 'company_document_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/sistemas',
    tags: ['Sistemas'],
    summary: 'Cria um sistema ligado a uma empresa',
    description: 'empresaId é obrigatório e precisa apontar para uma empresa existente. O nome é único dentro da empresa. Sem status, o padrão é ATIVO.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createSystemBodySchema) } },
    responses: {
      201: { description: 'Sistema criado', content: json(systemResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'company_not_found', content: json(errorSchema) },
      409: { description: 'system_name_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/sistemas',
    tags: ['Sistemas'],
    summary: 'Lista sistemas',
    description: 'Sem filtro, devolve todos. Com empresaId, devolve somente os sistemas daquela empresa.',
    security: bearerAuth,
    request: { query: listSystemsQuerySchema },
    responses: {
      200: { description: 'Sistemas ordenados por nome', content: json(z.array(systemResponseSchema)) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
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
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'system_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/v1/sistemas/{id}',
    tags: ['Sistemas'],
    summary: 'Atualiza um sistema',
    description: 'Informe ao menos um campo. empresaId, quando muda, precisa existir. O sistema continua obrigatoriamente ligado a uma empresa. Não há exclusão física.',
    security: bearerAuth,
    request: {
      params: systemIdParamsSchema,
      body: { required: true, content: json(updateSystemBodySchema) },
    },
    responses: {
      200: { description: 'Sistema atualizado', content: json(systemResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'system_not_found ou company_not_found', content: json(errorSchema) },
      409: { description: 'system_name_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
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
  registry.registerPath({
    method: 'post',
    path: '/v1/usuarios',
    tags: ['Usuários'],
    summary: 'Cria um usuário de negócio',
    description: 'Sem keycloakSub, a API cria o usuário no Keycloak e guarda o id devolvido. Com keycloakSub, liga um usuário que já existe no realm. Não grava senha. A conta nova exige UPDATE_PASSWORD no Keycloak. A empresa precisa existir. O e-mail é único e fica em minúsculas.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createUserBodySchema) } },
    responses: {
      201: { description: 'Usuário criado', content: json(userResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'company_not_found ou identity_subject_not_found', content: json(errorSchema) },
      409: { description: 'user_email_conflict, user_subject_conflict ou identity_email_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable ou identity_directory_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/usuarios/eu',
    tags: ['Usuários'],
    summary: 'Consulta o usuário local do token',
    description: 'Usa o sub autenticado. Não cria o cadastro. /v1/me continua devolvendo só as claims do token.',
    security: bearerAuth,
    responses: {
      200: { description: 'Usuário encontrado', content: json(userResponseSchema) },
      400: { description: 'invalid_user_subject quando o sub do token não é um UUID', content: json(errorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      404: { description: 'user_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/usuarios',
    tags: ['Usuários'],
    summary: 'Lista usuários',
    security: bearerAuth,
    request: { query: listUsersQuerySchema },
    responses: {
      200: { description: 'Usuários ordenados por nome', content: json(z.array(userResponseSchema)) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/usuarios/{id}',
    tags: ['Usuários'],
    summary: 'Consulta um usuário',
    security: bearerAuth,
    request: { params: userIdParamsSchema },
    responses: {
      200: { description: 'Usuário encontrado', content: json(userResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'user_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'patch',
    path: '/v1/usuarios/{id}',
    tags: ['Usuários'],
    summary: 'Atualiza um usuário',
    description: 'Informe ao menos um campo entre nome, email, empresaId e status. keycloakSub não muda. Nome, e-mail e status também atualizam o usuário no Keycloak. Não há exclusão física.',
    security: bearerAuth,
    request: {
      params: userIdParamsSchema,
      body: { required: true, content: json(updateUserBodySchema) },
    },
    responses: {
      200: { description: 'Usuário atualizado', content: json(userResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'user_not_found, company_not_found ou identity_subject_not_found', content: json(errorSchema) },
      409: { description: 'user_email_conflict ou identity_email_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable ou identity_directory_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/perfis',
    tags: ['Perfis'],
    summary: 'Cria um perfil de acesso',
    description: 'O perfil pertence a uma empresa. O nome é único dentro dela. Ainda não guarda permissões nem usuários.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createProfileBodySchema) } },
    responses: {
      201: { description: 'Perfil criado', content: json(profileResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'company_not_found', content: json(errorSchema) },
      409: { description: 'profile_name_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/perfis',
    tags: ['Perfis'],
    summary: 'Lista perfis',
    security: bearerAuth,
    request: { query: listProfilesQuerySchema },
    responses: {
      200: { description: 'Perfis ordenados por nome', content: json(z.array(profileResponseSchema)) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/perfis/{id}',
    tags: ['Perfis'],
    summary: 'Consulta um perfil',
    security: bearerAuth,
    request: { params: profileIdParamsSchema },
    responses: {
      200: { description: 'Perfil encontrado', content: json(profileResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'profile_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'patch',
    path: '/v1/perfis/{id}',
    tags: ['Perfis'],
    summary: 'Atualiza um perfil',
    description: 'Informe ao menos um campo. descricao nula apaga o texto. empresaId, quando muda, precisa existir. Não há exclusão física.',
    security: bearerAuth,
    request: {
      params: profileIdParamsSchema,
      body: { required: true, content: json(updateProfileBodySchema) },
    },
    responses: {
      200: { description: 'Perfil atualizado', content: json(profileResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'profile_not_found ou company_not_found', content: json(errorSchema) },
      409: { description: 'profile_name_conflict', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/permissoes',
    tags: ['Permissões'],
    summary: 'Concede ações de um perfil sobre um recurso',
    description: 'O recurso é um sistema, módulo, menu ou submenu da mesma empresa do perfil. A empresa não vai no corpo. Pelo menos uma ação precisa ser verdadeira. Esta rota ainda não bloqueia as demais.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createPermissionBodySchema) } },
    responses: {
      201: { description: 'Permissão criada', content: json(permissionResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'profile_not_found ou resource_not_found', content: json(errorSchema) },
      409: { description: 'permission_conflict ou permission_company_mismatch', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/permissoes',
    tags: ['Permissões'],
    summary: 'Lista permissões',
    security: bearerAuth,
    request: { query: listPermissionsQuerySchema },
    responses: {
      200: { description: 'Permissões do perfil, quando filtradas', content: json(z.array(permissionResponseSchema)) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/permissoes/{id}',
    tags: ['Permissões'],
    summary: 'Consulta uma permissão',
    security: bearerAuth,
    request: { params: permissionIdParamsSchema },
    responses: {
      200: { description: 'Permissão encontrada', content: json(permissionResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'permission_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'patch',
    path: '/v1/permissoes/{id}',
    tags: ['Permissões'],
    summary: 'Atualiza as ações de uma permissão',
    description: 'Só mudam visualizar, criar, editar e excluir. Perfil e recurso permanecem. Todas as ações falsas apagam a concessão sem remover a linha.',
    security: bearerAuth,
    request: {
      params: permissionIdParamsSchema,
      body: { required: true, content: json(updatePermissionBodySchema) },
    },
    responses: {
      200: { description: 'Permissão atualizada', content: json(permissionResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'permission_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/v1/acessos',
    tags: ['Acessos'],
    summary: 'Liga um usuário a um perfil em um sistema',
    description: 'Usuário, perfil e sistema precisam ser da mesma empresa. O par usuário + sistema é único. O primeiro acesso ativo liga a autorização das demais rotas.',
    security: bearerAuth,
    request: { body: { required: true, content: json(createAccessBodySchema) } },
    responses: {
      201: { description: 'Acesso criado', content: json(accessResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'user_not_found, profile_not_found ou system_not_found', content: json(errorSchema) },
      409: { description: 'access_conflict ou access_company_mismatch', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/acessos',
    tags: ['Acessos'],
    summary: 'Lista acessos',
    security: bearerAuth,
    request: { query: listAccessesQuerySchema },
    responses: {
      200: { description: 'Acessos filtrados por usuário e/ou sistema', content: json(z.array(accessResponseSchema)) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/acessos/{id}',
    tags: ['Acessos'],
    summary: 'Consulta um acesso',
    security: bearerAuth,
    request: { params: accessIdParamsSchema },
    responses: {
      200: { description: 'Acesso encontrado', content: json(accessResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'access_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'patch',
    path: '/v1/acessos/{id}',
    tags: ['Acessos'],
    summary: 'Atualiza o perfil ou o status de um acesso',
    description: 'Usuário e sistema não mudam. O novo perfil precisa ser da mesma empresa. Não há exclusão física.',
    security: bearerAuth,
    request: {
      params: accessIdParamsSchema,
      body: { required: true, content: json(updateAccessBodySchema) },
    },
    responses: {
      200: { description: 'Acesso atualizado', content: json(accessResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'access_not_found, user_not_found, profile_not_found ou system_not_found', content: json(errorSchema) },
      409: { description: 'access_company_mismatch', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/v1/auditorias',
    tags: ['Auditoria'],
    summary: 'Lista o histórico de alterações',
    description: 'Mais recente primeiro. desde e ate filtram ocorridoEm. A lista fica restrita às empresas que o chamador pode visualizar. Não há criação manual nem alteração do histórico.',
    security: bearerAuth,
    request: { query: listAuditsQuerySchema },
    responses: {
      200: { description: 'Eventos visíveis para o chamador', content: json(z.array(auditResponseSchema)) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/v1/auditorias/{id}',
    tags: ['Auditoria'],
    summary: 'Consulta um evento de auditoria',
    security: bearerAuth,
    request: { params: auditIdParamsSchema },
    responses: {
      200: { description: 'Evento encontrado', content: json(auditResponseSchema) },
      400: { description: 'validation_error', content: json(validationErrorSchema) },
      401: { description: 'unauthorized ou invalid_token', content: json(errorSchema) },
      403: { description: 'forbidden', content: json(errorSchema) },
      404: { description: 'audit_not_found', content: json(errorSchema) },
      503: { description: 'token_verifier_unavailable', content: json(errorSchema) },
    },
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

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'CCA API',
      version: '0.1.0',
      description: 'Central de Controle de Acessos. A autenticação fica no Keycloak. As rotas /v1 exigem Bearer token. Com ao menos um acesso gravado, cada rota exige a ação do perfil sobre o recurso e responde forbidden quando ela falta. Sem nenhum acesso, qualquer token válido segue. GET /v1/me só lê as claims. A referência interativa está em /docs/.',
    },
    servers: [{ url: '/' }],
  });
}
