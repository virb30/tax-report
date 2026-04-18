# Especificação Técnica — Tax Report (DDD + Clean Architecture)

## Resumo Executivo

Esta especificação técnica adota **Domain-Driven Design (DDD)** com Clean Architecture no `main process` do Electron. O sistema é organizado em três bounded contexts — **Ingestion** (suporte), **Portfolio** (core domain) e **Tax Reporting** (genérico) — cada um com linguagem ubíqua própria e fronteiras de consistência claras.

A mudança arquitetural central em relação à versão anterior é a **consolidação do `AssetPosition` como aggregate root global por ticker**, com um `brokerBreakdown` que detalha a distribuição física por corretora. Isso reflete a regra da RFB de que o Preço Médio é único por ativo no CPF do investidor, independente de quantas corretoras custodie aquele ticker. Além disso, a entidade `Transaction` passa a ser imutável e suporta quatro tipos de operação (Compra, Venda, Bonificação, Saldo Inicial), e `Broker` é promovido a entidade com tabela própria (essencial para CNPJ nos relatórios fiscais).

O contexto **Tax Reporting** no MVP limita-se à geração do relatório de Bens e Direitos (posição 31/12). Apuração mensal, DARF e compensação de prejuízos permanecem planejados para v2 (Task 14). A persistência continua em **SQLite via Knex** no main process, com migrações incrementais para suportar a nova modelagem.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **Domain Layer (`src/main/domain/`)**
  - `ingestion/`: `TaxApportioner` — serviço de domínio para rateio proporcional de taxas de notas de corretagem entre ativos, com base no volume financeiro.
  - `portfolio/`: `AssetPosition` (aggregate root), `Transaction` (entidade), `AveragePriceService` (serviço de domínio), `Money` e `Quantity` (value objects), `AssetType` (value object).
  - `tax-reporting/`: `ReportGenerator` — serviço de domínio que consolida posições em 31/12 e gera texto de discriminação formatado para a RFB.
- **Application Layer (`src/main/application/`)**
  - Casos de uso orientados a intenção: importar operações, registrar transação manual, registrar saldo inicial, recalcular posição, gerar relatório de bens e direitos, gerenciar corretoras.
  - Ports (interfaces) para repositórios, parsers e queries.
- **Infrastructure Layer (`src/main/infrastructure/`)**
  - `persistence/`: Repositórios Knex/SQLite como implementações dos ports de domínio — `KnexPositionRepository`, `KnexTransactionRepository`, `KnexBrokerRepository`.
  - `parsers/`: Adapters de parsing de PDF/CSV/XLSX como implementações de `BrokerageNoteParserPort`.
  - `composition/`: Wiring/DI manual para injetar dependências nos use cases.
- **Interface Layer**
  - `src/main/ipc/handlers/`: handlers `ipcMain.handle` por caso de uso.
  - `src/preload.ts`: API segura via `contextBridge` com canais explícitos.
  - `src/renderer/`: UI React consumindo contratos tipados de `src/shared/`.

**Fluxo principal de dados**

1. Renderer solicita ação via preload (`window.electronApi.*`).
2. Handler IPC invoca um caso de uso da Application Layer.
3. Caso de uso coordena aggregate roots, serviços de domínio e ports.
4. Adapters de infraestrutura persistem/consultam SQLite via Knex.
5. Resultado retorna como DTO tipado ao renderer via IPC.

## Design de Implementação

### Interfaces Principais

```typescript
// === PORTS DE REPOSITÓRIO (Application Layer) ===

export interface PositionRepositoryPort {
  findByTicker(ticker: string): Promise<AssetPositionSnapshot | null>;
  findAll(): Promise<AssetPositionSnapshot[]>;
  save(snapshot: AssetPositionSnapshot): Promise<void>;
}

export interface TransactionRepositoryPort {
  save(transaction: TransactionRecord): Promise<void>;
  saveMany(transactions: TransactionRecord[]): Promise<void>;
  findByTicker(ticker: string): Promise<TransactionRecord[]>;
  findByPeriod(input: { startDate: string; endDate: string }): Promise<TransactionRecord[]>;
}

export interface BrokerRepositoryPort {
  findById(id: string): Promise<BrokerRecord | null>;
  findByName(name: string): Promise<BrokerRecord | null>;
  findAll(): Promise<BrokerRecord[]>;
  save(broker: BrokerRecord): Promise<void>;
}
```

```typescript
// === PORT DE PARSER (Application Layer) ===

export interface BrokerageNoteParserPort {
  supports(input: { broker: string; fileType: 'pdf' | 'csv' | 'xlsx' }): boolean;
  parse(filePath: string): Promise<ParsedTransaction[]>;
}
```

