# Acessos

Um acesso é uma linha em `t052_usuarios_acessos`: usuário, empresa, sistema, módulo, menu e submenu. Poder abrir a tela é ter essa linha com status `ATIVADO`.

O caminho principal de gravar tela é `telas` no cadastro do usuário. `POST /v1/acessos` acrescenta uma tela. `PATCH` muda só o status. `DELETE` remove a linha. O par usuário + submenu não se repete.

A cadeia tem de fechar: o submenu pertence ao menu, o menu ao módulo e o módulo ao sistema. Combinação quebrada responde 400 `incoherent_screen`.

`GET /v1/acessos` exige `usuarioId`. O próprio usuário ativo lê as suas linhas. O administrador que o criou também.

## Contrato

```json
{
  "usuarioId": 2,
  "empresaId": 1,
  "sistemaId": 1,
  "moduloId": 1,
  "menuId": 1,
  "submenuId": 1
}
```

Sem status, o padrão é `ATIVADO`. O tipo da linha segue o tipo do usuário. Resposta `201`.

## Erros

| Situação | HTTP | Corpo |
|---|---|---|
| Usuário inexistente | 404 | `user_not_found` |
| Nó da cadeia inexistente | 404 | `company_not_found`, `system_not_found`, `module_not_found`, `menu_not_found` ou `submenu_not_found` |
| Cadeia incoerente | 400 | `incoherent_screen` |
| A mesma tela já concedida | 409 | `access_conflict` |
| Quem chama não administra esse usuário | 403 | `forbidden` |
