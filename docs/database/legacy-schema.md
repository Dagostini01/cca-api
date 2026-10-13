# Esquema legado recebido

Fonte local: `bkp_01-10-2026-18-35.sql`, na raiz do workspace. O arquivo permanece fora do Git por `*.sql` no `.gitignore` e não foi alterado.

Origem do dump: MySQL Community Server 5.7.32, exportado pelo HeidiSQL. O banco se chama `cca`. O comentário do arquivo ainda cita o nome antigo `sso`. São 18 tabelas. Nenhuma migration foi aplicada.

## Tabelas

| Tabela | Papel |
|---|---|
| `t010_empresas` | Empresa |
| `t011_empresas_enderecos` | Endereço da empresa |
| `t025_sistemas` | Catálogo de sistemas, sem vínculo direto com empresa |
| `t030_modulos` | Módulo de um sistema |
| `t035_menus` | Menu de um módulo |
| `t040_submenus` | Submenu de um menu |
| `t041_tp_contatos` | Tipo/contato ligado à empresa |
| `t042_tp_enderecos` | Tipo de endereço |
| `t045_usuarios` | Usuário de negócio, com RG, CPF, e-mail e celular |
| `t046_tp_status` | Status compartilhado |
| `t047_usuarios_senhas` | Senha legada |
| `t048_tp_usuarios` | Tipo de usuário |
| `t050_tp_auditorias` | Tipo de auditoria |
| `t052_usuarios_acessos` | Vínculo usuário, empresa, sistema, módulo, menu e submenu |
| `t070_auditorias` | Registro de auditoria e também campos de login/logout |
| `t072_ceps` | CEP |
| `t074_estados` | UF |
| `t076_cidades` | Cidade |

A hierarquia de navegação é sistema → módulo → menu → submenu. A empresa entra pelo acesso em `t052_usuarios_acessos`, não por uma chave de `t025_sistemas`. A consulta de exemplo em `query-exemplo-controle-acesso.txt` segue esse caminho.

## Problemas confirmados no SQL

1. `t047_usuarios_senhas.DS_SENHA` existe junto com `HASH`. Há um registro em que `DS_SENHA` é um texto curto, sem formato de hash hexadecimal, e `HASH` também está preenchido. O valor não deve ser copiado para documentação, log ou outro ambiente. Credencial fica no Keycloak.
2. `t052_usuarios_acessos.ID_TP_USUARIO` referencia `t045_usuarios.ID_USUARIO`. O nome da coluna aponta para `t048_tp_usuarios`. A tabela de acessos está vazia no dump, então a correção não depende de reescrever linhas existentes.
3. `t045_usuarios` não tem coluna para o `sub` do Keycloak.
4. Não há ações visualizar, criar, editar e excluir. O acesso é uma linha por submenu.
5. Charset `latin1` na maior parte do negócio e `utf8mb4` em CEP, estado e cidade. Colunas `NÚMERO` e `DS_MUNICÍPIO` usam acento no identificador.
6. `t070_auditorias` não tem chave estrangeira para usuário nem para tipo de auditoria. `t048_tp_usuarios` e `t050_tp_auditorias` também não referenciam `t046_tp_status`.
7. Nomes de constraint de CEP e cidade citam tabelas `t073` e `t075`, que não existem neste dump. As referências reais são `t072_ceps`, `t074_estados` e `t076_cidades`.
8. O servidor de origem é MySQL 5.7. O Compose local usa MySQL 8.0. `int(11)` e `int(3)` são largura de exibição do 5.7 e não devem ser reproduzidos como regra de negócio.

## Decisão de hierarquia

Aceita em `docs/decisions/ADR-002-ownership-hierarchy.md`.

Empresa → Sistema → Módulo → Menu → Submenu. Cada nível exige o pai e permanece amarrado a ele. O catálogo global de `t025_sistemas` não será reproduzido.

Ainda fora desta migration:

- Não importar `t047_usuarios_senhas`. O vínculo do usuário CCA com o Keycloak será o `sub`.
- Tratar menu como navegação e permissão como ação sobre um recurso dessa mesma cadeia.
- RG e CPF são dados pessoais. A importação, se ocorrer, precisa de avaliação própria e não entra em ambiente compartilhado junto com a senha legada.
