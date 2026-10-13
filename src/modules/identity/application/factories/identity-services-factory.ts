import type { Env } from '../../../../shared/config/env.js';
import { KeycloakJwtVerifier } from '../../adapters/outbound/keycloak-jwt-verifier.js';
import type { TokenVerifier } from '../ports/token-verifier.js';
import { GetCurrentUser } from '../use-cases/get-current-user.js';

export function createKeycloakTokenVerifier(env: Env): TokenVerifier {
  return new KeycloakJwtVerifier(env.KEYCLOAK_JWKS_URI, env.KEYCLOAK_ISSUER, env.KEYCLOAK_AUDIENCE);
}

export function createGetCurrentUser(verifier: TokenVerifier): GetCurrentUser {
  return new GetCurrentUser(verifier);
}
