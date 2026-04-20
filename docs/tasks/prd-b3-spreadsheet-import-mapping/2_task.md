# Tarefa 2.0: Atualizar os Mock Datas e Arquivos Estáticos de Teste (.csv/.xlsx)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Esta etapa se concentra em adaptar todas as fixtures, mocks e arquivos vitrines estáticos da atual bateria de testes da funcionalidade de importação para portar as devidas novas colunas: "Entrada/Saída" e "Movimentação", abdicando da velha coluna "Tipo".

<requirements>
- Todos os arquivos estáticos de testes de integração (`.csv`, `.xlsx`) empregados pelo e2e ou integration layer devem ter os dados atualizados das colunas.
- Todos os eventuais mocks em memory contidos no `csv-xlsx-transaction.parser.test.ts` precisam refletir a nova estrutura de extrações.
- O código de produção NÃO sofrerá nenhuma refatoração ainda. Note que os testes irão momentaneamente falhar nos assertions passados até a Refatoração real ocorrer na task 3.
</requirements>

## Subtarefas

- [ ] 2.1 Identificar os arquivos `.csv` e `.xlsx` injetados nas suítes de teste (geralmente sob um utils/ test asset folder).
- [ ] 2.2 Substituir a coluna "Tipo" nos arquivos físicos por "Entrada/Saída" e "Movimentação", criando inputs que simulem corretamente entradas e debítos conforme planilhas da B3 reais.
- [ ] 2.3 Atualizar as _fixtures_ e mocks manuais em arrays/objetos (nos `describe` de unit/integration test) contidos em arquivos como o `csv-xlsx-transaction.parser.test.ts` com as chaves "entrada/saída" e "movimentação".

## Detalhes de Implementação

Refira-se à Ordem de Construção item 2 da `techspec.md`. O objetivo é trocar os identificadores de colunas nas bases cruas utilizadas para gerar testes. 

## Critérios de Sucesso

- Mocks CSV/XLSX contém cabeçalhos correspondentes e valores válidos nas células mapeadas de "Entrada/Saída" e "Movimentação".
- Nenhum rastro dos arrays em mocks usando hardcoded 'Tipo'.

## Testes da Tarefa

- [ ] Testes de unidade
- [ ] Testes de integração
(Essencialmente esta tarefa atualiza os artefatos de base de testes e não demanda escrita the testes de asserção)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- Artefatos de teste em `.../tests/` (como `.csv`, `.xlsx` etc ligados à _parse_ e _import_).
- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.test.ts`
