# Tarefa 1.0: Implementar a classe `B3SpreadsheetTransactionMapper`

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar a interface e a implementação da classe responsável pelo mapeamento das transações recebidas da planilha da B3 em tipos de operação internos do sistema. A classe verificará condições como bônus sem valor e itens que devem ser ignorados.

<requirements>
- Criar a interface `SpreadsheetTransactionMapper` e os tipos dependentes como `B3TransactionMappingResult`.
- Implementar `B3SpreadsheetTransactionMapper` seguindo a interface.
- Centralizar o dicionário/lógica das combinações para mapeamento e as strings das operações ignoradas.
- Implementar um lançamento de exceção explícito caso o tipo detectado seja de "Bonificação em ativos" e não possua o valor monetário extraído da planilha.
- Garantir que a classe não possua acoplamento com streams ou parsing, recebendo apenas os valores crus em texto das colunas.
</requirements>

## Subtarefas

- [x] 1.1 Criar a interface `SpreadsheetTransactionMapper` em contexto de domínio ou infrastrutura propício, e a entidade de retorno como `B3TransactionMappingResult`.
- [x] 1.2 Implementar a classe `B3SpreadsheetTransactionMapper` garantindo a limpeza das strings e processamento _case-insensitive_.
- [x] 1.3 Adicionar a rotina que avaliza e lança erro ao tentar mapear uma "Bonificação em ativos" com preço unitário/valor total nulo ou zerado.
- [x] 1.4 Configurar a devolução de `shouldIgnore: true` para predições e fluxos de descarte informados.
- [x] 1.5 Criar e configurar o arquivo de teste unitário (`b3-spreadsheet-transaction.mapper.test.ts`) isolado da classe do mapper com 100% de coverage nela.

## Detalhes de Implementação

Seguir o ponto 1 "Criar a B3SpreadsheetTransactionMapper" da seção Ordem de Construção na `techspec.md`. Utilizar SRP e deixá-la injetável. Repassa apenas ao objeto result as chaves necessárias.

## Critérios de Sucesso

- A classe converte corretamente as classes e direções Base.
- Ignora corretamente Direitos de Subscrições, Exercícios, Leilões e afins devolvendo a flag ignore.
- Erro forte gerado caso bonificação careça de valor preenchido na linha.
- Total cobertura de testes sobre essas regras unitárias.

## Testes da Tarefa

- [x] Testes de unidade
- [ ] Testes de integração

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/infrastructure/parsers/b3-spreadsheet-transaction.mapper.ts` (Novo)
- `src/main/infrastructure/parsers/b3-spreadsheet-transaction.mapper.test.ts` (Novo)
- `src/shared/types/domain.ts`
