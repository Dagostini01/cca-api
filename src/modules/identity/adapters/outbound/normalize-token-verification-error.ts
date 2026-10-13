import { errors } from 'jose';
import { InvalidTokenError, TokenVerifierUnavailableError } from '../../application/errors/token-verification-error.js';

const networkCodes = new Set([
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function readCode(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('code' in value)) return undefined;
  return typeof value.code === 'string' ? value.code : undefined;
}

function isNetworkError(error: Error): boolean {
  const code = readCode(error) ?? readCode(error.cause);
  if (code && networkCodes.has(code)) return true;
  return error instanceof TypeError && /fetch failed|network/i.test(error.message);
}

export function normalizeTokenVerificationError(error: unknown): Error {
  if (error instanceof InvalidTokenError || error instanceof TokenVerifierUnavailableError) return error;
  if (error instanceof errors.JWKSTimeout || error instanceof errors.JWKSInvalid) return new TokenVerifierUnavailableError();
  if (error instanceof Error && isNetworkError(error)) return new TokenVerifierUnavailableError();
  if (error instanceof errors.JOSEError) return new InvalidTokenError();
  if (error instanceof Error) return error;
  return new Error('Unexpected token verification failure');
}
