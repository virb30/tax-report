---
trigger: model_decision
description: Regras de backend para o main process
globs: src/main/**/*.ts
---

# Backend Rules

Use esta regra ao alterar codigo em `src/main/**`.

## Main Process

- Mantenha a cobertura de testes do backend em pelo menos 80%.
- Organize o backend em modulos coesos e com responsabilidades claras.
- Prefira classes quando elas agruparem estado, dependencias ou comportamento relacionado.
- Evite concentrar logica no ponto de entrada da aplicacao; distribua inicializacao, configuracao e fluxos em modulos nomeados.
- Evite modulos genericos `utils`; mantenha comportamento perto do modulo responsavel.
- Evite metodos e classes grandes; extraia responsabilidades quando o modulo acumular motivos diferentes para mudar.
- Declare propriedades de classe como `private` ou `readonly`; evite `public` explicito.
- Prefira `find`, `filter`, `map` e `reduce` em vez de `for` e `while` quando isso melhorar a leitura.
- Use named exports.
- Evite dependencias circulares.
- Use tipos utilitarios do TypeScript quando eles deixarem a intencao mais clara.
- Garanta tipagem explicita nas fronteiras do backend, como handlers, repositories, services e use cases.

## Padrões de nomenclatura

Utilize o formato `[nome-da-classe].[tipo].ts`
Exemplos:

- `asset.entity.ts` entidade de domínio que representa o ativo
- `asset.repository.ts` interface do repositório que lida com ativos
- `asset-knex-database.repository.ts` implementação concreta do repositorio de ativos usando banco de dados
- `asset-type.vo.ts` value-object que representa tipo de ativo
- `assets.query.ts` interface para queries que lidam com assets (CQS)
- `create-broker.use-case.ts` use case de criação de corretora
- `create-broker.dto.ts` DTOs de entrada e saída do use case