```typescript
// === CASOS DE USO (Application Layer) ===

export interface ImportTransactionsUseCase {
  execute(input: ImportTransactionsCommand): Promise<ImportTransactionsResult>;
}

export interface RecalculatePositionUseCase {
  execute(input: { ticker: string }): Promise<void>;
}

export interface GenerateAssetsReportUseCase {
  execute(input: { baseYear: number }): Promise<AssetsReportResult>;
}
```

### Modelos de Dados

**Aggregate Root — `AssetPosition`**

```typescript
// src/main/domain/portfolio/asset-position.entity.ts

export type BrokerAllocation = {
  brokerId: string;
  quantity: number;
};

export type AssetPositionSnapshot = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  brokerBreakdown: BrokerAllocation[];
};

export class AssetPosition {
  // Aggregate root — ponto de entrada único para consistência do ativo
  // Invariante: totalQuantity >= 0 (proibição de venda a descoberto)
  // Invariante: averagePrice >= 0; se totalQuantity > 0, averagePrice > 0
  // Invariante: sum(brokerBreakdown.quantity) === totalQuantity

  static create(snapshot: AssetPositionSnapshot): AssetPosition;

  applyBuy(input: { quantity: number; unitPrice: number; fees: number; brokerId: string }): void;
  applySell(input: { quantity: number; brokerId: string }): void;
  applyBonus(input: { quantity: number; brokerId: string }): void;
  applyInitialBalance(input: { quantity: number; averagePrice: number; brokerId: string }): void;

  toSnapshot(): AssetPositionSnapshot;
}
```

**Entidade — `Transaction`**

```typescript
// src/main/domain/portfolio/transaction.entity.ts

export enum TransactionType {
  Buy = 'buy',
  Sell = 'sell',
  Bonus = 'bonus',
  InitialBalance = 'initial_balance',
}

export type TransactionRecord = {
  id: string;
  date: string;
  type: TransactionType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  fees: number;          // taxas rateadas (output do TaxApportioner)
  brokerId: string;
  sourceType: SourceType;
  externalRef?: string;
  importBatchId?: string;
};
```

**Entidade — `Broker`**

```typescript
// src/main/domain/portfolio/broker.entity.ts

export type BrokerRecord = {
  id: string;
  name: string;
  cnpj: string;
};
```

**Value Objects**

- `Money` (já implementado): encapsula precisão decimal, imutável, operações aritméticas seguras.
- `Quantity` (já implementado): encapsula quantidade inteira positiva, imutável.
- `AssetType`: classificação do ativo (`stock`, `fii`, `etf`, `bdr`) que determina grupo/código da Receita e regra tributária futura.

**Serviços de Domínio**

- `TaxApportioner` (renomeado de `OperationalCostAllocationService`): realiza o rateio das taxas totais de uma nota de corretagem entre os ativos transacionados com base no volume financeiro proporcional (`V_ativo / V_total`). Usa algoritmo de Largest Remainder para garantir que a soma dos centavos rateados iguale o total.
- `AveragePriceService` (já implementado): calcula PM após compra: `PM = (Qtd_ant × PM_ant + Custo_novo) / Qtd_total`. Vendas não alteram PM. Bonificações aumentam quantidade mantendo custo total (diluem PM).
- `ReportGenerator`: consolida posições em 31/12, agrupa custo médio global e detalha distribuição física por CNPJ de corretora. Gera texto de discriminação no formato da RFB.

**Mapeamento para Schema SQLite**

| Tabela | Aggregate/Entidade | Mudanças em relação ao schema atual |
| :--- | :--- | :--- |
| `positions` | `AssetPosition` | **Nova tabela**. Substitui `assets` com chave UNIQUE(`ticker`). Campos: `ticker`, `asset_type`, `total_quantity`, `average_price`, `average_price_cents`. |
| `position_broker_allocations` | `BrokerAllocation` (parte do aggregate) | **Nova tabela**. FK para `positions` e `brokers`. Campos: `position_ticker`, `broker_id`, `quantity`. |
| `transactions` | `Transaction` | **Renomeia** `operations` → `transactions`. Adiciona coluna `type` expandida (buy, sell, bonus, initial_balance). FK `broker_id` → `brokers.id`. Campos monetários com dual storage: `unit_price` (REAL) + `unit_price_cents` (INTEGER), `fees` (REAL) + `fees_cents` (INTEGER). |
| `brokers` | `Broker` | **Nova tabela**. Campos: `id`, `name`, `cnpj`. |
| `accumulated_losses` | (v2 — TaxCompliance) | Sem alteração. Mantida para uso futuro na Task 14. |
| `tax_config` | (v2 — TaxCompliance) | Sem alteração. Mantida para uso futuro na Task 14. |

