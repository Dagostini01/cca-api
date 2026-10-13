import type { FastifyInstance } from 'fastify';
import { ZodError, type ZodIssue } from 'zod';
import { DomainError } from '../errors/domain-error.js';

const statusByCode: Record<string, number> = {
  unauthorized: 401,
  forbidden: 403,
  invalid_token: 401,
  token_verifier_unavailable: 503,
  invalid_company_name: 400,
  invalid_company_document: 400,
  empty_company_update: 400,
  company_not_found: 404,
  company_document_conflict: 409,
  invalid_system_name: 400,
  empty_system_update: 400,
  system_not_found: 404,
  system_name_conflict: 409,
  invalid_module_name: 400,
  empty_module_update: 400,
  module_not_found: 404,
  module_name_conflict: 409,
  invalid_menu_name: 400,
  empty_menu_update: 400,
  menu_not_found: 404,
  menu_name_conflict: 409,
  invalid_submenu_name: 400,
  empty_submenu_update: 400,
  submenu_not_found: 404,
  submenu_name_conflict: 409,
  invalid_user_name: 400,
  invalid_user_email: 400,
  invalid_user_subject: 400,
  empty_user_update: 400,
  user_not_found: 404,
  user_email_conflict: 409,
  user_subject_conflict: 409,
  invalid_profile_name: 400,
  invalid_profile_description: 400,
  empty_profile_update: 400,
  profile_not_found: 404,
  profile_name_conflict: 409,
  invalid_permission_actions: 400,
  empty_permission_update: 400,
  permission_not_found: 404,
  permission_conflict: 409,
  resource_not_found: 404,
  permission_company_mismatch: 409,
  empty_access_update: 400,
  access_not_found: 404,
  access_conflict: 409,
  access_company_mismatch: 409,
};

function issueSummary(issue: ZodIssue) {
  const summary: { path: string; code: string; keys?: string[] } = {
    path: issue.path.join('.'),
    code: issue.code,
  };
  if (issue.code === 'unrecognized_keys') summary.keys = issue.keys;
  return summary;
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'validation_error',
        issues: error.issues.map(issueSummary),
      });
    }

    if (error instanceof DomainError) {
      const status = statusByCode[error.code] ?? 500;
      if (error.code === 'token_verifier_unavailable') request.log.error('token verifier unavailable');
      if (status === 500) request.log.error({ code: error.code }, 'unmapped domain error');
      return reply.code(status).send({ error: status === 500 ? 'internal_error' : error.code });
    }

    request.log.error({ err: error }, 'unexpected failure');
    return reply.code(500).send({ error: 'internal_error' });
  });
}
