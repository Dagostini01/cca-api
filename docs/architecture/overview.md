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
- Navegador: a API só reflete as origens listadas em `CORS_ORIGINS`. O padrão local é o cliente `cca-web` nas portas `4173`.
- Cadastro: sistema é catálogo global. Módulo, menu e submenu exigem o pai imediato. A empresa mora na linha de acesso. Ver ADR-003. O ADR-002 foi substituído.
- Usuário de negócio: nome, e-mail, tipo, status e `sub` do Keycloak. RG, CPF e celular existem no corpo e não vão para log. Sem `sub` no corpo, a API cria a conta no realm sem senha e guarda o id. A criação também grava as telas. `/v1/me` continua só com as claims do token.
- Acesso: uma linha por tela, com empresa, sistema, módulo, menu e submenu coerentes. Não há perfil nem as ações visualizar, criar, editar e excluir.
- Autorização: o cadastro exige administrador ativo. Enquanto não existir administrador, um token válido cria o primeiro. A tela abre quando a linha daquele submenu está `ATIVADO`.
- Auditoria: histórico de criar, atualizar e excluir, com data, usuário local, ação e descrição. Login continua no Keycloak.
- Importação: o catálogo legado entra sem senha. Sistema é global. Usuário sem e-mail fica de fora.
- Desenvolvimento: Keycloak `start-dev` somente local; o realm `cca` é provisionado por `infra/keycloak/configure-realm.sh`. Endurecer configurações para produção.