**Migrações incrementais requeridas**

1. `006-create-brokers.ts` — tabela `brokers` com seed de corretoras conhecidas (XP, Clear, Inter, etc.).
2. `007-create-positions.ts` — tabela `positions` (ticker único) e `position_broker_allocations`.
3. `008-migrate-operations-to-transactions.ts` — renomeia `operations` → `transactions`, expande enum `type`, adiciona FK `broker_id`, migra dados de `broker` (string) para FK.
4. `009-migrate-assets-to-positions.ts` — consolida registros de `assets` (por ticker+broker) em `positions` (por ticker), popula `position_broker_allocations`, depreca tabela `assets`.

### Endpoints de API

Não há API HTTP no MVP. A superfície de integração é IPC tipado:

- `ipcMain.handle('import:preview-file', payload)` — preview de arquivo antes de confirmação.
- `ipcMain.handle('import:transactions', payload)` — importa/parsa/valida/persiste transações.
- `ipcMain.handle('portfolio:set-initial-balance', payload)` — registra saldo inicial (PM manual) de ativo.
- `ipcMain.handle('portfolio:list-positions', payload)` — lista posições consolidadas correntes.
- `ipcMain.handle('portfolio:recalculate', payload)` — recalcula posição a partir do histórico de transações.
- `ipcMain.handle('report:assets-annual', payload)` — gera Bens e Direitos (posição 31/12).
- `ipcMain.handle('brokers:list', payload)` — lista corretoras cadastradas.
- `ipcMain.handle('brokers:create', payload)` — cadastra nova corretora.

## Pontos de Integração

- **Arquivos locais (PDF/CSV/Excel)**
  - Entrada de dados via parser em adapter dedicado (Strategy pattern por corretora).
  - Tratamento de erro com classificação: formato inválido, dado inconsistente, arquivo não suportado.
- **Electron IPC (interno)**
  - Exposição mínima via `contextBridge` e canais allowlist.
  - Nunca expor `ipcRenderer` bruto ao renderer.
- **Sem dependências externas online no MVP**
  - Sistema opera offline com persistência local.

## Abordagem de Testes

### Testes Unidade

- **Domínio (prioridade máxima)**
  - Invariantes de `AssetPosition`: quantidade total não negativa, PM válido, soma do brokerBreakdown = totalQuantity.
  - `applyBuy`: atualiza PM com custos proporcionais e incrementa alocação por corretora.
  - `applySell`: reduz quantidade na corretora correta, PM permanece inalterado.
  - `applyBonus`: aumenta quantidade mantendo custo total (dilui PM unitário).
  - `applyInitialBalance`: define posição base sem operação de compra anterior.
  - Venda sem posição/saldo suficiente deve falhar com erro de domínio.
  - `TaxApportioner`: rateio proporcional por volume financeiro com algoritmo Largest Remainder; soma dos centavos deve igualar o total.
  - `AveragePriceService`: cenários de compra incremental, bonificação e precisão decimal.
  - `ReportGenerator`: consolidação de posições em data de corte, formatação de texto de discriminação por tipo de ativo.
- **Aplicação**
  - Casos de uso com ports mockados.
  - Garantir orquestração correta: parse → rateio → persistência → recálculo de posição.
- **Infraestrutura**
  - Repositórios com SQLite in-memory.
  - Mapeamento row ↔ snapshot de domínio validado por contrato.

### Testes de Integração

- Fluxo completo `import → portfolio update → position verification`.
- Integração parser + TaxApportioner + caso de uso + repositório.
- Migrações de schema executando em base limpa e com dados pré-existentes.
- Consolidação de posições multi-corretora: importar operações de corretoras diferentes para o mesmo ticker e validar PM global.
- Recálculo de posição a partir de histórico completo de transações (inclusão retroativa).

### Testes de E2E

- Playwright com app desktop:
  - Importar arquivo válido e confirmar atualização de posição consolidada.
  - Cadastrar corretora e registrar saldo inicial.
  - Gerar relatório de Bens e Direitos e validar texto de discriminação com CNPJ da corretora.
  - Verificar que posição multi-corretora consolida PM global corretamente no relatório.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Migrações de schema e entidade Broker**: criar tabelas `brokers`, `positions`, `position_broker_allocations` e migrações de dados das tabelas legadas. Motivo: base para toda a nova modelagem.
