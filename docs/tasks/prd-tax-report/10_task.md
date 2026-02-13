# Tarefa 10.0: Correção de Rateio de Custos Operacionais por Nota

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Corrigir a lógica de custo operacional para suportar notas de negociação com múltiplos ativos, aplicando o rateio proporcional do custo total da nota entre as operações elegíveis e persistindo `operationalCosts` já distribuído por operação. Esta tarefa garante aderência ao RF-17 sem mover regra tributária para fora das camadas corretas.

<requirements>
- Implementar regra explícita de rateio de custos operacionais totais por nota entre os ativos movimentados
- Definir critério determinístico de proporcionalidade (base de cálculo por financeiro da operação) e tratamento de arredondamento
- Garantir conservação do total: soma dos custos rateados por operação deve ser igual ao custo total da nota
- Aplicar rateio no fluxo de ingestão/adapters antes da persistência das operações
- Manter compatibilidade com notas de ativo único e com entradas já normalizadas por operação
- Preservar atualização incremental de preço médio no domínio Portfolio usando `operationalCosts` por operação
- Cobrir cenários críticos com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 10.1 Definir contrato de entrada de nota com custo total e operações por ativo
- [ ] 10.2 Implementar serviço de rateio proporcional com estratégia de arredondamento e ajuste de centavos
- [ ] 10.3 Integrar serviço de rateio ao adapter de ingestão (parser -> normalização -> persistência)
- [ ] 10.4 Garantir persistência de `operationalCosts` rateado por operação na tabela `operations`
- [ ] 10.5 Validar comportamento em nota com múltiplos ativos, ativo único e custo zero
- [ ] 10.6 Criar testes de unidade para algoritmo de rateio e invariantes de soma total
- [ ] 10.7 Criar testes de integração do fluxo `import -> operations -> portfolio recalculate`
- [ ] 10.8 Criar teste de regressão para confirmar aderência ao RF-17 sem quebrar RF-16, RF-18 e RF-19

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Infrastructure Layer"** (adapters/parsers), **"Modelos de Dados"** (`TradeOperation.operationalCosts`), **"Pontos de Integração"** (entrada de arquivos), **"Abordagem de Testes"** (integração parser + use case + repositório) e **"Sequenciamento de Desenvolvimento"** (itens 5 e 7). Consulte no `prd.md` os requisitos RF-04, RF-06, RF-11, RF-16, RF-17, RF-18 e RF-19.

## Critérios de Sucesso

- Custos operacionais totais de uma nota com múltiplos ativos são rateados de forma proporcional e determinística
- Soma dos custos rateados por operação bate exatamente com o custo total da nota
- Preço médio incremental permanece correto após importação de notas com custo total agregado
- Fluxo de ingestão mantém separação de camadas e não introduz acoplamento indevido no domínio

## Testes da Tarefa

- [ ] Testes de unidade (algoritmo de rateio, arredondamento e conservação do total)
- [ ] Testes de integração (parser/adapters + persistência + recálculo de posição)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `docs/tasks/prd-tax-report/tasks.md`
- `src/main/infrastructure/parsers/`
- `src/main/infrastructure/persistence/`
- `src/main/application/use-cases/`
- `src/main/database/repositories/operation-repository.ts`
- `src/main/domain/portfolio/average-price-service.ts`
