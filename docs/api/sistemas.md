# Sistemas

Sistema fica em `t025_sistemas`. O nome é único no catálogo. Status é `ATIVADO` ou `DESATIVADO`. Descrição curta e longa são opcionais.

Cada sistema é ligado às empresas que o usam, em `t012_empresas_sistemas`. Uma tela só é concedida numa empresa ligada ao sistema dela. Ver ADR-004.

`DELETE /v1/sistemas/:id` exclui o sistema quando ele não tem módulo nem tela. Com vínculo, a resposta é 409 `delete_restricted`. Os vínculos com empresas saem junto.

Operar estas rotas exige administrador ativo, com a mesma abertura inicial das empresas.

## Contrato

- `POST /v1/sistemas` com `{ "nome", "descricaoCurta?", "descricaoLonga?", "status?", "empresaIds?" }`. Sem status, o padrão é `ATIVADO`. Resposta `201`.
- `GET /v1/sistemas` lista por nome. `?empresaId=` traz só os sistemas daquela empresa.
- `GET /v1/sistemas/:id` lê um sistema.
- `PATCH /v1/sistemas/:id` altera ao menos um campo entre nome, descrições, status e `empresaIds`. `empresaIds` substitui as empresas ligadas.
- `DELETE /v1/sistemas/:id` responde `204` sem corpo.

A resposta traz `empresaIds` em ordem crescente. `:id` é inteiro positivo.

## Erros

| Situação | HTTP | Corpo |
|---|---|---|
| Sem Bearer | 401 | `{ "error": "unauthorized" }` |
| Quem chama não é administrador ativo | 403 | `{ "error": "forbidden" }` |
| Nome vazio, longo demais ou `empresaId` no corpo | 400 | `validation_error` |
| O mesmo nome já existe | 409 | `system_name_conflict` |
| Id inexistente | 404 | `system_not_found` |
| Empresa de `empresaIds` inexistente | 404 | `company_not_found` |
| Tirar empresa que ainda tem tela do sistema | 409 | `system_company_in_use` |
| Sistema com módulo ou tela | 409 | `delete_restricted` |