2. **Aggregate `AssetPosition` refatorado**: implementar novo aggregate root com `brokerBreakdown`, métodos `applyBuy`, `applySell`, `applyBonus`, `applyInitialBalance` e invariantes. Motivo: núcleo de consistência do core domain.
3. **`Transaction` entity e `TransactionType` expandido**: renomear `TradeOperation` → `Transaction`, adicionar tipos `Bonus` e `InitialBalance`. Motivo: suporte aos novos fluxos de operação.
4. **Renomeação de serviços de domínio**: `OperationalCostAllocationService` → `TaxApportioner`; atualizar linguagem ubíqua. Motivo: alinhamento com DDD.
5. **Repositórios de infraestrutura**: implementar `KnexPositionRepository`, `KnexTransactionRepository`, `KnexBrokerRepository`. ACL (Anti-Corruption Layer) para tabelas legadas durante a transição. Motivo: adapters para nova modelagem.
6. **Casos de uso atualizados**: adaptar `ImportTransactionsUseCase`, `RecalculatePositionUseCase`, `GenerateAssetsReportUseCase` e criar `SetInitialBalanceUseCase`, `ManageBrokersUseCase`. Motivo: orquestração com novos aggregates.
7. **`ReportGenerator` refatorado**: consolidação por ticker com brokerBreakdown e CNPJ via entidade Broker. Motivo: relatório fiscal completo.
8. **IPC e UI**: atualizar handlers, preload e páginas React para refletir nova estrutura de dados. Motivo: integração ponta a ponta.

### Dependências Técnicas

- Base atual de SQLite/Knex já disponível — migrações incrementais são suficientes.
- Contratos IPC em `src/shared/` devem evoluir junto dos use cases.
- Seed de corretoras conhecidas (XP, Clear, Inter, Rico, etc.) com CNPJs oficiais.
- Definição de formato de template CSV/Excel para importação permanece dependência funcional.
- Biblioteca de parsing PDF (XP) mantém adapter isolado via Strategy pattern.

## Considerações Técnicas

### Decisões Principais

- **Consolidação global de AssetPosition por ticker**
  - O PM é único por ativo no CPF do investidor, conforme regra da RFB. O aggregate root `AssetPosition` consolida globalmente com `brokerBreakdown` como mapa de alocações por corretora.
  - Alternativa rejeitada: manter posição por ticker+broker e consolidar somente no relatório — aumentaria complexidade de invariantes e divergiria da linguagem de domínio.

- **Transaction com 4 tipos (Buy, Sell, Bonus, InitialBalance)**
  - Bonificação tem regra fiscal específica (dilui PM sem novo custo). Saldo Inicial substitui a flag `isManualBase` por um tipo de transação explícito no histórico, permitindo auditoria e recálculo.
  - Alternativa rejeitada: manter isManualBase como flag booleana — impede rastreabilidade e não participa do fluxo de recálculo.

- **Broker como entidade com tabela própria**
  - O CNPJ da corretora é campo obrigatório no texto de discriminação da ficha de Bens e Direitos da RFB. Modelar como entidade garante consistência e evita duplicação.
  - Alternativa rejeitada: lookup estático de CNPJ — frágil e não escala para corretoras customizadas pelo usuário.

- **Renomeação para linguagem ubíqua DDD**
  - Nomes como `TaxApportioner`, `Transaction`, `ReportGenerator` refletem a linguagem de domínio e facilitam comunicação entre código e regras de negócio.

- **Tax Reporting Context somente para relatório no MVP**
  - DARF, compensação de prejuízos e apuração mensal ficam na Task 14 (v2), reduzindo escopo e risco do MVP.

- **Manutenção do Knex como query builder**
  - Repositórios já funcionais e testados. Knex oferece migrations nativas e abstração suficiente para o SQLite.
  - Alternativa rejeitada: better-sqlite3 direto — exigiria reescrever repositórios e migrations sem ganho claro para o MVP.

- **Persistência monetária dual (REAL + INTEGER centavos)**
  - Campos monetários (`average_price`, `unit_price`, `fees`) são armazenados em duas colunas: REAL para leitura direta e INTEGER em centavos (`*_cents`) como fonte de verdade para cálculos. O VO `Money` opera internamente em centavos e os repositórios persistem/restauram ambos os valores. Isso elimina erros de arredondamento de ponto flutuante em operações acumuladas.

- **Sem domain events no MVP**
  - Fluxo síncrono e transacional simplifica entrega. Extensão futura com eventos possível sem quebrar contratos.

### Riscos Conhecidos

- **Migração de dados legados**
  - Consolidar `assets` (ticker+broker) em `positions` (ticker global) requer cuidado para não perder dados. Mitigação: migration reversível com backup automático e testes com dados reais.
