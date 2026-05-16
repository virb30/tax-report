---
trigger: model_decision
description: Regras de backend para o main process
globs: backend/src/**/*.ts
---

# Backend Rules

Use esta regra ao alterar codigo em `backend/src/**`.

## Composition And Modules

- Mantenha a cobertura de testes do backend em pelo menos 80%.
- Organize o backend em modulos coesos e com responsabilidades claras.
- Trate `backend/src/main.ts` como o unico bootstrap global e composition root da aplicacao.
- `main.ts` deve instanciar apenas infraestrutura global, como configuracao, banco, `Http` e `Queue`, alem dos modulos de contexto.
- Cada bounded context deve possuir um `[context].module.ts` class-based.
- O construtor do modulo deve receber dependencias globais e `exports` de modulos upstream quando necessario.
- O construtor do modulo deve instanciar imediatamente repositories, services, use cases, controllers e handlers locais.
- Exponha apenas `module.exports` como superficie publica entre contextos.
- Nao use `register()`, `start()`, `init()`, singletons ou factories globais como padrao de lifecycle de modulo.
- Nao mantenha um registry central de rotas HTTP como padrao.
- Nao use objetos agregados de `useCases` como superficie de integracao entre camadas ou contextos.

## Transport Adapters

- Controllers HTTP devem ser classes em `transport/http/controllers`.
- O construtor do controller deve registrar as rotas imediatamente usando a abstracao `Http`.
- Parsing e validacao superficial de entrada HTTP devem ficar no controller ou em `transport/http/validation`.
- Handlers de fila/eventos devem ser classes em `transport/queue/handlers`.
- O construtor do handler deve registrar as assinaturas imediatamente usando `Queue`.
- Controllers e handlers devem delegar a logica de negocio para use cases ou services; nao concentre regra de negocio no adaptador de transporte.

## General Practices

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

## Padroes de nomenclatura

Utilize o formato `[nome-da-classe].[tipo].ts`.

Exemplos:

- `portfolio.module.ts`: composition root local do contexto de portfolio.
- `asset.entity.ts`: entidade de dominio que representa o ativo.
- `asset.repository.ts`: interface do repositorio que lida com ativos.
- `asset-knex-database.repository.ts`: implementacao concreta do repositorio de ativos usando banco de dados.
- `asset-type.vo.ts`: value object que representa tipo de ativo.
- `assets.query.ts`: interface para queries que lidam com assets (CQS).
- `create-broker.use-case.ts`: use case de criacao de corretora.
- `create-broker.dto.ts`: DTOs de entrada e saida do use case.
- `list-assets.controller.ts`: controller HTTP do contexto.
- `recalculate-position.handler.ts`: handler de fila/evento do contexto.
