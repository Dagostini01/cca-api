# Usuários

Usuário de negócio é `t045_usuarios`. O identificador é inteiro. O login continua no Keycloak. A CCA guarda nome, sobrenome, apelido, e-mail, RG, CPF, celular, tipo (`ADMINITRADOR` ou `SUPERVISOR`), status e o `sub`.

`ID_USUARIO_INCLUSAO` recebe o administrador do token. No primeiro usuário, quando ainda não há cadastro local, fica nulo.

`POST /v1/usuarios` cria a pessoa e as telas na mesma transação. Cada item de `telas` é `{ empresaId, sistemaId, moduloId, menuId, submenuId }` e vira uma linha em `t052_usuarios_acessos`. A cadeia tem de ser coerente.

E-mail presente cria o usuário no Keycloak sem senha: username é o e-mail em minúsculas, `firstName` é o nome, a conta nasce habilitada quando o status não é `DESATIVADO`, `emailVerified` fica falso e a ação exigida é `UPDATE_PASSWORD`. Com `keycloakSub`, a API liga a conta se ela existir. Sem `sub` e sem o provisionador, a resposta é `invalid_user_subject`.

`POST /v1/usuarios/:id/codigo-acesso` gera um código de uso único no formato `XXXX-XXXX-XXXX` e grava esse valor no Keycloak como senha temporária, que exige `UPDATE_PASSWORD`. Também encerra as sessões abertas da conta. No login, a pessoa informa e-mail e código, e o Keycloak pede a nova senha. O código vale um login. Gerar outro invalida o anterior e também a senha atual. O valor só aparece nessa resposta, com `Cache-Control: no-store`, e o CCA não o guarda. A auditoria registra só que houve emissão. Só o administrador que pode gerir o usuário chama a rota. Usuário `DESATIVADO` recebe `access_code_unavailable`. Não existe rota sem token para definir senha.

`GET /v1/usuarios` devolve só os usuários criados pelo administrador logado. `GET /v1/usuarios/eu` é o próprio usuário do token e não exige o cadastro geral.

`GET /v1/usuarios/:id/telas` responde no formato da consulta de exemplo: sistema, módulo, menu e submenu, só das linhas `ATIVADO`. O próprio usuário ativo lê as suas. O administrador que o criou também. Usuário sem autor pode ser lido por qualquer administrador ativo.

`PATCH` pode trocar o conjunto de telas. A lista enviada substitui as linhas daquele usuário. Lista vazia limpa. Só o administrador que criou o usuário faz isso, ou qualquer administrador ativo quando `criadoPorId` é nulo. `keycloakSub` não muda. Nome, e-mail e status também atualizam o Keycloak quando há `sub` e e-mail.

`DELETE` remove o cadastro quando ele não criou outros usuários e não tem tela nem auditoria. A conta no Keycloak permanece. Se quem apaga é o próprio `sub`, a API não grava o evento `EXCLUIR` dessa exclusão, para a linha nova não impedir o delete.

RG, CPF e celular podem ir no corpo. A API não escreve esses valores em log. A resposta de validação também não devolve o valor recebido.

## Contrato

```json
{
  "nome": "Ana",
  "email": "ana@exemplo.com",
  "tipo": "SUPERVISOR",
  "telas": [
    { "empresaId": 1, "sistemaId": 1, "moduloId": 1, "menuId": 1, "submenuId": 1 }
  ]
}
```

Nome e e-mail são obrigatórios. Sem tipo, o padrão é `ADMINITRADOR`. Sem status, o padrão é `ATIVADO`.

## Erros

| Situação | HTTP | Corpo |
|---|---|---|
| E-mail ou `sub` repetido | 409 | `user_email_conflict` ou `user_subject_conflict` |
| `sub` que não é UUID, ou criação sem diretório e sem `sub` | 400 | `invalid_user_subject` |
| `sub` ausente no diretório | 404 | `identity_subject_not_found` |
| E-mail já usado no diretório | 409 | `identity_email_conflict` |
| Tela com cadeia quebrada | 400 | `incoherent_screen` |
| A mesma tela duas vezes | 409 | `access_conflict` |
| Id inexistente | 404 | `user_not_found` |
| Outro administrador tenta alterar quem não criou | 403 | `forbidden` |
| Usuário com filhos, tela ou auditoria | 409 | `delete_restricted` |
| Código de acesso para usuário desativado, sem `sub` ou sem provisionador | 409 | `access_code_unavailable` |
