import type { FastifyRequest } from 'fastify';
import { readBearerToken } from '../../../../../shared/http/read-bearer-token.js';
import type { GetCurrentUser } from '../../../application/use-cases/get-current-user.js';

export async function requireUser(request: FastifyRequest, getCurrentUser: GetCurrentUser) {
  const token = readBearerToken(request.headers.authorization);
  return getCurrentUser.execute(token);
}
