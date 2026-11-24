# Referência da API

A referência interativa fica em [`/docs/`](http://127.0.0.1:3000/docs/). O documento OpenAPI 3.1 sai de [`/docs/openapi.json`](http://127.0.0.1:3000/docs/openapi.json).

O Scalar monta a página. Os corpos, parâmetros e respostas descritos ali são os mesmos schemas Zod usados nas rotas. A página e o JSON são públicos no ambiente local e não pedem token. Não publique essa URL numa rede aberta sem antes decidir quem pode lê-la: o contrato não contém segredo, mas descreve a superfície da API.

Login, senha e redefinição continuam no Keycloak. As rotas `/v1` pedem `Authorization: Bearer`. O navegador em `http://127.0.0.1:4173` ou `http://localhost:4173` pode chamar esta API. Outra origem precisa estar em `CORS_ORIGINS`.

As regras de cada recurso estão em `empresas.md`, `sistemas.md`, `cadeia.md`, `usuarios.md`, `acessos.md`, `autorizacao.md`, `auditoria.md` e `importacao.md`. Perfil e permissão com quatro ações não fazem parte do contrato.
