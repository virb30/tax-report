# Refatoracao de `src/shared`: Domain Types e Year Utils

## Summary

`src/shared/types/domain.ts` hoje mistura vocabulario serializavel usado entre `main`,
`preload` e `renderer` com tipos que parecem legados. `src/shared/utils/year.ts` mistura
regra compartilhada de validacao de ano com helpers especificos de UI.

A direcao recomendada e reduzir `src/shared` ao que realmente atravessa fronteiras entre
processos e mover conceitos especificos para seus bounded contexts.

## Findings

### `src/shared/types/domain.ts`

Mantem valor compartilhado hoje:

- `AssetType`: usado amplamente em dominio, contratos preload e UI.
- `TransactionType`: usado em portfolio, ingestion, contratos e testes.
- `SourceType`: usado em transacoes, importacoes e persistencia.
- `AssetTypeSource`: usado no catalogo de ativos e contratos.
- `ReportItemStatus` e `PendingIssueCode`: usados em tax-reporting, contratos e UI.

Mais especificos de contexto:

- `AssetResolutionStatus` e `UnsupportedImportReason`: pertencem principalmente a ingestion/import
  review.
- `OperationType`: usado so no parser/mapper de ingestion; nao parece precisar estar em `shared`.

Provavelmente mortos:

- `Asset`: nao ha importacoes reais de `src/shared/types/domain`.
- `Operation`: nao ha importacoes reais de `src/shared/types/domain`.

### `src/shared/utils/year.ts`

Faz sentido manter compartilhado:

- `YEAR_RANGE`
- `assertSupportedYear`

Melhor como helper de renderer:

- `getDefaultBaseYear`
- `buildYearOptions`

## Recommended Refactor

1. Remover `Asset` e `Operation` de `src/shared/types/domain.ts`.
2. Manter uma etapa conservadora inicialmente: nao mover todos os enums ainda, para evitar uma
   troca grande de imports.
3. Em uma segunda etapa, separar enums por contexto:
   - Portfolio: `AssetType`, `AssetTypeSource`, `TransactionType`, `SourceType`.
   - Ingestion: `AssetResolutionStatus`, `UnsupportedImportReason`, `OperationType`.
   - Tax-reporting: `ReportItemStatus`, `PendingIssueCode`.
4. Dividir `year.ts`:
   - Regra compartilhada permanece em `src/shared/utils/year.ts`: `YEAR_RANGE`,
     `assertSupportedYear`.
   - Helpers de UI vao para renderer: `getDefaultBaseYear`, `buildYearOptions`.

## Test Plan

- Rodar busca por imports apos remover `Asset` e `Operation`.
- Atualizar imports dos helpers de ano no renderer se forem movidos.
- Rodar:
  - `npm test`
  - `npm run lint`
  - `npm run format`

## Assumptions

- A primeira mudanca deve ser conservadora: remover apenas tipos mortos e, se desejado, mover
  helpers de UI.
- A separacao completa dos enums por contexto e melhor como refactor posterior, porque `AssetType`
  e outros enums tem uso amplo em backend, contratos e UI.
