# CCA API — Fundação

Backend Node.js + TypeScript + Fastify, arquitetura hexagonal e autenticação Keycloak.

## Pré-requisitos
- Docker Engine + Docker Compose
- Node.js 22+ para desenvolvimento fora de container

## Subir localmente

```bash
cp .env.example .env
# Alterar todas as senhas locais do .env
npm ci

docker compose up --build -d
curl http://localhost:3000/health
```

A referência da API fica em [http://127.0.0.1:3000/docs/](http://127.0.0.1:3000/docs/). Detalhes em `docs/api/reference.md`.

O `.env.example` aponta para o host: JWKS em `localhost` e `MYSQL_HOST=127.0.0.1`. No serviço `api`, o Compose força `NODE_ENV=production`, `HOST=0.0.0.0`, JWKS em `http://keycloak:8080/...`, `MYSQL_HOST=mysql` e `MYSQL_PORT=3306`. O issuer validado continua `http://localhost:8080/realms/cca`.

A porta publicada do MySQL no host vem de `MYSQL_PUBLISH_PORT` (padrão `3306`). Se essa porta já estiver ocupada, use outra no `.env`, por exemplo `3307`.

O Compose cria o realm `cca`, os clientes e o usuário de desenvolvimento. Detalhes em `docs/integrations/keycloak-setup.md`.

```bash
npm run verify:oidc
npm run db:migrate
npm run db:verify
```

## Escopo da entrega
- Implementados: estrutura hexagonal inicial, health check, verificação JWT via JWKS, validação de `iss` e `aud`, containers locais, testes de `GetCurrentUser` e de `/health` e `/v1/me`, realm local do Keycloak, migration da cadeia empresa → submenu, CRUD autenticado dessa cadeia, usuário de negócio ligado ao `sub` do Keycloak, criação desse usuário no realm sem senha, perfil de acesso preso à empresa, permissão do perfil sobre a empresa ou um nó dessa cadeia, acesso do usuário a um perfil em um sistema, autorização das rotas por essa concessão, histórico de auditoria das alterações e referência Scalar em `/docs/`.
- **Não implementados:** importação do backup.
- Não usar em produção como está. O health check não verifica dependências externas.

## Segurança e dados legados
O backup SQL original contém credenciais em texto claro. Ele pode ficar na máquina para análise local, mas `backups/` e os demais `*.sql` estão no `.gitignore`. As migrations do Prisma são versionadas. Não versione o backup e não altere o original. Planejar rotação e migração segura antes de qualquer importação.
