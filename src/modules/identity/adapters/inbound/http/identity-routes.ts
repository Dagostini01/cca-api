import type { FastifyInstance } from 'fastify';
import { readBearerToken } from '../../../../../shared/http/read-bearer-token.js';
import type { GetCurrentUser } from '../../../application/use-cases/get-current-user.js';

export function registerIdentityRoutes(app: FastifyInstance, getCurrentUser: GetCurrentUser) {
  app.get('/v1/me', async (request) => {
    const token = readBearerToken(request.headers.authorization);
    return getCurrentUser.execute(token);
  });
}
