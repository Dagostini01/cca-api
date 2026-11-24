# ADR-004 — Empresas que usam cada sistema

**Status:** Aceita. Complementa o ADR-003.

**Decisão:** empresa e sistema se ligam N:N pela tabela `t012_empresas_sistemas` (`ID_EMPRESA`, `ID_SISTEMA`, `DT_INCLUSAO`). Um sistema pode servir várias empresas e uma empresa pode usar vários sistemas. `t025_sistemas` continua igual ao script do stakeholder.

Uma tela só pode ser concedida numa empresa ligada ao sistema dela. Fora disso, a API responde 400 `system_not_in_company`.

**Motivo:** com o sistema global e a empresa só na linha de acesso, qualquer empresa recebia qualquer sistema. O cadastro não dizia a que empresa um sistema pertence.

**Consequências:**

- `POST` e `PATCH /v1/sistemas` aceitam `empresaIds`. No `PATCH`, a lista substitui as empresas ligadas.
- Tirar uma empresa que ainda tem tela daquele sistema devolve 409 `system_company_in_use`.
- `GET /v1/sistemas?empresaId=` lista só os sistemas da empresa.
- Excluir empresa ou sistema apaga os vínculos. As telas continuam impedindo a exclusão, como antes.
- A migration liga cada sistema às empresas onde ele já tinha tela. Os demais ficam sem empresa até serem ligados.
- A importação do legado liga empresa e sistema de cada acesso importado.
