# Importação do legado

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra de negócio.

`POST /v1/importacoes/legado` recebe o catálogo já separado do dump. O corpo não tem senha, RG, CPF nem celular. Um campo desconhecido, inclusive esses, responde `validation_error`.

O script `npm run import:legacy -- caminho.sql` lê um dump HeidiSQL na máquina, descarta essas colunas e grava pelo mesmo caso de uso. Ele não altera o arquivo e não imprime o conteúdo das linhas. A resposta é só a contagem.

## O que entra

- Empresa, com o nome fantasia quando existe. CNPJ inválido vira nulo e conta em `documentosIgnorados`.
- Sistema, módulo, menu e submenu, com o nome principal e o status. `ATIVADO` vira `ATIVO`. Os demais rótulos viram `INATIVO`.
- Perfil a partir do tipo de usuário, em cada empresa importada, sem descrição.
- Usuário só quando há e-mail e um `sub`. O `sub` vem em `vinculos` ou, na API, da criação no Keycloak. Sem e-mail, a linha é ignorada.
- Acesso antigo vira permissão de visualizar no submenu e um acesso do usuário ao perfil naquele sistema. Criar, editar e excluir ficam desligados.

Um sistema do dump não tem empresa. Se o arquivo tem uma única empresa, a cadeia inteira fica nela. Se há várias, o sistema só entra nas empresas citadas por um acesso. Sem esse vínculo, a importação não grava nada e responde `legacy_system_owner_unknown`.

Repetir a importação reencontra o mesmo nome dentro do pai e conta como existente. A importação não apaga cadastros.

## O que fica de fora

Senha, RG, CPF, celular, endereço, CEP, contato e a auditoria antiga de login. `senhasIgnoradas` é só a quantidade de linhas de senha que não foram lidas para o catálogo.
