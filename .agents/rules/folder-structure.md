---
trigger: model_decision
description: Regras de estrutura de pastas para main, renderer e shared
---

# Folder Structure Rules

Use esta regra ao criar, mover ou revisar arquivos e pastas em `src/**`.

## Root Folders

- `src/main`: codigo backend.
- `src/renderer`: codigo frontend.
- `src/shared`: codigo compartilhado entre backend, preload e frontend.
- `src/main/main.ts`: ponto de entrada da aplicacao. Deve orquestrar a inicializacao do backend, a criacao da janela Electron e a inicializacao do frontend.

## Main Process

Em `src/main`, o primeiro nivel deve ser o bounded context em que estamos trabalhando.
Dentro de cada contexto, separe as camadas necessarias:

```text
src/main/
  [bounded-context]/
    domain/
      entities/
      value-objects/
      services/
      repositories/
    application/
      use-cases/
          [use-case].use-case.ts
          [use-case].use-case.spec.ts
      services/
    infra/
      database/
        migrations/
        seeds/
      repositories/
        [name].[type].repository.ts
      container/
      queue/
    transport/
      handlers/
```

### Domain

- `domain/entities`: entidades do dominio.
- `domain/value-objects`: value objects do dominio.
- `domain/services`: servicos de dominio.
- `domain/repositories`: interfaces dos repositorios.

### Application

- `application/use-cases`: use cases do contexto.
- `application/use-cases/[use-case]`: pasta de um use case especifico, nomeada pela intencao do usuario.
- `application/use-cases/[use-case]/[use-case].ts`: implementacao do use case. Todo use-case deve definir e exportar seus tipos de input e output.
- `application/services`: servicos de aplicacao.

### Infra

- `infra/database`: configuracoes de conexao com banco de dados.
- `infra/database/migrations`: arquivos de migration.
- `infra/database/seeds`: arquivos de seed.
- `infra/repositories`: implementacoes concretas dos repositorios.
- `infra/repositories/[name].[type].repository.ts`: implementacao por tipo de repositorio, por exemplo `assets.database.repository.ts` ou `assets.memory.repository.ts`.
- `infra/container`: container de injecao de dependencias.
- `infra/queue`: portas e adaptadores para filas.

### Transport

- `transport/handlers`: handlers de IPC e eventos. Esta camada equivale a controllers em contexto web.

## Shared Main Code

Classes compartilhadas entre multiplos bounded contexts devem ficar em `src/main/shared`.
Use o mesmo padrao estrutural de um contexto especifico, incluindo apenas as camadas necessarias.

## Renderer Process

Em `src/renderer`, mantenha arquivos React separados por tipo de componente:

```text
src/renderer/
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

Em `src/shared`, mantenha arquivos compartilhados entre `main` e `renderer`.
Esta pasta deve conter todos os contratos usados pelo `preload.ts` para viabilizar a comunicacao entre renderer e main.