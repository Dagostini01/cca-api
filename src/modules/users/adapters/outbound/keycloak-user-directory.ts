import type { IdentityDirectory, DirectoryProfile } from '../../application/ports/identity-directory.js';
import {
  IdentityDirectoryUnavailableError,
  IdentityEmailConflictError,
  IdentitySubjectNotFoundError,
} from '../../domain/user-errors.js';

export type KeycloakUserDirectoryConfig = {
  baseUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

export function createKeycloakUserDirectory(config: KeycloakUserDirectoryConfig, fetchImpl: typeof fetch = fetch): IdentityDirectory {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  let cached: CachedToken | null = null;

  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt > Date.now() + 10_000) return cached.value;
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/realms/${config.realm}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new IdentityDirectoryUnavailableError();
    }
    if (!response.ok) throw new IdentityDirectoryUnavailableError();
    const body = await response.json() as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== 'string' || body.access_token.length === 0) throw new IdentityDirectoryUnavailableError();
    const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 60;
    cached = { value: body.access_token, expiresAt: Date.now() + expiresIn * 1000 };
    return body.access_token;
  }

  async function admin(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/admin/realms/${config.realm}${path}`, {
        ...init,
        headers: {
          accept: 'application/json',
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...init.headers,
          authorization: `Bearer ${await accessToken()}`,
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new IdentityDirectoryUnavailableError();
    }
    if (response.status === 401 && retry) {
      cached = null;
      return admin(path, init, false);
    }
    return response;
  }

  return {
    async provision(profile) {
      const response = await admin('/users', {
        method: 'POST',
        body: JSON.stringify(createRepresentation(profile)),
      });
      if (response.status === 409) throw new IdentityEmailConflictError();
      if (response.status !== 201) throw new IdentityDirectoryUnavailableError();
      const located = userIdFromLocation(response.headers.get('location'));
      if (located) return { id: located };
      const found = await findIdByUsername(profile.email);
      if (!found) throw new IdentityDirectoryUnavailableError();
      return { id: found };
    },
    async assertExists(id) {
      const response = await admin(`/users/${encodeURIComponent(id)}`);
      if (response.status === 404) throw new IdentitySubjectNotFoundError();
      if (!response.ok) throw new IdentityDirectoryUnavailableError();
    },
    async sync(id, profile) {
      const current = await admin(`/users/${encodeURIComponent(id)}`);
      if (current.status === 404) throw new IdentitySubjectNotFoundError();
      if (!current.ok) throw new IdentityDirectoryUnavailableError();
      const user = await current.json() as Record<string, unknown>;
      if (!user || Array.isArray(user)) throw new IdentityDirectoryUnavailableError();
      delete user.credentials;
      user.firstName = profile.nome;
      user.email = profile.email;
      user.username = profile.email;
      user.enabled = profile.enabled;
      const updated = await admin(`/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      });
      if (updated.status === 409) throw new IdentityEmailConflictError();
      if (updated.status === 404) throw new IdentitySubjectNotFoundError();
      if (updated.status !== 204 && updated.status !== 200) throw new IdentityDirectoryUnavailableError();
    },
    async remove(id) {
      const response = await admin(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (response.status === 204 || response.status === 404) return;
      throw new IdentityDirectoryUnavailableError();
    },
  };

  async function findIdByUsername(email: string): Promise<string | null> {
    const response = await admin(`/users?username=${encodeURIComponent(email)}&exact=true`);
    if (!response.ok) return null;
    const users = await response.json() as Array<{ id?: unknown }>;
    const id = users[0]?.id;
    return typeof id === 'string' ? id.toLowerCase() : null;
  }
}

function createRepresentation(profile: DirectoryProfile) {
  return {
    username: profile.email,
    email: profile.email,
    firstName: profile.nome,
    enabled: profile.enabled,
    emailVerified: false,
    requiredActions: ['UPDATE_PASSWORD'],
  };
}

function userIdFromLocation(location: string | null): string | null {
  if (!location) return null;
  const id = location.split('/').pop()?.split('?')[0]?.toLowerCase() ?? '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ? id : null;
}
