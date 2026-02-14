# Tarefa 15.0: Importação de Posição Consolidada por Planilha e Exclusão de Ativo

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a importação de posição consolidada a partir de uma planilha (CSV/XLSX). A planilha contém apenas os tickers com seus dados de posição (quantidade, preço médio, corretora). O usuário **seleciona o ano** na interface ao importar — o ano não vem da planilha. O fluxo equivale à entrada manual de saldo inicial, porém com fonte planilha e regra de upsert (criar ou atualizar posição do ano). Adicionalmente, permitir que o usuário exclua um ativo da posição, independente do ano.

<requirements>
- Parser de planilha (CSV/XLSX) com colunas: Ticker, Quantidade, Preço Médio, Corretora (código). Ano **não** vem da planilha.
- Usuário seleciona o ano na interface de importação (ex.: select ou input numérico) antes de confirmar
- Aplicar regra de **upsert**: para cada linha, criar ou atualizar posição do ticker no ano selecionado (equivalente a InitialBalance por ticker+corretora)
- Resolver corretora por código (conforme Tarefa 14)
- Caso de uso `ImportConsolidatedPositionUseCase`: recebe `{ filePath, year }`; parseia → para cada ticker, cria/atualiza posição do ano via transações InitialBalance e recálculo, ou persistência direta conforme modelagem
- Funcionalidade **excluir ativo**: remover ticker da posição (qualquer ano). Caso de uso `DeletePositionUseCase`: recebe `{ ticker, year }`; remove posição e transações InitialBalance correspondentes (ou marca como excluído conforme estratégia)
- UI: tela/modal de importação de posição consolidada (selecionar arquivo + ano); botão de exclusão de ativo na lista de posições
</requirements>

## Subtarefas

- [x] 15.1 Definir modelo da planilha de posição consolidada: colunas **Ticker**, **Quantidade**, **Preço Médio**, **Corretora** (código). Sem coluna Ano. Criar `ConsolidatedPositionParserPort` e implementação em `CsvXlsxConsolidatedPositionParser`.
- [x] 15.2 Criar `ImportConsolidatedPositionUseCase`: recebe `{ filePath, year }`; parseia planilha; para cada linha, resolve corretora por código; aplica upsert: se posição (ticker, ano) existe, atualiza (remove InitialBalance antigo e cria novo, ou recalcula); senão, cria transação InitialBalance e persiste posição. Usar `SetInitialBalanceUseCase` ou lógica equivalente por ticker+corretora.
- [x] 15.3 Criar handler IPC `portfolio:import-consolidated-position` com payload `{ filePath, year }`. Atualizar preload e electron-api.
- [x] 15.4 Criar `DeletePositionUseCase`: recebe `{ ticker, year }`; remove registro de posição (ticker, year) e transações InitialBalance associadas a esse ticker/ano. Ou: define quantidade zero e remove alocações. Definir estratégia de exclusão conforme modelagem (ex.: delete físico ou lógico).
- [x] 15.5 Criar handler IPC `portfolio:delete-position` com payload `{ ticker, year }`. Atualizar preload e electron-api.
- [x] 15.6 Criar UI para importação de posição consolidada:
  - Botão "Importar Posição Consolidada" (ex.: na PositionsPage ou menu)
  - Modal/tela: seleção de arquivo (CSV/XLSX) + **seletor de ano** (obrigatório)
  - Preview das linhas extraídas antes de confirmar
  - Botão "Confirmar" → chama `portfolio:import-consolidated-position`
  - Mensagem de sucesso/erro (incl. corretora não encontrada por código)
- [x] 15.7 Adicionar botão "Excluir" por ativo na tabela de posições; ao clicar, confirmação e chamada a `portfolio:delete-position` com ticker e ano atual do contexto.
- [x] 15.8 Atualizar composition root com novos use cases.
- [x] 15.9 Testes de unidade e integração.
- [x] 15.10 Remover classes não utilizadas após refatoração

## Detalhes de Implementação

Consultar as seções **SetInitialBalanceUseCase**, **PositionRepository** e **Migração entre Anos** da `techspec.md` e da `14_task.md`.

**Modelo da planilha de posição consolidada:**

| Coluna    | Tipo   | Obrigatória | Descrição                          |
|:----------|:-------|:------------|:-----------------------------------|
| Ticker    | texto  | Sim         | Código do ativo (ex: PETR4)        |
| Quantidade| número | Sim         | Quantidade em carteira             |
| Preço Médio | número| Sim         | Preço médio unitário               |
| Corretora | texto  | Sim         | Código da corretora cadastrada     |

O **ano** é informado pelo usuário na interface, não na planilha.

**Regra de upsert:**
- Para cada linha da planilha: ticker T, corretora C (por código), quantidade Q, preço médio P.
- Se já existe alocação (T, C) para o ano: substituir por nova (Q, P).
- Se não existe: criar InitialBalance (T, C, Q, P) para o ano.
- Consolidação por ticker: múltiplas linhas do mesmo ticker com corretoras diferentes → múltiplas alocações; mesma corretora → sobrescrever.

**Exclusão de ativo:**
- Remove a posição (ticker, ano) completamente. Transações InitialBalance do ticker naquele ano podem ser removidas ou mantidas com quantidade zero conforme estratégia de auditoria.

## Critérios de Sucesso

- Usuário importa planilha de posição consolidada selecionando o ano na interface
- Posições são criadas/atualizadas (upsert) no ano selecionado
- Corretora resolvida por código; mensagem clara se não encontrada
- Usuário pode excluir um ativo da posição (por ano)
- Após exclusão, ativo não aparece na lista de posições do ano
- Todos os testes passam

## Testes da Tarefa

- [x] Testes de unidade: `CsvXlsxConsolidatedPositionParser` — parse correto, colunas obrigatórias, erro em formato inválido
- [x] Testes de unidade: `ImportConsolidatedPositionUseCase` — upsert por ano, múltiplas linhas, corretora não encontrada
- [x] Testes de unidade: `DeletePositionUseCase` — remoção de posição e efeitos
- [x] Testes de integração: importação completa com SQLite in-memory; exclusão e verificação de estado
- [x] Testes de integração: handlers IPC

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/ports/consolidated-position-parser.port.ts` (criar)
- `src/main/infrastructure/parsers/csv-xlsx-consolidated-position.parser.ts` (criar)
- `src/main/application/use-cases/import-consolidated-position-use-case.ts` (criar)
- `src/main/application/use-cases/delete-position-use-case.ts` (criar)
- `src/shared/contracts/import-consolidated-position.contract.ts` (criar)
- `src/shared/contracts/delete-position.contract.ts` (criar)
- `src/main/ipc/handlers/register-main-handlers.ts` (atualizar)
- `src/preload.ts` (atualizar)
- `src/shared/types/electron-api.ts` (atualizar)
- `src/renderer/pages/PositionsPage.tsx` (modal importação + botão excluir)