- **Complexidade do aggregate AssetPosition**
  - Manter `brokerBreakdown` sincronizado com `totalQuantity` adiciona invariantes. Mitigação: testes de domínio extensivos com cenários multi-corretora.
- **Complexidade de parsing PDF**
  - Mitigação: parser por strategy/adapter com fallback para importação CSV.
- **Precisão fiscal**
  - Mitigação: suíte de testes de domínio com cenários de referência (bonificação, venda parcial, multi-corretora) e cálculo manual cruzado.
- **Mudança regulatória (2026 — apuração trimestral)**
  - Pesquisa indica possível mudança de apuração mensal para trimestral a partir de 2026, com alíquota unificada de 17,5%. Mitigação: design preparado para regime versionado na `tax_config` (v2).

### Conformidade com Padrões

- **`.cursor/rules/arhitecture.mdc`**
  - Clean Architecture respeitada: `domain` → `application` → `infrastructure`. Nomenclatura de arquivos segue padrão `[nome].[tipo].ts` (ex: `asset-position.entity.ts`, `knex-position.repository.ts`, `money.vo.ts`, `tax-apportioner.service.ts`).
- **`.cursor/rules/code-standards.mdc`**
  - Nomes claros, separação de responsabilidades, funções puras no domínio. Sem mistura consulta/mutação nos serviços.
- **`.cursor/rules/electron.mdc`**
  - Backend no `main`, frontend no `renderer`, contratos em `shared`, IPC via preload seguro.
- **`.cursor/rules/node.mdc`**
  - Tipagem forte, named exports, classes coesas. Cobertura de testes 100% em `src/main/`.
- **`.cursor/rules/react.mdc`**
  - Renderer consome contratos tipados sem lógica de negócio fiscal no frontend.
- **`.cursor/rules/tests.mdc`**
  - Jest com AAA (Arrange-Act-Assert), independência de testes, foco em comportamento, mock de Date para datas.

### Arquivos relevantes e dependentes

**Já existentes (a refatorar)**
- `src/main/domain/portfolio/asset-position.ts` → `asset-position.entity.ts` (refatorar para PM global + brokerBreakdown)
- `src/main/domain/portfolio/average-price-service.ts` → adicionar lógica de bonificação
- `src/main/domain/portfolio/money.vo.ts` (manter)
- `src/main/domain/portfolio/quantity.vo.ts` (manter)
- `src/main/domain/ingestion/operational-cost-allocation.service.ts` → renomear para `tax-apportioner.service.ts`
- `src/main/domain/tax-compliance/darf-calculator-service.ts` (manter para v2)
- `src/main/application/use-cases/generate-assets-report-use-case.ts` → refatorar para nova modelagem
- `src/main/application/use-cases/recalculate-asset-position-use-case.ts` → refatorar para aggregate global
- `src/main/application/use-cases/import-operations-use-case.ts` → renomear e adaptar
- `src/main/application/use-cases/set-manual-base-use-case.ts` → refatorar para `SetInitialBalanceUseCase`
- `src/main/application/repositories/portfolio-position.repository.interface.ts` → refatorar port
- `src/main/application/ports/operation-repository.port.ts` → refatorar para `TransactionRepositoryPort`
- `src/main/infrastructure/persistence/sqlite-portfolio-position.repository.ts` → refatorar para `KnexPositionRepository`
- `src/main/infrastructure/persistence/sqlite-trade-operations.query.ts` → adaptar ou deprecar
- `src/main/ipc/handlers/register-main-handlers.ts` → atualizar canais
- `src/shared/types/domain.ts` → expandir `TransactionType`, adicionar `BrokerRecord`
- `src/shared/contracts/` → atualizar contratos de import, positions e report

**A criar**
- `src/main/domain/portfolio/transaction.entity.ts`
- `src/main/domain/portfolio/broker.entity.ts`
- `src/main/domain/tax-reporting/report-generator.service.ts`
- `src/main/application/ports/broker-repository.port.ts`
- `src/main/application/use-cases/set-initial-balance-use-case.ts`
- `src/main/application/use-cases/manage-brokers-use-case.ts`
- `src/main/infrastructure/persistence/knex-position.repository.ts`
- `src/main/infrastructure/persistence/knex-transaction.repository.ts`
- `src/main/infrastructure/persistence/knex-broker.repository.ts`
- `src/main/database/migrations/006-create-brokers.ts`
- `src/main/database/migrations/007-create-positions.ts`
- `src/main/database/migrations/008-migrate-operations-to-transactions.ts`
- `src/main/database/migrations/009-migrate-assets-to-positions.ts`
- `src/main/database/seeds/brokers-seed.ts`
