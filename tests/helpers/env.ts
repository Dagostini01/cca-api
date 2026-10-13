import type { Env } from '../../src/shared/config/env.js';

export const testEnv: Env = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3000,
  KEYCLOAK_ISSUER: 'http://localhost:8080/realms/cca',
  KEYCLOAK_JWKS_URI: 'http://127.0.0.1:9/realms/cca/protocol/openid-connect/certs',
  KEYCLOAK_AUDIENCE: 'cca-api',
};
