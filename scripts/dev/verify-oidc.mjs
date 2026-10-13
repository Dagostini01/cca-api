import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

loadEnvFile('.env');

const issuer = process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/cca';
const audience = process.env.KEYCLOAK_AUDIENCE ?? 'cca-api';
const username = process.env.CCA_DEV_USER;
const password = process.env.CCA_DEV_USER_PASSWORD;
const redirectUri = 'http://127.0.0.1:4173/callback';
const apiBase = `http://127.0.0.1:${process.env.PORT ?? '3000'}`;

if (!username || !password) {
  console.error('CCA_DEV_USER and CCA_DEV_USER_PASSWORD are required in .env');
  process.exit(1);
}

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const authUrl = new URL(`${issuer}/protocol/openid-connect/auth`);
authUrl.searchParams.set('client_id', 'cca-web');
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

const jar = new Map();
const code = await login(authUrl);
const tokenResponse = await fetch(`${issuer}/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: 'cca-web',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  }),
});
if (!tokenResponse.ok) {
  console.error(`Token endpoint returned ${tokenResponse.status}`);
  process.exit(1);
}
const tokens = await tokenResponse.json();
const payload = decodeJwtPayload(tokens.access_token);
const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
if (payload.iss !== issuer || !audiences.includes(audience) || typeof payload.sub !== 'string') {
  console.error(`Unexpected access token claims. iss=${payload.iss} aud=${audiences.join(',')} sub=${typeof payload.sub}`);
  process.exit(1);
}

const me = await fetch(`${apiBase}/v1/me`, { headers: { authorization: `Bearer ${tokens.access_token}` } });
const body = await me.json();
if (me.status !== 200 || body.id !== payload.sub) {
  console.error(`GET /v1/me returned ${me.status}`);
  console.error(JSON.stringify(body));
  process.exit(1);
}

console.log(`issuer=${payload.iss}`);
console.log(`audience=${audiences.join(',')}`);
console.log(`GET /v1/me ${me.status} id=${body.id} username=${body.username ?? ''}`);

function loadEnvFile(path) {
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function login(startUrl) {
  let response = await request(startUrl, { method: 'GET' });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (response.status >= 300 && response.status < 400) {
      const next = resolveLocation(response, startUrl);
      const code = authorizationCode(next);
      if (code) return code;
      response = await request(next, { method: 'GET' });
      continue;
    }
    if (response.status !== 200) break;
    const html = await response.text();
    if (!html.includes('kc-form-login')) break;
    const action = formAction(html, response.url || startUrl);
    response = await request(action, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...hiddenFields(html), username, password }),
    });
  }
  console.error('Authorization Code + PKCE login did not return an authorization code');
  process.exit(1);
}

async function request(url, options) {
  const headers = new Headers(options.headers);
  if (jar.size > 0) headers.set('cookie', [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; '));
  const response = await fetch(url, { ...options, headers, redirect: 'manual' });
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const item of setCookies) {
    const pair = item.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return response;
}

function resolveLocation(response, currentUrl) {
  const location = response.headers.get('location');
  if (!location) {
    console.error(`Redirect ${response.status} without a Location header`);
    process.exit(1);
  }
  return new URL(location, currentUrl).toString();
}

function authorizationCode(url) {
  const parsed = new URL(url);
  if (`${parsed.origin}${parsed.pathname}` !== redirectUri) return undefined;
  const error = parsed.searchParams.get('error');
  if (error) {
    console.error(`Authorization redirect returned ${error}`);
    process.exit(1);
  }
  return parsed.searchParams.get('code') ?? undefined;
}

function formAction(html, pageUrl) {
  const match = html.match(/<form\b[^>]*\bid="kc-form-login"[^>]*>/i) ?? html.match(/<form\b[^>]*>/i);
  const action = match?.[0].match(/\baction="([^"]+)"/i)?.[1];
  if (!action) {
    console.error('Keycloak login form was not found');
    process.exit(1);
  }
  return new URL(decodeHtml(action), pageUrl).toString();
}

function hiddenFields(html) {
  const fields = {};
  for (const match of html.matchAll(/<input\b[^>]*type="hidden"[^>]*>/gi)) {
    const name = match[0].match(/\bname="([^"]+)"/i)?.[1];
    const value = match[0].match(/\bvalue="([^"]*)"/i)?.[1] ?? '';
    if (name) fields[decodeHtml(name)] = decodeHtml(value);
  }
  return fields;
}

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
}

function decodeJwtPayload(token) {
  const part = token.split('.')[1];
  if (!part) throw new Error('Access token is not a JWT');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}
