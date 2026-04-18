# Tarefa 3.0: Tratativa de Alertas e Regras de Importação

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Estender o comportamento dos Casos de Uso (*Application Layer*) visando interceptar anomalias ou faltas em eventos corporativos — em especial a falta preenchimento de custo de bonificação no lote para alimentar via metadado de feedback o Client e a UI.

<requirements>
- Lançar ou injetar alertas estruturados (schema estipulado) em caso de omissão de preço unitário de um evento tipo `Bonus`.
- Assegurar fluidez e continuidade da pipeline nos 3 novos eventos lançados para as transações validadas (Splits, ReverseSplits, Transferencias) em consolidação normal.
</requirements>

## Subtarefas

- [ ] 3.1 Estender modelagem de resposta / Request / Interfaces (`PreviewImportOutput`) para suportar a nova tipagem de campo de *Warnings*.
- [ ] 3.2 O *Use Case* de Preview de Importação deve engatilhar falhas-leves (warnings) de tipo específico `'BONUS_MISSING_COST'` para a interface processar no topo de sua tabela.
- [ ] 3.3 Garantir que adaptadores de input (como os CSV Parsers/Factories, se existentes na camada de import) possuam ciência sobre esses enums estendidos.

## Detalhes de Implementação

- Seguir as marcações de alteração propostas na secção 1.3 / Endpoint de API (e `import-use-case.ts`) da `techspec.md`, que pede flexibilidade mantendo o fallthrough mas relatando o *soft error* perante importação de dados corrompidos preteritamente pelo usuário.

## Critérios de Sucesso

- O upload flui em todos os mocks, identificando e categorizando Transferência e Split.
- Ao rodar por uma Planilha com um apontamento `Transaction.Bonus` com atributo `unitPrice=0` ou vazio, deve injetar os alertas pro output exposto invés de engatilhar exceções críticas invalidando todo a leitura de importação.

## Testes da Tarefa

- [ ] Testes no nível Unitário em Application Services do Preview avaliando a extração dos Warnings nos logs criados pela matriz de eventos incorretos.
- [ ] Testes atestando pipeline desimpedida na Consolidação via `import-consolidated-position-use-case`.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/preview-import/preview-import-use-case.ts`
- `src/main/application/use-cases/import-consolidated-position/import-consolidated-position-use-case.ts`
