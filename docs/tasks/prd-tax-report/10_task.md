# Tarefa 10.0: Core Domain Portfolio + Saldo Inicial (Gestão Manual de Carteira)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o core domain do Portfolio: o aggregate root `AssetPosition` consolidado globalmente por ticker (com `brokerBreakdown`), a entidade `Transaction` (4 tipos), o `AveragePriceService` expandido, os value objects, os repositórios, os casos de uso de saldo inicial e listagem de posições, os handlers IPC e a UI funcional. Ao final, o usuário consegue cadastrar um saldo inicial para um ativo (escolhendo corretora), visualizar posições consolidadas com PM global e ver o detalhamento por corretora.

<requirements>
- `AssetPosition` aggregate root com PM global + `brokerBreakdown` (Map de alocações por corretora)
- Invariantes: `totalQuantity >= 0`, `averagePrice >= 0` (se qty > 0 então PM > 0), `sum(brokerBreakdown.quantity) === totalQuantity`
- `Transaction` entity imutável com `TransactionType` enum: `Buy`, `Sell`, `Bonus`, `InitialBalance`
- `AveragePriceService` expandido: compra (atualiza PM), venda (mantém PM), bonificação (dilui PM), saldo inicial
- VOs: `Money`, `Quantity` (manter/ajustar se necessário - avaliar se precisa ser um VO), `AssetType`
- `PositionRepository` (interface) + `KnexPositionRepository` (impl com `position_broker_allocations`)
- `TransactionRepository` (interface) + `KnexTransactionRepository` (impl)
- `SetInitialBalanceUseCase`: cria transação `InitialBalance` e atualiza posição consolidada
- `ListPositionsUseCase`: retorna posições com detalhamento por corretora
- Handlers IPC: `portfolio:set-initial-balance`, `portfolio:list-positions`
- UI: página de saldo inicial (form: ticker, tipo ativo, quantidade, PM, corretora) + tabela de posições consolidadas
- Nomenclatura: `asset-position.entity.ts`, `transaction.entity.ts`, `position.repository.ts`, `knex-position.repository.ts`, etc.
</requirements>

## Subtarefas

- [ ] 10.1 Refatorar `AssetPosition` em `src/main/domain/portfolio/asset-position.entity.ts`: PM global por ticker, `brokerBreakdown: BrokerAllocation[]`, métodos `applyBuy`, `applySell`, `applyBonus`, `applyInitialBalance`, `toSnapshot()`. Invariantes com validação interna.
- [ ] 10.2 Criar `Transaction` entity em `src/main/domain/portfolio/transaction.entity.ts` com enum `TransactionType` (Buy, Sell, Bonus, InitialBalance) e tipo `TransactionRecord`.
- [ ] 10.3 Expandir `AveragePriceService` em `src/main/domain/portfolio/average-price.service.ts`: adicionar cálculo para `applyBonus` (aumenta qty, mantém custo total, dilui PM) e `applyInitialBalance` (define base).
- [ ] 10.4 Ajustar VOs `Money` e `Quantity` se necessário. Manter `AssetType` enum em `src/shared/types/domain.ts` — expandir `TransactionType` e `SourceType`.
- [ ] 10.5 Criar interface `PositionRepository` em `src/main/application/repositories/position.repository.ts` com: `findByTicker`, `findAll`, `save`.
- [ ] 10.6 Criar interface `TransactionRepository` em `src/main/application/repositories/transaction.repository.ts` com: `save`, `saveMany`, `findByTicker`, `findByPeriod`.
- [ ] 10.7 Implementar `KnexPositionRepository` em `src/main/infrastructure/persistence/knex-position.repository.ts` — persistir `positions` + `position_broker_allocations` em transação atômica.
- [ ] 10.8 Implementar `KnexTransactionRepository` em `src/main/infrastructure/persistence/knex-transaction.repository.ts`.
- [ ] 10.9 Criar `SetInitialBalanceUseCase` em `src/main/application/use-cases/set-initial-balance-use-case.ts`: valida input, cria transação `InitialBalance`, aplica no aggregate `AssetPosition` via `applyInitialBalance`, persiste ambos.
- [ ] 10.10 Criar `ListPositionsUseCase` em `src/main/application/use-cases/list-positions-use-case.ts`: retorna todas as posições com `brokerBreakdown` enriquecido (nome e CNPJ da corretora via `BrokerRepository`).
- [ ] 10.11 Criar contratos compartilhados: `src/shared/contracts/initial-balance.contract.ts`, atualizar `src/shared/contracts/list-positions.contract.ts`.
- [ ] 10.12 Criar handlers IPC `portfolio:set-initial-balance` e `portfolio:list-positions`. Atualizar `register-main-handlers.ts`.
- [ ] 10.13 Atualizar preload e `electron-api.ts` com os novos canais.
- [ ] 10.14 Atualizar composition root para instanciar `KnexPositionRepository`, `KnexTransactionRepository`, `SetInitialBalanceUseCase`, `ListPositionsUseCase`.
- [ ] 10.15 Criar página `InitialBalancePage.tsx` com: formulário (ticker, tipo ativo, quantidade, preço médio, corretora via select das corretoras cadastradas), validação de campos, feedback de sucesso.
- [ ] 10.16 Criar/atualizar página `PositionsPage.tsx` com: tabela de posições consolidadas (ticker, tipo, quantidade total, PM global, custo total), expansão por corretora (nome, CNPJ, quantidade alocada).
- [ ] 10.17 Atualizar `App.tsx` com abas/rotas para "Saldo Inicial" e "Posições".
- [ ] 10.18 Testes de unidade e integração.
- [ ] 10.19 Remover classes não utilizadas após refatoração

