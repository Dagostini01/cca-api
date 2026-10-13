# ADR-002 — Hierarquia obrigatória a partir da empresa

**Status:** Aceita.

**Decisão:** nenhum sistema existe sem empresa. A partir daí a posse é obrigatória em cada nível:

Empresa → Sistema → Módulo → Menu → Submenu

Criar um filho sem o pai é inválido. O identificador do pai é obrigatório e a exclusão do pai fica restrita enquanto houver filhos.

**Motivo:** o protótipo cadastra sistema dentro de uma empresa, módulo dentro de um sistema, menu dentro de um módulo e submenu dentro de um menu. O dump legado deixa `t025_sistemas` como catálogo global e repete empresa, sistema, módulo, menu e submenu em `t052_usuarios_acessos`, o que permite combinações incoerentes.

**Consequências:**

- A empresa dona de um submenu é a empresa do sistema ancestral. Não se grava uma empresa independente no acesso se ela puder divergir dessa cadeia.
- Permissão de visualizar, criar, editar ou excluir só pode apontar para um recurso dessa mesma cadeia.
- Dois sistemas com o mesmo nome podem existir em empresas diferentes. A unicidade do nome, quando houver, é dentro do pai.
- A migration `20261013220000_ownership_hierarchy` cria essa cadeia. Ela não reaproveita o catálogo solto do legado.
- Perfis, usuários e auditoria continuam para um passo seguinte. Eles também terão de respeitar a empresa da cadeia, mas este ADR não desenha essas tabelas.
