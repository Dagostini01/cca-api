import type { AuthorizationTarget, Authorizer } from '../../../application/ports/authorizer.js';

export async function authorize(
  authorizer: Authorizer | undefined,
  subject: string,
  action: 'visualizar' | 'criar' | 'editar',
  target: AuthorizationTarget,
): Promise<void> {
  if (authorizer) await authorizer.assert(subject, action, target);
}

export async function authorizeCompanyCreation(authorizer: Authorizer | undefined, subject: string): Promise<void> {
  if (authorizer) await authorizer.assertCanCreateCompany(subject);
}

export async function onlyVisible<T>(
  authorizer: Authorizer | undefined,
  subject: string,
  items: T[],
  targetOf: (item: T) => AuthorizationTarget,
): Promise<T[]> {
  if (!authorizer) return items;
  return authorizer.filter(subject, 'visualizar', items, targetOf);
}
