# Tarefa 14.0: Ajustes de Modelagem — CNPJ por Ticker, Ano nas Posições, Código da Corretora e Vínculo na Importação

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar ajustes de modelagem que garantam: (1) CNPJ da empresa do emissor vinculado ao ticker para o relatório de Bens e Direitos; (2) posições vinculadas ao ano-base para que transações e saldos iniciais afetem apenas a posição do ano correspondente; (3) relatório use o ano-base na busca de informações; (4) campo código no cadastro da corretora para simplificar a importação; (5) na importação de transações, a corretora seja resolvida **apenas por código** e, se não encontrada, exibir mensagem orientando o usuário a cadastrá-la.

<requirements>
- Criar tabela `ticker_data` (ticker, cnpj) para CNPJ do emissor vinculado ao ticker; facilitar inclusões manuais futuras
- Adicionar coluna `ano` em `positions`; tornar chave composta `(ticker, ano)`; posição inicial e transações do ano afetam apenas a posição daquele ano
- Garantir que a geração do relatório use o ano-base para buscar posições e transações
- Adicionar coluna `codigo` (texto, único) na tabela `brokers` e no cadastro de corretora
- Na importação de transações (CSV/XLSX), resolver corretora **exclusivamente por código**; se não encontrada, exibir mensagem amigável orientando o cadastro
- Atualizar `ReportGenerator` para incluir CNPJ do emissor (de `ticker_data`) no texto de discriminação
</requirements>

## Subtarefas

- [x] 14.1 Criar migration `ticker_data` com colunas `ticker` (PK), `cnpj` (texto), `name` (texto - opcional). Criar entidade/repositório `TickerDataRepository` com `findByTicker`, `save`, `findAll`. Atualizar `ReportGenerator` e `ReportItemOutput` para usar CNPJ do emissor quando disponível; manter fallback para "N/A" quando não cadastrado.
- [x] 14.2 Criar migration para adicionar coluna `year` (integer) em `positions`; alterar PK para `(ticker, year)`. Atualizar `position_broker_allocations` com FK `(position_ticker, position_year)`. Criar migration de dados existentes: assumir ano atual ou ano-base configurável para posições já existentes.
- [x] 14.3 Atualizar `PositionRepository` e `KnexPositionRepository`: `findByTickerAndYear(ticker, year)`, `findAllByYear(year)`, `save(snapshot, year)`. Atualizar `AssetPositionSnapshot` e aggregates para incluir `year` quando aplicável.
- [x] 14.4 Atualizar `computePositionsFromTransactions` para receber `year` e filtrar transações do ano; posições consultadas/salvas com ano. Atualizar `RecalculatePositionUseCase` e `MigrateYearUseCase` para operar por ano.
- [x] 14.5 Atualizar `SetInitialBalanceUseCase`: usar `year` do input para salvar posição no ano correto; transação `InitialBalance` já usa data do ano.
- [x] 14.6 Atualizar `GenerateAssetsReportUseCase`: filtrar transações e posições pelo `baseYear`; usar `findAllByYear(baseYear)` e `findByPeriod` restrito ao ano.
- [x] 14.7 Criar migration para adicionar coluna `codigo` (texto, único, not null) em `brokers`. Atualizar `BrokerRecord`, `BrokerRepository` (`findByCode`), `KnexBrokerRepository`, `ManageBrokersUseCase.create` (validar código único). Atualizar UI `BrokersPage`: campo Código no formulário e na tabela.
- [x] 14.8 Atualizar coluna "Corretora" no template de importação: deve conter o **código** da corretora. Atualizar `CsvXlsxBrokerageNoteParser` e `CsvXlsxTransactionParser`: resolver corretora via `findByCode` **apenas**; se não encontrada, lançar erro com mensagem: "Corretora com código '[código]' não encontrada. Cadastre-a em Corretoras antes de importar."
- [x] 14.9 Atualizar `ListPositionsUseCase` e UI de posições para filtrar/listar por ano (seletor de ano). Atualizar fluxo de migração de ano para considerar nova estrutura.
- [x] 14.10 Testes de unidade e integração para todas as alterações.
- [x] 14.11 Remover classes não utilizadas após refatoração após refatoração

## Detalhes de Implementação

Consultar as seções **Mapeamento para Schema SQLite**, **Aggregate AssetPosition** e **ReportGenerator** da `techspec.md`.

**Regra de ano nas posições:**
- Transações com data no ano X afetam apenas a posição do ano X.
- Saldo inicial informado para o ano X é persistido na posição (ticker, ano X).
- Relatório de Bens e Direitos para ano-base Y usa posições e transações até 31/12/Y.

**Resolução de corretora na importação:**
- Coluna "Corretora" no CSV/XLSX deve conter o **código** da corretora cadastrada.
- Lookup exclusivo por `findByCode`. Não usar nome para resolução.

## Critérios de Sucesso

- Ticker pode ter CNPJ do emissor cadastrado e exibido no relatório
- Posições são isoladas por ano; transações do ano N afetam apenas posição do ano N
- Relatório de Bens e Direitos usa corretamente o ano-base
- Corretora cadastrada com código; importação resolve corretora apenas por código
- Mensagem clara quando corretora com código informado não existe
- Todos os testes passam

## Testes da Tarefa

- [x] Testes de unidade: `TickerDataRepository`, `ReportGenerator` com CNPJ do emissor
- [x] Testes de unidade: `PositionRepository` com ano; `computePositionsFromTransactions` com filtro por ano
- [x] Testes de unidade: `SetInitialBalanceUseCase` e `MigrateYearUseCase` com ano
- [x] Testes de unidade: `GenerateAssetsReportUseCase` com ano-base
- [x] Testes de unidade: `BrokerRepository.findByCode`; parser com resolução por código e erro quando não encontrado
- [x] Testes de integração: fluxo completo posição por ano, migração, relatório
- [x] Testes de integração: importação com código de corretora válido e inválido

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/database/migrations/` (ticker_data, alter positions, alter brokers)
- `src/main/domain/portfolio/asset-position.entity.ts` (atualizar snapshot com year quando necessário)
- `src/main/application/repositories/position.repository.ts` (findByTickerAndYear, findAllByYear)
- `src/main/infrastructure/persistence/knex-position.repository.ts`
- `src/main/application/services/compute-positions-from-transactions.ts`
- `src/main/application/use-cases/set-initial-balance-use-case.ts`
- `src/main/application/use-cases/migrate-year-use-case.ts`
- `src/main/application/use-cases/generate-assets-report-use-case.ts`
- `src/main/domain/tax-reporting/report-generator.service.ts`
- `src/main/application/repositories/broker.repository.ts` (findByCode)
- `src/main/infrastructure/parsers/csv-xlsx-brokerage-note.parser.ts`
- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.ts`
- `src/renderer/pages/BrokersPage.tsx`
- `src/renderer/pages/PositionsPage.tsx` (seletor de ano)