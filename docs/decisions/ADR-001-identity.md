# ADR-001 — Keycloak como provedor de identidade

**Status:** Aceita.

**Decisão:** Keycloak é responsável por login, SSO, recuperação de senha e sessões. Fastify gerencia cadastros, recursos e autorizações específicas do CCA.

**Motivo:** evitar implementar protocolos críticos de identidade do zero.

**Consequências:** banco interno dedicado, provisionamento/vínculo de usuários por `sub`, configuração OIDC para cada consumidor e estratégia de revogação/permissões.
