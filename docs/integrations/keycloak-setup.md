# Keycloak local (desenvolvimento)

O Compose sobe o Keycloak em `http://127.0.0.1:8080` e o serviço `keycloak-init` provisiona o realm `cca`. O script é `infra/keycloak/configure-realm.sh` e pode ser executado de novo.

## O que o init cria

- Realm `cca`, com HTTP liberado apenas neste ambiente local (`sslRequired=NONE`).
- Cliente público `cca-web`: Authorization Code, PKCE S256 obrigatório, sem implicit flow e sem Resource Owner Password Credentials.
- Redirect URIs locais: `http://127.0.0.1:4173/callback` e `http://localhost:4173/callback`. Web origins restritas a essas origens.
- Cliente `cca-api`, usado como audiência da API. Não tem fluxo de login.
- Cliente confidencial `cca-provisioner`, só com service account. O segredo vem de `KEYCLOAK_PROVISIONER_CLIENT_SECRET` e não fica no script. A service account recebe `manage-users`, `view-users` e `query-users` em `realm-management`.
- Audience mapper em `cca-web` para incluir `cca-api` no `aud` do access token.
- Usuário de desenvolvimento `CCA_DEV_USER`, com senha vinda de `CCA_DEV_USER_PASSWORD` no `.env`. A senha não fica no script.
- O realm permite alterar o username, para o e-mail do cadastro continuar sendo o username.

O admin do realm `master` usa `KC_BOOTSTRAP_ADMIN_USERNAME` e `KC_BOOTSTRAP_ADMIN_PASSWORD`. Essas credenciais só criam o admin na primeira inicialização do banco do Keycloak.

A API cria usuários de negócio com a service account de `cca-provisioner`. Dentro do container ela chama `http://keycloak:8080`. No host, `KEYCLOAK_ADMIN_BASE_URL` aponta para `http://localhost:8080`. O issuer validado continua `http://localhost:8080/realms/cca`. A criação não define senha: a conta recebe a ação `UPDATE_PASSWORD`.

## Conferir o token

Com a stack no ar:

```bash
npm run verify:oidc
```

O comando executa Authorization Code + PKCE contra `cca-web`, confere `iss` e `aud`, e chama `GET /v1/me`. Não usa Resource Owner Password Credentials.

O `.env` local aponta o JWKS para `localhost`, para o processo no host. No container, o Compose sobrescreve `KEYCLOAK_JWKS_URI` para `http://keycloak:8080/realms/cca/protocol/openid-connect/certs` e `KEYCLOAK_ADMIN_BASE_URL` para `http://keycloak:8080`. Nos dois casos a API valida o issuer `http://localhost:8080/realms/cca`.

Recuperação de senha fica habilitada no realm, mas este ambiente não configura SMTP. O envio de e-mail ainda não funciona.

**Produção:** HTTPS, hostname público estável, segredos gerenciados, `sslRequired` adequado e redirect URIs do frontend real. Não reutilizar `start-dev`, o usuário local nem as senhas de exemplo.
