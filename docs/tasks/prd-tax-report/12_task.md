# Tarefa 12.0: Importação de Transações (Ingestion Context)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o fluxo completo de importação de transações: renomear o serviço de rateio para `TaxApportioner`, adaptar os parsers CSV/XLSX para o novo modelo `Transaction`, criar o caso de uso de importação com rateio integrado, seleção de arquivo via dialog Electron, modelo de planilha na tela, preview e confirmação. Ao final, o usuário consegue selecionar um arquivo CSV/XLSX, visualizar os dados extraídos, confirmar a importação e ver as posições atualizadas automaticamente.

<requirements>
- `TaxApportioner` (renomear `OperationalCostAllocationService`): rateio proporcional de taxas por volume financeiro com algoritmo Largest Remainder
- `ImportTransactionsUseCase`: parseia arquivo → rateia taxas → persiste transações → recalcula posições afetadas
- Parser CSV/XLSX adaptado para gerar `TransactionRecord[]` (com `brokerId` em vez de `broker` string)
- `BrokerageNoteParserPort` mantido como interface strategy
- Seleção de arquivo via `dialog.showOpenDialog` do Electron (filtro por extensão)
- Modelo de planilha exibido na tela (colunas obrigatórias e opcionais)
- Preview dos dados extraídos antes de confirmar
- Confirmação persiste e recalcula posições
- Idempotência via `externalRef` e `importBatchId`
- Nomenclatura: `tax-apportioner.service.ts`
</requirements>

## Subtarefas

- [ ] 12.1 Renomear `OperationalCostAllocationService` → `TaxApportioner` em `src/main/domain/ingestion/tax-apportioner.service.ts`. Manter a mesma lógica de rateio proporcional + Largest Remainder. Atualizar imports em todo o projeto.
- [ ] 12.2 Adaptar parser CSV/XLSX em `src/main/infrastructure/parsers/` para gerar `TransactionRecord[]` com `brokerId` (resolver broker pelo nome via `BrokerRepository`). Manter strategy pattern.
- [ ] 12.3 Criar/refatorar `ImportTransactionsUseCase` em `src/main/application/use-cases/import-transactions-use-case.ts`:
  - Recebe caminho do arquivo + identificação de corretora/tipo
  - Seleciona parser via strategy
  - Parseia arquivo → obtém transações brutas
  - Aplica `TaxApportioner` para ratear taxas por nota
  - Gera `importBatchId` (UUID) e `externalRef` para idempotência
  - Persiste transações via `TransactionRepository.saveMany()`
  - Recalcula posições dos tickers afetados via `RecalculatePositionUseCase`
  - Retorna resumo (qtd importada, tickers afetados)
- [ ] 12.4 Criar `PreviewImportUseCase` (ou método no `ImportTransactionsUseCase`): parseia e rateia sem persistir, retorna preview para conferência do usuário.
- [ ] 12.5 Atualizar contratos compartilhados: `src/shared/contracts/import-transactions.contract.ts`, `src/shared/contracts/preview-import.contract.ts`.
- [ ] 12.6 Criar handler IPC `import:select-file` (abre `dialog.showOpenDialog` com filtro `.csv,.xlsx`), `import:preview-file` e `import:confirm-transactions`. Atualizar `register-main-handlers.ts`.
- [ ] 12.7 Atualizar preload e `electron-api.ts` com os novos canais.
- [ ] 12.8 Atualizar composition root para instanciar `TaxApportioner`, `ImportTransactionsUseCase`.
- [ ] 12.9 Criar/refatorar `ImportPage.tsx`:
  - Botão "Selecionar Arquivo" que abre dialog nativo de seleção
  - Exibição do modelo de planilha (tabela com colunas: Data, Tipo, Ticker, Quantidade, Preço Unitário, Taxas Totais, Corretora)
  - Select de corretora (lista do `BrokerRepository`)
  - Tabela de preview com dados extraídos (editável se necessário)
  - Botão "Confirmar Importação" → feedback de sucesso com resumo
  - Tratamento de erros (formato inválido, arquivo não suportado, CNPJ não encontrado)
- [ ] 12.10 Testes de unidade e integração.
- [ ] 12.11 Remover classes não utilizadas após refatoração

## Detalhes de Implementação

Consultar as seções **TaxApportioner**, **BrokerageNoteParserPort** e **Importação** da `techspec.md`.

**Fluxo de importação:**

```
1. Usuário clica "Selecionar Arquivo" → dialog nativo retorna caminho
2. Renderer envia caminho via IPC → handler chama PreviewImportUseCase
3. Parser extrai dados → TaxApportioner rateia taxas → retorna preview ao renderer
4. Usuário confere dados na tabela de preview
5. Usuário clica "Confirmar" → handler chama ImportTransactionsUseCase
6. Transações persistidas + posições recalculadas
7. Renderer atualiza tabela de posições
```

**Modelo de planilha (colunas):**

| Coluna | Tipo | Obrigatória | Descrição |
|:-------|:-----|:------------|:----------|
| Data | texto (YYYY-MM-DD) | Sim | Data do pregão |
| Tipo | texto (Compra/Venda) | Sim | Tipo de operação |
| Ticker | texto | Sim | Código do ativo (ex: PETR4) |
| Quantidade | número | Sim | Quantidade negociada |
| Preço Unitário | número | Sim | Preço por unidade |
| Taxas Totais | número | Não (default 0) | Custos operacionais da nota |
| Corretora | texto | Sim | Nome da corretora (deve existir no cadastro) |

## Critérios de Sucesso

- Usuário seleciona arquivo CSV/XLSX e vê preview dos dados extraídos
- Modelo de planilha é exibido na tela para referência
- Confirmação persiste transações e atualiza posições na tabela
- Rateio de taxas é proporcional ao volume e centavos somam corretamente
- Importação duplicada (mesmo `externalRef`) é bloqueada
- Erros de formato exibem mensagem clara
- Todos os testes passam

## Testes da Tarefa

- [ ] Testes de unidade: `TaxApportioner` — rateio proporcional, centavos, operação única, múltiplas operações, custo zero
- [ ] Testes de unidade: `ImportTransactionsUseCase` — fluxo completo com mocks, idempotência, recálculo de posições
- [ ] Testes de unidade: `PreviewImportUseCase` — preview sem persistência
- [ ] Testes de integração: parser CSV/XLSX → TaxApportioner → persistência → verificação de posições com SQLite in-memory
- [ ] Testes de integração: handlers IPC `import:preview-file` e `import:confirm-transactions`
- [ ] Teste de regressão: importar arquivo → verificar posição consolidada (PM global correto com taxas rateadas)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/ingestion/tax-apportioner.service.ts` (renomear de operational-cost-allocation.service.ts)
- `src/main/application/use-cases/import-transactions-use-case.ts` (criar/refatorar)
- `src/main/infrastructure/parsers/csv-xlsx-brokerage-note.parser.ts` (refatorar)
- `src/main/infrastructure/parsers/brokerage-note-parser.strategy.ts` (refatorar)
- `src/shared/contracts/import-transactions.contract.ts` (criar/refatorar)
- `src/shared/contracts/preview-import.contract.ts` (atualizar)
- `src/main/ipc/handlers/register-main-handlers.ts` (atualizar)
- `src/preload.ts` (atualizar)
- `src/shared/types/electron-api.ts` (atualizar)
- `src/renderer/pages/ImportPage.tsx` (refatorar)
- `src/renderer/App.tsx` (atualizar se necessário)
