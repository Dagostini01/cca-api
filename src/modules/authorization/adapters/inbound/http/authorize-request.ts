import type { Authorizer } from '../../../application/ports/authorizer.js';

export async function authorizeCatalog(authorizer: Authorizer | undefined, subject: string): Promise<void> {
  if (authorizer) await authorizer.assertCatalog(subject);
}

export async function authorizeUserManagement(
  authorizer: Authorizer | undefined,
  subject: string,
  userId: number,
): Promise<void> {
  if (authorizer) await authorizer.assertCanManageUser(subject, userId);
}

export async function authorizeScreen(
  authorizer: Authorizer | undefined,
  subject: string,
  submenuId: number,
): Promise<void> {
  if (authorizer) await authorizer.assertScreen(subject, submenuId);
}
