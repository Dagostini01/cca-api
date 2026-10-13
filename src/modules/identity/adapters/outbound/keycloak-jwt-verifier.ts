import { createRemoteJWKSet, jwtVerify } from 'jose';
import { InvalidTokenError } from '../../application/errors/token-verification-error.js';
import type { TokenVerifier } from '../../application/ports/token-verifier.js';
import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.js';
import { normalizeTokenVerificationError } from './normalize-token-verification-error.js';

export class KeycloakJwtVerifier implements TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  constructor(jwksUri: string, private readonly issuer: string, private readonly audience: string) {
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
      });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new InvalidTokenError();
      return {
        id: payload.sub,
        username: typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
    } catch (error) {
      throw normalizeTokenVerificationError(error);
    }
  }
}
