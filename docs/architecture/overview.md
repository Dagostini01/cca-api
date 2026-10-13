# Arquitetura CCA — ADR inicial

- API de negócio: Node.js, TypeScript, Fastify; monólito modular hexagonal.
- Identidade e SSO: Keycloak (OIDC); **não** implementar login por senha no Fastify.
- Banco de negócio: MySQL `cca`; banco de identidade: PostgreSQL privado do Keycloak.
- `domain` e `application` não dependem de Fastify, Prisma, MySQL ou Keycloak.
- Adaptadores de entrada: HTTP. Adaptadores de saída: verificação JWT e Prisma. O caso de uso depende da porta; a factory na composição escolhe o adaptador.
- Contrato HTTP: schemas Zod nas rotas e referência Scalar em `/docs/`.
- Tokens de acesso: validar assinatura via JWKS, `iss`, `aud`, expiração e algoritmo permitido.
- O endpoint `/v1/me` **apenas verifica token**. Token ausente ou inválido responde 401. Falha ao obter as chaves responde 503. Ainda não consulta status local ou autorização.
- Telas de referência: `docs/architecture/ui-prototype.md`.
- Para sistemas consumidores: OIDC Authorization Code + PKCE; configuração de cliente e audiência no Keycloak.
- Cadastro: Empresa → Sistema → Módulo → Menu → Submenu, com pai obrigatório. Ver ADR-002.
- Usuário de negócio: nome, e-mail, empresa e `sub` do Keycloak. Sem senha, RG ou CPF. `/v1/me` continua só com as claims do token.
- Perfil de acesso: nome, descrição e status, obrigatoriamente de uma empresa.
- Permissão: visualizar, criar, editar e excluir sobre a empresa ou sobre um sistema, módulo, menu ou submenu da mesma empresa do perfil.
- Acesso: usuário, perfil e sistema da mesma empresa. Com ao menos um acesso gravado, as rotas exigem a ação do perfil sobre o recurso. Sem nenhum acesso, qualquer token válido segue. `GET /v1/me` continua só com as claims.
- Segurança: a autorização efetiva está nas rotas, por recurso e ação. A permissão não herda do pai para o filho.
- Desenvolvimento: Keycloak `start-dev` somente local; o realm `cca` é provisionado por `infra/keycloak/configure-realm.sh`. Endurecer configurações para produção.
