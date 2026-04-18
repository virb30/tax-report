# Tarefa 1.0: Atualização dos Contratos, Bonificação e Transferência de Custódia

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Esta tarefa abrange a definição dos novos enumeradores para suportar as operações de eventos corporativos e transferências, além da implementação das lógicas de acréscimo de custo proveniente de bonificações e a alocação passiva das transferências entre corretoras.

<requirements>
- Os novos tipos de transação (`Bonus`, `Split`, `ReverseSplit`, `Transfer`) devem ser incluídos no domínio.
- O evento de bonificação deve adicionar um custo financeiro à posição existente através da fórmula `Custo Total Novo = Custo Total Antigo + (Qtd_recebida * Custo_Unitário)`.
- O evento de transferência deve alterar passivamente o registro do custodiante sem engatilhar recálculo de preço médio ou custo total do ativo.
</requirements>

## Subtarefas

- [ ] 1.1 Adicionar os enum types de `Bonus`, `Split`, `ReverseSplit` e `Transfer` em `TransactionType`.
- [ ] 1.2 Atualizar testes correspondentes (se houver factories de testes) para evitar quebras nas estruturas existentes.
- [ ] 1.3 Adicionar e modificar lógica de Bonificação (`applyBonus` na entidade `AssetPosition` etc.) para contemplar a injeção do custo unitário (`unitCost`) da bonificação. 
- [ ] 1.4 Adicionar suporte e tratativa para o evento `Transfer` no controle de locação de corretoras do ativo (refletindo mudança na entidade e serviço sem afetar a matemática).

## Detalhes de Implementação

- Alterar `src/shared/types/domain.ts` (onde reside a definição do Enum `TransactionType`).
- Modificar contrato da interface do input de `applyBonus` em favor de receber dados de preço (baseado no `unitPrice` da transação) conforme especificado na `techspec.md`.
- Fazer os ajustes necessários na camada de Domain Services e na Entidade `AssetPosition`.

## Critérios de Sucesso

- As instâncias reagem corretamente quando submetidas a uma Bonificação, empurrando o PM e o Custo Total para cima em conformidade com o custo por cota recebido (se o valor for maior que nulo).
- A mudança de broker (`Transfer`) flui de maneira passiva para as alocações da corretora e registro das transações, resguardando imutavelmente os totais numéricos e contábeis já apurados pelo investidor anteriormente.
- Todo o conjunto enum compilável para a aplicação e devidamente lido pelos tipos estritos.

## Testes da Tarefa

- [ ] Testes de unidade (em `.spec.ts` ou `.test.ts`) avaliando as validações acima na Entidade `AssetPosition`.
- [ ] Testes de integração na camada de serviços (se necessário para a Transferência de Locação de Custódia e Bonificação).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/shared/types/domain.ts`
- `src/main/domain/portfolio/entities/asset-position.entity.ts`
- `src/main/domain/portfolio/entities/transaction.entity.ts`
- `src/main/domain/portfolio/services/average-price.service.ts`
