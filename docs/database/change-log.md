# Histórico de mudanças do banco

## 000 — Baseline

- Backup legado recebido e preservado fora do repositório.
- Nenhuma alteração SQL aplicada.

## 001 — Leitura do dump, sem DDL

- Problema: o resumo anterior ainda não tinha sido conferido contra o arquivo.
- Estrutura lida: 18 tabelas do MySQL 5.7.32, banco `cca`, charset predominante `latin1`.
- Alteração proposta: nenhuma neste passo. A direção está em `docs/database/legacy-schema.md`.
- Justificativa: corrigir senha, chave estrangeira, `sub` do Keycloak e permissões antes de criar o schema Prisma.
- Impacto: o MySQL do Compose continua vazio. O backup original não foi importado nem editado.
- Migration: não há.
- Rollback: não se aplica.

## 002 — Hierarquia obrigatória, sem DDL

- Problema: `t025_sistemas` não exige empresa, e `t052_usuarios_acessos` pode combinar nós de cadeias diferentes.
- Estrutura original: sistema global; módulo, menu e submenu já apontam para o pai imediato.
- Alteração proposta: Empresa → Sistema → Módulo → Menu → Submenu, com pai obrigatório. Registrada no ADR-002. Nenhuma tabela foi criada.
- Justificativa: o cadastro e a permissão precisam seguir a mesma posse mostrada no protótipo.
- Impactos: a migration futura não copia sistema sem empresa. Acesso e permissão derivam a empresa pela cadeia.
- Migration: não há.
- Rollback: não se aplica.

## 003 — Cadeia de posse

- Problema: o banco `cca` do Compose estava vazio e o legado não amarrava sistema à empresa.
- Estrutura original: `t025_sistemas` sem empresa; módulo, menu e submenu já apontavam para o pai imediato.
- Alteração: tabelas `empresas`, `sistemas`, `modulos`, `menus` e `submenus`, com pai obrigatório, `ON DELETE RESTRICT`, nome único dentro do pai, nome não vazio e charset `utf8mb4`.
- Justificativa: ADR-002. O protótipo cadastra cada nível dentro do anterior.
- Impactos: essas tabelas nascem vazias. Usuários, perfis, permissões e auditoria continuam de fora. A API ainda não expõe CRUD.
- Migration: `prisma/migrations/20261013220000_ownership_hierarchy/migration.sql`.
- Rollback: nova migration, nesta ordem, `DROP TABLE submenus, menus, modulos, sistemas, empresas`. Não editar a migration já aplicada.

## 004 — API de empresas, sem DDL

- Problema: a tabela `empresas` existia, mas nenhum caso de uso a gravava.
- Alteração: nenhuma no schema. A API passa a criar, listar, consultar e atualizar `empresas`.
- Justificativa: o contrato está em `docs/api/empresas.md`. Status `INATIVO` substitui a exclusão física nesta etapa.
- Impactos: sistemas, módulos, menus, submenus, usuários e permissões continuam sem CRUD.
- Migration: não há.
- Rollback: reverter o código. As linhas já gravadas permanecem na tabela.

## 005 — API de sistemas, sem DDL

- Problema: a tabela `sistemas` exigia empresa, mas a API ainda não gravava nela.
- Alteração: nenhuma no schema. A API passa a criar, listar, consultar e atualizar `sistemas`, sempre com `empresa_id`.
- Justificativa: ADR-002. O contrato está em `docs/api/sistemas.md` e na referência `/docs/`.
- Impactos: módulos, menus, submenus, usuários e permissões continuam sem CRUD.
- Migration: não há.
- Rollback: reverter o código. As linhas já gravadas permanecem na tabela.

## 006 — API de módulos, menus e submenus, sem DDL

- Problema: a cadeia abaixo de sistema existia no banco, mas a API ainda não gravava nela.
- Alteração: nenhuma no schema. A API passa a criar, listar, consultar e atualizar `modulos`, `menus` e `submenus`, cada um com o pai imediato obrigatório.
- Justificativa: ADR-002. O contrato está em `docs/api/cadeia.md` e na referência `/docs/`.
- Impactos: usuários, perfis, permissões e auditoria continuam sem CRUD.
- Migration: não há.
- Rollback: reverter o código. As linhas já gravadas permanecem na tabela.

## 007 — Usuário de negócio

- Problema: o Keycloak autentica, mas a CCA ainda não tinha o cadastro local ligado ao `sub`.
- Estrutura: tabela `usuarios`, com `keycloak_sub` único, e-mail único, empresa obrigatória, status e datas. Sem senha, RG ou CPF.
- Justificativa: o protótipo lista nome, e-mail, empresa e status. O vínculo com o login é o `sub`, e ele não muda depois da criação.
- Impactos: perfis, permissões, auditoria e o provisionamento do usuário no Keycloak continuam de fora. `/v1/me` não consulta esta tabela.
- Migration: `prisma/migrations/20261014000000_business_users/migration.sql`.
- Rollback: nova migration com `DROP TABLE usuarios`. Não editar a migration já aplicada. As CHECKs de nome, e-mail e `sub` não vazios precisam ser preservadas se um `migrate dev` futuro tentar removê-las.

## 008 — Perfil de acesso

