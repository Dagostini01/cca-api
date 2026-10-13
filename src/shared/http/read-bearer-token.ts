import { UnauthorizedError } from './unauthorized-error.js';

export function readBearerToken(authorization: string | undefined): string {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  if (!token) throw new UnauthorizedError();
  return token;
}
