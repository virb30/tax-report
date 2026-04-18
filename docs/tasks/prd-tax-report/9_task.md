# Tarefa 9.0: Schema SQLite (Base Limpa), Broker e Gestão de Corretoras

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar o schema SQLite completo do zero (base limpa, sem migrações legadas), a entidade `Broker`, o repositório com interface e implementação Knex, o caso de uso de gestão de corretoras, os handlers IPC, o preload e a UI funcional para listar e cadastrar corretoras. Ao final, o usuário consegue abrir o app, ver as corretoras pré-cadastradas (seed) e cadastrar novas.

<requirements>
- Schema novo do zero para TODAS as tabelas do MVP: `brokers`, `positions`, `position_broker_allocations`, `transactions`
- Seed de corretoras conhecidas (XP, Clear, Inter, Rico, etc.) com CNPJs oficiais
- Entidade `Broker` (`id`, `name`, `cnpj`) no domínio
- Interface `BrokerRepository` e implementação `KnexBrokerRepository`
- `ListBrokersUseCase` (listar)
- `CreateBrokerUseCase` (cadastrar)
- Contratos compartilhados em `src/shared/contracts/`
- Handler IPC (`brokers:list`, `brokers:create`)
- Preload com API tipada via `contextBridge`
- UI: página de gestão de corretoras (listar + form de cadastro)
- Remover migrações legadas (001-005) e substituir pelo schema novo
- Nomenclatura: `[nome].[tipo].ts` conforme `.cursor/rules/arhitecture.mdc`
</requirements>

## Subtarefas

- [x] 9.1 Criar migrações do zero: `001-create-brokers.ts`, `002-create-positions.ts`, `003-create-position-broker-allocations.ts`, `004-create-transactions.ts`. Remover migrações legadas (001-005). Atualizar `migrations/index.ts`.
- [x] 9.2 Criar seed `brokers-seed.ts` com corretoras: XP Investimentos (CNPJ: 02.332.886/0001-04), Clear Corretora (CNPJ: 02.332.886/0011-78), Inter DTVM (CNPJ: 19.180.679/0001-92), Rico Investimentos (CNPJ: 13.434.335/0001-60).
- [x] 9.3 Criar entidade `Broker` em `src/main/domain/portfolio/broker.entity.ts` com tipo `BrokerRecord { id: string; name: string; cnpj: string }`.
- [x] 9.4 Criar interface `BrokerRepository` em `src/main/application/repositories/broker.repository.ts` com métodos: `findById`, `findByName`, `findAll`, `save`.
- [x] 9.5 Implementar `KnexBrokerRepository` em `src/main/infrastructure/persistence/knex-broker.repository.ts`.
- [x] 9.6 Criar `ManageBrokersUseCase` em `src/main/application/use-cases/manage-brokers-use-case.ts` com operações `list` e `create` (validar CNPJ único e nome não vazio).
- [x] 9.7 Criar contratos compartilhados em `src/shared/contracts/brokers.contract.ts`.
- [x] 9.8 Criar handler IPC `brokers:list` e `brokers:create` em `src/main/ipc/handlers/`. Atualizar `register-main-handlers.ts`.
- [x] 9.9 Atualizar `src/preload.ts` com canais `brokers:list` e `brokers:create`. Atualizar `src/shared/types/electron-api.ts`.
- [x] 9.10 Atualizar composition root (`src/main/infrastructure/composition/`) para instanciar `KnexBrokerRepository` e `ManageBrokersUseCase`.
- [x] 9.11 Criar página `BrokersPage.tsx` em `src/renderer/pages/` com: tabela de corretoras (nome, CNPJ), formulário para cadastrar nova corretora, feedback de sucesso/erro.
- [x] 9.12 Adicionar aba/rota "Corretoras" no `App.tsx`.
- [x] 9.13 Testes de unidade e integração.
- [x] 9.14 Remover classes não utilizadas após refatoração

## Detalhes de Implementação

Consultar a seção **Mapeamento para Schema SQLite** e **Entidade — Broker** da `techspec.md` para detalhes de schema e modelagem.

**Schema das tabelas:**

```sql
-- brokers
CREATE TABLE brokers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE
);

-- positions
CREATE TABLE positions (
  ticker TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('stock','fii','etf','bdr')),
  total_quantity REAL NOT NULL DEFAULT 0,
  average_price REAL NOT NULL DEFAULT 0,
  average_price_cents INTEGER NOT NULL DEFAULT 0
);

-- position_broker_allocations
CREATE TABLE position_broker_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position_ticker TEXT NOT NULL REFERENCES positions(ticker),
  broker_id TEXT NOT NULL REFERENCES brokers(id),
  quantity REAL NOT NULL DEFAULT 0,
  UNIQUE(position_ticker, broker_id)
);

-- transactions
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('buy','sell','bonus','initial_balance')),
  ticker TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  fees REAL NOT NULL DEFAULT 0,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  broker_id TEXT NOT NULL REFERENCES brokers(id),
  source_type TEXT NOT NULL CHECK(source_type IN ('pdf','csv','manual')),
  external_ref TEXT UNIQUE,
  import_batch_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Critérios de Sucesso

- `npm run start` abre o app com aba "Corretoras" funcional
- Corretoras do seed aparecem na tabela ao iniciar
- Cadastrar nova corretora aparece na tabela sem recarregar
- CNPJ duplicado exibe mensagem de erro
- Schema do banco cria todas as 4 tabelas corretamente (verificável via teste)
- Todos os testes passam (`npm test`)

## Testes da Tarefa

- [x] Testes de unidade: `ManageBrokersUseCase` (listar)
- [x] Testes de unidade: `ManageBrokersUseCase` (criar, CNPJ duplicado, nome vazio)
- [x] Testes de integração: `KnexBrokerRepository` com SQLite in-memory (CRUD completo)
- [x] Testes de integração: Handler IPC `brokers:list` e `brokers:create`
- [x] Teste de inicialização: migrações rodam em base limpa sem erro, seed popula corretoras

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/database/migrations/` (substituir todas as migrações legadas)
- `src/main/database/seeds/brokers-seed.ts` (criar)
- `src/main/domain/portfolio/broker.entity.ts` (criar)
- `src/main/application/repositories/broker.repository.ts` (criar)
- `src/main/infrastructure/persistence/knex-broker.repository.ts` (criar)
- `src/main/application/use-cases/manage-brokers-use-case.ts` (criar)
- `src/shared/contracts/brokers.contract.ts` (criar)
- `src/shared/types/electron-api.ts` (atualizar)
- `src/main/ipc/handlers/register-main-handlers.ts` (atualizar)
- `src/preload.ts` (atualizar)
- `src/main/infrastructure/composition/create-main-lifecycle.ts` (atualizar)
- `src/renderer/pages/BrokersPage.tsx` (criar)
- `src/renderer/App.tsx` (atualizar)