## Detalhes de Implementação

Consultar a seção **Aggregate Root — AssetPosition**, **Entidade — Transaction** e **Serviços de Domínio** da `techspec.md`.

**Regras de negócio críticas (invariantes do aggregate):**

- `applyBuy`: `PM = (Qtd_ant × PM_ant + Qtd_nova × Preço + Taxas) / Qtd_total`. Incrementa alocação na corretora.
- `applySell`: reduz quantidade da corretora específica. PM **não** muda. Erro se qty insuficiente.
- `applyBonus`: `Qtd_total += bonus_qty`. Custo total permanece igual → PM dilui. Incrementa alocação na corretora.
- `applyInitialBalance`: define posição base (qty + PM) para uma corretora. Se já existia alocação nessa corretora, soma.

**Persistência do aggregate (transação atômica):**

O `KnexPositionRepository.save()` deve, dentro de uma transação Knex:
1. Upsert na tabela `positions` (ticker como chave).
2. Deletar todas as `position_broker_allocations` para aquele ticker.
3. Inserir as novas alocações do `brokerBreakdown`.

## Critérios de Sucesso

- Usuário cadastra saldo inicial e a posição aparece na tabela de posições
- Múltiplos saldos iniciais para o mesmo ticker (corretoras diferentes) consolidam o PM global
- Tabela de posições mostra PM global e expande detalhamento por corretora
- Invariantes do aggregate impedem estados inválidos (testes passam)
- Todos os testes passam (`npm test`)

## Testes da Tarefa

- [ ] Testes de unidade: `AssetPosition` — `applyBuy`, `applySell`, `applyBonus`, `applyInitialBalance`, invariantes (qty negativa, PM inválido, breakdown inconsistente)
- [ ] Testes de unidade: `AveragePriceService` — cenários de compra, venda, bonificação, saldo inicial, precisão decimal
- [ ] Testes de unidade: `SetInitialBalanceUseCase` e `ListPositionsUseCase` com repositórios mockados
- [ ] Testes de integração: `KnexPositionRepository` com SQLite in-memory (save/find com allocations)
- [ ] Testes de integração: `KnexTransactionRepository` com SQLite in-memory (save/findByTicker/findByPeriod)
- [ ] Testes de integração: handlers IPC `portfolio:set-initial-balance` e `portfolio:list-positions`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/portfolio/asset-position.entity.ts` (refatorar)
- `src/main/domain/portfolio/transaction.entity.ts` (criar)
- `src/main/domain/portfolio/average-price.service.ts` (refatorar)
- `src/main/domain/portfolio/money.vo.ts` (manter)
- `src/main/domain/portfolio/quantity.vo.ts` (manter)
- `src/main/application/repositories/position.repository.ts` (criar)
- `src/main/application/repositories/transaction.repository.ts` (criar)
- `src/main/infrastructure/persistence/knex-position.repository.ts` (criar)
- `src/main/infrastructure/persistence/knex-transaction.repository.ts` (criar)
- `src/main/application/use-cases/set-initial-balance-use-case.ts` (criar)
- `src/main/application/use-cases/list-positions-use-case.ts` (criar/refatorar)
- `src/shared/types/domain.ts` (atualizar — TransactionType, SourceType)
- `src/shared/contracts/initial-balance.contract.ts` (criar)
- `src/shared/contracts/list-positions.contract.ts` (atualizar)
- `src/main/ipc/handlers/register-main-handlers.ts` (atualizar)
- `src/preload.ts` (atualizar)
- `src/renderer/pages/InitialBalancePage.tsx` (criar)
- `src/renderer/pages/PositionsPage.tsx` (criar)
- `src/renderer/App.tsx` (atualizar)
