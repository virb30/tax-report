# Tarefa 3.0: Refatorar `CsvXlsxTransactionParser` para utilizar o mapeador da B3

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Integrar o `B3SpreadsheetTransactionMapper` no interior do componente `CsvXlsxTransactionParser`. Refatorar as colunas lógicas exigidas, ativando early returns e excluindo os parseadores legados locais.

<requirements>
- Alterar as propriedades de validação do cabeçalhos procurando pelas strings do layout da B3.
- Acoplar o Mapeador para fazer o _parse_ dinâmico.
- Ignorar de fato as linhas devolvidas em `shouldIgnore` aplicando o salto (`continue`) de loop sem contabilizar a linha nem travar o array de outputs com o item vazio.
- Limpar todo código defasado que traduzia nomes antigos para `OperationType` usando "Tipo".
</requirements>

## Subtarefas

- [ ] 3.1 Alterar a constante local `REQUIRED_COLUMNS` no parseador para requisitar ["Entrada/Saída", "Movimentação"] ao invés de ["Tipo", ...].
- [ ] 3.2 Fornecer localmente via instancia ou Injeção de dependência o `B3SpreadsheetTransactionMapper` e extrair sua função na iteração de validação/casting da data row.
- [ ] 3.3 Construir a tratativa em if sobre a flag `shouldIgnore` e permitir a linha ser completamente silenciada no log _output_ (utilizando `continue` ou early retorno map filter). E retransmitir Erros do Bonus adequadamente se ocorridos.
- [ ] 3.4 Expurgar métrodos como `parseOperationType` e análogos privados obsoletos.
- [ ] 3.5 Executar cobertura de Testes para o `CsvXlsxTransactionParser` com todas flags _green/passing_. E verificar execuções e2e de importação (com os mocks gerados da etapa 2.0).

## Detalhes de Implementação

Seguir Passo 3 da Ordem em `techspec.md` lidando ativamente com os returns assíncronos (se houver via Streams). Cuidar para ignorar colunas da mesma forma acentríca (uso do helper de strip accents).

## Critérios de Sucesso

- O Parser de CSV e XLSX valida perfeitamente com 100% sucesso novos arquivos sem necessitar a coluna legado `Tipo`.
- Toda estrutura legada na base do código parser baseada no layout antigo foi limpa.
- Todos os Unit tests acendem Verde novamente.

## Testes da Tarefa

- [x] Testes de unidade
- [x] Testes de integração

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.ts`
- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.test.ts`
