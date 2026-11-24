# Importação do catálogo legado

`POST /v1/importacoes/legado` e `npm run import:legacy -- caminho.sql` leem o catálogo já extraído do dump. O arquivo SQL original não é editado nem commitado.

Entra:

- Empresa, com razão social e CNPJ. CNPJ inválido é contado em `documentosIgnorados` e gravado nulo.
- Sistema, como catálogo global, uma vez. Várias empresas não impedem a carga.
- Módulo, menu e submenu, cada um no pai imediato.
- Usuário com e-mail. Sem e-mail, a linha é ignorada. O tipo segue o rótulo do perfil antigo: se começa com `ADMIN`, vira `ADMINITRADOR`; os demais viram `SUPERVISOR`. Status que começa com “ativ” vira `ATIVADO`; o resto, `DESATIVADO`.
- Acesso antigo vira uma linha de tela. A cadeia é lida do submenu para o menu e para o módulo, e o módulo precisa ser do sistema informado.

Não entra senha nem hash. A tabela `t047_usuarios_senhas` existe no banco e a importação não carrega a linha do backup. RG, CPF e celular do dump também não são copiados. Repetir a carga reencontra empresa, nome dentro do pai, e-mail e a mesma tela.

A rota exige administrador ativo, com a mesma abertura inicial do cadastro. O corpo não aceita campo de senha.
