---
trigger: model_decision
description: Regras de estrutura de pastas para backend e frontend
---

# Folder Structure Rules

Use esta regra ao criar, mover ou revisar arquivos e pastas em `backend/src/**` e `frontend/src/**`.

## Root Folders

- `backend/src`: codigo backend.
- `frontend/src`: codigo frontend.
- `backend/src/main.ts`: ponto de entrada do backend. Deve orquestrar apenas a infraestrutura global e a instanciacao dos modulos de contexto.

## Backend

Em `backend/src`, `main.ts` e o composition root global.
No primeiro nivel, mantenha `shared/` para infraestrutura global compartilhada e um diretorio por bounded context.
Dentro de cada contexto, use um modulo local e separe as camadas necessarias:

```text
backend/src/
  main.ts
  shared/
    infra/
      http/
        http.interface.ts
        express-adapter.http.ts
        middleware/
        errors/
  [bounded-context]/
    [bounded-context].module.ts
    domain/
      entities/
      value-objects/
      services/
      repositories/
    application/
      use-cases/
      services/
      repositories/
    infra/
      database/
        migrations/
        seeds/
      repositories/
        [name].[type].repository.ts
    transport/
      http/
        controllers/
        validation/
      queue/
        handlers/
```

### Domain

- `domain/entities`: entidades do dominio.
- `domain/value-objects`: value objects do dominio.
- `domain/services`: servicos de dominio.
- `domain/repositories`: interfaces dos repositorios quando o contexto adotar esse limite.

### Application

- `application/use-cases`: use cases do contexto.
- `application/use-cases/[use-case].use-case.ts`: implementacao do use case. Todo use case deve definir e exportar seus tipos de input e output no mesmo arquivo.
- `application/services`: servicos de aplicacao.
- `application/repositories`: portas/repositories consumidos pela aplicacao quando o contexto adotar esse limite.

### Infra

- `infra/database`: configuracoes de conexao com banco de dados.
- `infra/database/migrations`: arquivos de migration.
- `infra/database/seeds`: arquivos de seed.
- `infra/repositories`: implementacoes concretas dos repositorios.
- `infra/repositories/[name].[type].repository.ts`: implementacao por tipo de repositorio, por exemplo `assets.database.repository.ts` ou `assets.memory.repository.ts`.
- Nao crie `infra/container` como padrao. A composicao deve acontecer em `backend/src/main.ts` e em `[bounded-context].module.ts`.

### Transport

- `transport/http/controllers`: controllers HTTP do contexto. Cada controller registra suas rotas no construtor.
- `transport/http/validation`: schemas, parsers e validacoes superficiais das entradas HTTP.
- `transport/queue/handlers`: handlers de fila/eventos do contexto. Cada handler registra suas assinaturas no construtor.

### Modules

- `[bounded-context].module.ts`: composition root local do contexto.
- O modulo recebe dependencias globais e `exports` de outros modulos quando necessario.
- O modulo instancia internamente repositories, services, use cases, controllers e handlers locais.
- O modulo deve expor apenas uma propriedade `exports` com a menor superficie necessaria para outros contextos.

## Shared Backend Code

- Classes compartilhadas entre multiplos bounded contexts devem ficar em `backend/src/shared`.
- `shared/infra/http/**` concentra `Http`, `ExpressAdapter`, middlewares globais, tratamento de erros e helpers de bootstrap HTTP.
- Evite mover logica especifica de um contexto para `shared` sem reutilizacao real.

## Frontend

Em `frontend/src`, mantenha arquivos React separados por tipo de componente:

```text
frontend/src/
  pages/
    [page-name]/
      [PageName].tsx
      [PageName].test.tsx
      components/
        [component-name]/
          [ComponentName].tsx
          [ComponentName].test.tsx
      hooks/
      utils/
  components/
  hooks/
  types/
  services/
```

- `pages`: paginas da aplicacao. Todo componente renderizado por uma pagina ou rota deve ficar aqui.
- `pages/[page-name]`: pasta de uma tela navegavel.
- `pages/[page-name]/[PageName].tsx`: componente da pagina.
- `pages/[page-name]/[PageName].test.tsx`: testes da pagina.
- `pages/[page-name]/components`: componentes especificos da pagina.
- `pages/[page-name]/components/[component-name]`: pasta de um componente especifico da pagina.
- `pages/[page-name]/components/[component-name]/[ComponentName].tsx`: componente especifico da pagina.
- `pages/[page-name]/components/[component-name]/[ComponentName].test.tsx`: testes do componente especifico da pagina.
- `pages/[page-name]/hooks`: hooks especificos da pagina.
- `pages/[page-name]/utils`: utilitarios especificos da pagina.
- `components`: componentes de UI reutilizaveis por mais de uma pagina.
- `hooks`: hooks reutilizaveis por mais de uma pagina.
- `types`: tipos compartilhados no frontend.
- `services`: chamadas a servicos externos, incluindo APIs e IPC.

## Shared Contracts

- Contratos compartilhados entre backend e frontend devem ficar em um local explicito e estavel, evitando importar detalhes de infraestrutura entre processos.
