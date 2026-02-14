# Tarefa 11.0: Recálculo de Posição + Migração entre Anos

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o recálculo completo de posição a partir do histórico de transações (para correções retroativas) e o fluxo de migração entre anos (carregar posições de 31/12 do ano anterior como transações `InitialBalance` do novo ano). Ao final, o usuário consegue acionar o recálculo de uma posição e migrar as posições de um ano-base para iniciar o próximo.

<requirements>
- `RecalculatePositionUseCase`: reprocessa TODAS as transações de um ticker em ordem cronológica, reconstrói o aggregate `AssetPosition` do zero e persiste o resultado
- `MigrateYearUseCase`: consulta posições em 31/12 do ano de origem, cria transações `InitialBalance` no novo ano-base para cada posição (ticker + corretora), e recalcula as posições
- Handler IPC: `portfolio:recalculate`, `portfolio:migrate-year`
- UI: botão de recálculo na tabela de posições + tela/modal de migração de ano (selecionar ano de origem, confirmar, feedback)
- Validações: não permitir migração duplicada (se já existem InitialBalance para o ano destino), alertar se ano de origem não tem posições
</requirements>

## Subtarefas

- [ ] 11.1 Criar `RecalculatePositionUseCase` em `src/main/application/use-cases/recalculate-position-use-case.ts`: busca todas as transações do ticker via `TransactionRepository.findByTicker()`, ordena por data, cria `AssetPosition` vazio, aplica cada transação sequencialmente (`applyBuy`, `applySell`, `applyBonus`, `applyInitialBalance`), persiste snapshot final via `PositionRepository.save()`.
- [ ] 11.2 Criar `MigrateYearUseCase` em `src/main/application/use-cases/migrate-year-use-case.ts`:
  - Recebe `{ sourceYear: number, targetYear: number }`
  - Consulta todas as posições atuais via `PositionRepository.findAll()`
  - Para cada posição com `totalQuantity > 0`, para cada alocação no `brokerBreakdown`:
    - Cria transação `InitialBalance` com data `{targetYear}-01-01`, qty e PM do aggregate
    - Persiste via `TransactionRepository.save()`
  - Recalcula posições dos tickers afetados
  - Retorna resumo da migração (qtd de posições migradas)
- [ ] 11.3 Validação no `MigrateYearUseCase`: verificar se já existem transações `InitialBalance` para o `targetYear`. Se existirem, retornar erro descritivo (evitar duplicação).
- [ ] 11.4 Criar contratos compartilhados: `src/shared/contracts/recalculate.contract.ts`, `src/shared/contracts/migrate-year.contract.ts`.
- [ ] 11.5 Criar handlers IPC `portfolio:recalculate` e `portfolio:migrate-year`. Atualizar `register-main-handlers.ts`.
- [ ] 11.6 Atualizar preload e `electron-api.ts` com os novos canais.
- [ ] 11.7 Atualizar composition root para instanciar os novos use cases.
- [ ] 11.8 Adicionar botão "Recalcular" na `PositionsPage.tsx` (por ativo ou global). Ao clicar, chama `portfolio:recalculate` e atualiza a tabela.
- [ ] 11.9 Criar componente/modal `MigrateYearModal.tsx` em `src/renderer/pages/` ou como componente na `PositionsPage`:
  - Select para ano de origem (ex: 2024)
  - Ano destino calculado automaticamente (origem + 1)
  - Botão "Migrar Posições"
  - Feedback: resumo da migração ou mensagem de erro
- [ ] 11.10 Testes de unidade e integração.
- [ ] 11.11 Remover classes não utilizadas após refatoração

## Detalhes de Implementação

Consultar a seção **Application Layer — Casos de Uso** e **Sequenciamento de Desenvolvimento** da `techspec.md`.

**Lógica de recálculo:**

```
1. Buscar transações do ticker, ordenadas por data ASC
2. Criar AssetPosition vazio (ticker, assetType, qty=0, PM=0, breakdown=[])
3. Para cada transação:
   - if Buy → position.applyBuy({ qty, unitPrice, fees, brokerId })
   - if Sell → position.applySell({ qty, brokerId })
   - if Bonus → position.applyBonus({ qty, brokerId })
   - if InitialBalance → position.applyInitialBalance({ qty, averagePrice, brokerId })
4. Persistir position.toSnapshot()
```

**Lógica de migração:**

```
1. Buscar todas posições com qty > 0
2. Para cada posição, para cada alocação no brokerBreakdown:
   - Criar TransactionRecord { type: InitialBalance, date: targetYear-01-01, ticker, qty: alocação.qty, unitPrice: position.averagePrice, fees: 0, brokerId: alocação.brokerId, sourceType: manual }
3. Persistir transações
4. Recalcular cada ticker afetado
```

## Critérios de Sucesso

- Botão "Recalcular" reconstrói posição corretamente a partir do histórico
- Migração de ano cria transações InitialBalance corretas (uma por ticker+corretora)
- Migração duplicada é bloqueada com mensagem clara
- Migração sem posições no ano de origem exibe aviso
- Após migração, `ListPositions` mostra posições do novo ano
- Todos os testes passam

## Testes da Tarefa

- [ ] Testes de unidade: `RecalculatePositionUseCase` — recálculo com mix de Buy/Sell/Bonus/InitialBalance, resultado correto
- [ ] Testes de unidade: `MigrateYearUseCase` — migração normal, duplicação bloqueada, ano sem posições
- [ ] Testes de integração: recálculo end-to-end com repositórios SQLite in-memory
- [ ] Testes de integração: migração end-to-end (criar posições → migrar → verificar transações e posições do novo ano)
- [ ] Testes de integração: handlers IPC `portfolio:recalculate` e `portfolio:migrate-year`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/recalculate-position-use-case.ts` (criar/refatorar)
- `src/main/application/use-cases/migrate-year-use-case.ts` (criar)
- `src/shared/contracts/recalculate.contract.ts` (criar)
- `src/shared/contracts/migrate-year.contract.ts` (criar)
- `src/main/ipc/handlers/register-main-handlers.ts` (atualizar)
- `src/preload.ts` (atualizar)
- `src/shared/types/electron-api.ts` (atualizar)
- `src/renderer/pages/PositionsPage.tsx` (atualizar — botão recalcular)
- `src/renderer/pages/MigrateYearModal.tsx` (criar)
- `src/renderer/App.tsx` (atualizar se necessário)
