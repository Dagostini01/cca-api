import { errors } from 'jose';
import { describe, expect, it } from 'vitest';
import { normalizeTokenVerificationError } from '../../src/modules/identity/adapters/outbound/normalize-token-verification-error.js';
import { InvalidTokenError, TokenVerifierUnavailableError } from '../../src/modules/identity/application/errors/token-verification-error.js';

describe('normalizeTokenVerificationError', () => {
  it('keeps application errors unchanged', () => {
    const invalid = new InvalidTokenError();
    const unavailable = new TokenVerifierUnavailableError();
    expect(normalizeTokenVerificationError(invalid)).toBe(invalid);
    expect(normalizeTokenVerificationError(unavailable)).toBe(unavailable);
  });

  it('maps token validation failures to an invalid token', () => {
    expect(normalizeTokenVerificationError(new errors.JWTExpired('expired', {}))).toBeInstanceOf(InvalidTokenError);
    expect(normalizeTokenVerificationError(new errors.JWTClaimValidationFailed('aud', {}, 'aud', 'mismatch'))).toBeInstanceOf(InvalidTokenError);
    expect(normalizeTokenVerificationError(new errors.JWSSignatureVerificationFailed())).toBeInstanceOf(InvalidTokenError);
  });

  it('maps JWKS and network failures to verifier unavailability', () => {
    expect(normalizeTokenVerificationError(new errors.JWKSTimeout())).toBeInstanceOf(TokenVerifierUnavailableError);
    expect(normalizeTokenVerificationError(new errors.JWKSInvalid())).toBeInstanceOf(TokenVerifierUnavailableError);
    expect(normalizeTokenVerificationError(new TypeError('fetch failed'))).toBeInstanceOf(TokenVerifierUnavailableError);
    const refused = Object.assign(new Error('connect'), { code: 'ECONNREFUSED' });
    expect(normalizeTokenVerificationError(refused)).toBeInstanceOf(TokenVerifierUnavailableError);
  });

  it('preserves unexpected failures', () => {
    const unexpected = new Error('boom');
    expect(normalizeTokenVerificationError(unexpected)).toBe(unexpected);
  });
});