- Problema: o protótipo lista perfis reutilizáveis, mas a CCA ainda não tinha esse cadastro.
- Estrutura: tabela `perfis`, com empresa obrigatória, nome único dentro da empresa, descrição opcional e status. Sem permissões e sem vínculo com usuário.
- Justificativa: o formulário pede nome, descrição e status. O perfil segue a mesma posse da empresa que o restante do cadastro.
- Impactos: um token válido continua autorizado em todas as rotas. Permissões, vínculo usuário-perfil e auditoria continuam de fora.
- Migration: `prisma/migrations/20261014010000_access_profiles/migration.sql`.
- Rollback: nova migration com `DROP TABLE perfis`. Não editar a migration já aplicada. A CHECK de nome não vazio e a de descrição nula ou não vazia precisam ser preservadas se um `migrate dev` futuro tentar removê-las.

## 009 — Permissão do perfil

- Problema: o perfil existia, mas não havia como marcar visualizar, criar, editar e excluir sobre um nó da cadeia.
- Estrutura: tabela `permissoes`, com perfil obrigatório, exatamente um recurso (sistema, módulo, menu ou submenu) e as quatro ações. A empresa não é coluna: ela sai do ancestral do recurso.
- Justificativa: ADR-002. O protótipo mostra a matriz de ações por recurso. O mesmo par perfil + recurso não se repete.
- Impactos: as rotas existentes continuam aceitando qualquer token válido. O usuário ainda não é ligado ao perfil. Auditoria continua de fora.
- Migration: `prisma/migrations/20261014020000_profile_permissions/migration.sql`.
- Rollback: nova migration com `DROP TABLE permissoes`. Não editar a migration já aplicada. A CHECK que exige exatamente um recurso, coerente com `recurso_tipo`, precisa ser preservada se um `migrate dev` futuro tentar removê-la.

## 010 — Acesso do usuário

- Problema: a permissão estava no perfil, mas o usuário ainda não usava esse perfil em um sistema.
- Estrutura: tabela `acessos`, com usuário, perfil, sistema e status. O par usuário + sistema é único. A empresa não é coluna.
- Justificativa: o protótipo mostra, na ficha do usuário, o sistema e o perfil juntos. Os três cadastros precisam ser da mesma empresa.
- Impactos: as rotas existentes continuam aceitando qualquer token válido. Auditoria e o provisionamento no Keycloak continuam de fora.
- Migration: `prisma/migrations/20261014030000_user_accesses/migration.sql`.
- Rollback: nova migration com `DROP TABLE acessos`. Não editar a migration já aplicada.

## 011 — Permissão de empresa e autorização

- Problema: o acesso existia, mas as rotas ainda aceitavam qualquer token válido. Os cadastros de empresa, usuário, perfil, permissão e acesso não tinham um recurso na matriz.
- Estrutura: `permissoes.empresa_id`, o valor `EMPRESA` em `recurso_tipo` e a CHECK `permissoes_um_recurso` recriada com esse ramo. A autorização não cria tabela.
- Justificativa: a mesma matriz passa a governar o catálogo da empresa e a criação de sistema. Enquanto `acessos` está vazia, a API não se tranca.
- Impactos: com ao menos um acesso, as rotas `/v1` exigem a ação. `GET /v1/me` e `GET /v1/usuarios/eu` ficam de fora. Auditoria e o provisionamento no Keycloak continuam de fora.
- Migration: `prisma/migrations/20261014040000_company_permissions/migration.sql`.
- Rollback: nova migration que remove a CHECK, o índice, a chave e a coluna `empresa_id`, e devolve o enum sem `EMPRESA`, somente se não houver linha desse tipo. Não editar a migration já aplicada. A CHECK `permissoes_um_recurso` precisa ser preservada se um `migrate dev` futuro tentar removê-la.

## 012 — Auditoria

- Problema: as alterações de cadastro não deixavam histórico. A tela de auditoria pede data e hora, usuário, ação e descrição.
- Estrutura: tabela `auditorias`, só de inclusão. Guarda a ação `CRIAR` ou `ATUALIZAR`, o recurso, a descrição, a empresa e, quando existe, o usuário local com o nome daquele momento. Não guarda `sub` nem e-mail.
- Justificativa: o protótipo mostra o histórico das alterações. Login e logout continuam no Keycloak. O cliente não corrige uma linha já gravada.
- Impactos: criar ou atualizar um cadastro passa a gravar uma linha. A consulta exige visualizar a empresa do evento. O provisionamento no Keycloak e a importação do backup continuam de fora.
- Migration: `prisma/migrations/20261014050000_audit_trail/migration.sql`.
- Rollback: nova migration com `DROP TABLE auditorias`. Não editar a migration já aplicada. As CHECK de descrição e de coerência do usuário precisam ser preservadas se um `migrate dev` futuro tentar removê-las.

## 013 — Provisionamento no Keycloak

- Problema: o cadastro local exigia um `sub` já conhecido. A API não criava a conta no realm.
- Estrutura: nenhuma tabela nova. `usuarios.keycloak_sub` continua recebendo o id do Keycloak. O cliente confidencial `cca-provisioner` usa service account.
- Justificativa: o Keycloak continua dono da senha. A CCA cria a conta sem senha, com a ação `UPDATE_PASSWORD`, ou liga um `sub` que já existe.
- Impactos: `POST /v1/usuarios` sem `keycloakSub` cria o usuário no realm. Com `keycloakSub`, só liga se ele existir. `PATCH` de nome, e-mail ou status atualiza a mesma conta. A importação do backup continua de fora.
- Migration: não há.
- Rollback: remover o cliente `cca-provisioner` no realm e voltar a exigir `keycloakSub` na criação. Não há DDL para desfazer.
