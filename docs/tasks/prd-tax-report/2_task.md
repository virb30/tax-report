# Tarefa 2.0: Camada de Dados e Persistência

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a camada de persistência usando better-sqlite3 com migrações gerenciadas por Knex. Criar o schema completo do banco de dados e implementar os 4 repositórios principais (assets, operations, accumulated_losses, tax_config) com operações CRUD completas e testadas.

<requirements>
- Configuração do better-sqlite3 com rebuild nativo para Electron
- Sistema de migrações Knex funcional
- Schema completo: `assets`, `operations`, `accumulated_losses`, `tax_config`
- Seed inicial da tabela `tax_config` com alíquotas vigentes
- Implementação de 4 repositórios com métodos CRUD
- Testes de unidade com 100% de cobertura para todos os repositórios
- Banco de dados criado em `userData` do Electron
- Conformidade com `.cursor/rules/node.mdc` e `.cursor/rules/tests.mdc`
</requirements>

## Subtarefas

- [ ] 2.1 Instalar e configurar better-sqlite3 + @electron/rebuild
- [ ] 2.2 Instalar e configurar Knex
- [ ] 2.3 Criar migration para tabela `assets`
- [ ] 2.4 Criar migration para tabela `operations`
- [ ] 2.5 Criar migration para tabela `accumulated_losses`
- [ ] 2.6 Criar migration para tabela `tax_config`
- [ ] 2.7 Criar seed para `tax_config` com dados iniciais
- [ ] 2.8 Implementar `database.ts` (inicialização + execução de migrations)
- [ ] 2.9 Implementar `AssetRepository` com testes
- [ ] 2.10 Implementar `OperationRepository` com testes
- [ ] 2.11 Implementar `AccumulatedLossRepository` com testes
- [ ] 2.12 Implementar `TaxConfigRepository` com testes

## Detalhes de Implementação

Consulte a seção **"Modelos de Dados"** e **"Sequenciamento de Desenvolvimento"** (item 2) da `techspec.md`.

### Schema Completo

Ver schema SQL completo na `techspec.md` linhas 229-282.

Tabelas principais:
- **assets**: ticker, name, cnpj, asset_type, broker, average_price, quantity, is_manual_base
- **operations**: trade_date, operation_type, ticker, quantity, unit_price, operational_costs, irrf_withheld, broker, source_type
- **accumulated_losses**: asset_type, amount
- **tax_config**: asset_type, tax_rate, monthly_exemption_limit, irrf_rate

### Dados Iniciais (Seed)

| asset_type | tax_rate | monthly_exemption_limit | irrf_rate |
|------------|----------|-------------------------|-----------|
| stock      | 0.15     | 20000.00                | 0.00005   |
| fii        | 0.20     | 0.00                    | 0.00005   |
| etf        | 0.15     | 0.00                    | 0.00005   |
| bdr        | 0.15     | 0.00                    | 0.00005   |

### Estrutura de Arquivos

```
src/main/database/
├── database.ts                      # Inicialização + migrations
├── migrations/
│   ├── 001_create_assets.ts
│   ├── 002_create_operations.ts
│   ├── 003_create_accumulated_losses.ts
│   └── 004_create_tax_config.ts
├── seeds/
│   └── initial_tax_config.ts
└── repositories/
    ├── asset-repository.ts
    ├── operation-repository.ts
    ├── accumulated-loss-repository.ts
    └── tax-config-repository.ts
```

## Critérios de Sucesso

- ✅ Aplicação cria arquivo SQLite em `app.getPath('userData')/tax-report.db` na primeira execução
- ✅ Todas as 4 migrations executam sem erros
- ✅ Seed de `tax_config` popula 4 registros corretos
- ✅ Cada repositório possui métodos: `create()`, `findById()`, `findAll()`, `update()`, `delete()`
- ✅ AssetRepository possui `findByTickerAndBroker()` (constraint UNIQUE)
- ✅ OperationRepository possui `findByDateRange()` e `findByTicker()`
- ✅ Cobertura de testes 100% em todos os repositórios
- ✅ Testes usam banco in-memory (`:memory:`) para isolamento

## Testes da Tarefa

- [ ] **Testes de unidade - AssetRepository**:
  - [ ] Criar asset novo
  - [ ] Buscar por ticker e broker
  - [ ] Atualizar preço médio e quantidade
  - [ ] Listar todos assets
  - [ ] Deletar asset
  - [ ] Testar constraint UNIQUE (ticker, broker)

- [ ] **Testes de unidade - OperationRepository**:
  - [ ] Criar operação de compra
  - [ ] Criar operação de venda
  - [ ] Buscar por range de datas
  - [ ] Buscar por ticker
  - [ ] Listar todas operações

- [ ] **Testes de unidade - AccumulatedLossRepository**:
  - [ ] Criar registro de prejuízo
  - [ ] Buscar por asset_type
  - [ ] Atualizar amount
  - [ ] Testar constraint UNIQUE asset_type

- [ ] **Testes de unidade - TaxConfigRepository**:
  - [ ] Buscar configuração por asset_type
  - [ ] Atualizar tax_rate
  - [ ] Atualizar monthly_exemption_limit
  - [ ] Listar todas configs

- [ ] **Testes de integração**:
  - [ ] Inicialização do database executa migrations
  - [ ] Seed popula tax_config corretamente
  - [ ] Múltiplos repositórios podem trabalhar simultaneamente

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/main/database/database.ts`
- `src/main/database/migrations/*.ts` (4 arquivos)
- `src/main/database/seeds/initial_tax_config.ts`
- `src/main/database/repositories/*.ts` (4 arquivos)
- `src/main/database/__tests__/*.test.ts` (1 arquivo por repositório)

**Dependências:**
- Task 1.0 (scaffolding)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
