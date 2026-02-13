# Tarefa 5.0: Correção de Rateio de Custos Operacionais por Nota (MVP)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Corrigir a lógica de custo operacional para suportar notas de negociação com múltiplos ativos, aplicando rateio proporcional do custo total da nota entre as operações elegíveis e garantindo aderência ao RF-17. Esta tarefa depende da 4.0 e desbloqueia precisão do preço médio para o relatório do MVP.

<requirements>
- Implementar regra explícita de rateio do custo total da nota entre múltiplos ativos por critério proporcional determinístico
- Garantir conservação do total: soma dos custos rateados por operação deve ser igual ao custo operacional total da nota
- Aplicar tratamento de arredondamento com ajuste final de centavos sem quebrar determinismo
- Integrar o rateio no fluxo de ingestão antes da persistência da operação
- Preservar compatibilidade com notas de ativo único e custo operacional zero
- Garantir consistência com RF-16, RF-17, RF-18 e RF-19
- Cobrir cenário com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 5.1 Definir contrato de entrada da nota contendo custo total e operações por ativo
- [ ] 5.2 Implementar serviço de rateio proporcional com regra de arredondamento e ajuste de centavos
- [ ] 5.3 Integrar serviço de rateio ao adapter de ingestão (parser -> normalização -> persistência)
- [ ] 5.4 Garantir persistência de `operationalCosts` rateado por operação
- [ ] 5.5 Validar cenários de nota com múltiplos ativos, ativo único e custo zero
- [ ] 5.6 Criar testes de unidade do algoritmo de rateio e invariantes de soma total
- [ ] 5.7 Criar testes de integração do fluxo `import -> operations -> recalculate portfolio`

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Modelos de Dados"** (`TradeOperation.operationalCosts`), **"Pontos de Integração"**, **"Abordagem de Testes"** (integração parser + use case + repositório) e **"Sequenciamento de Desenvolvimento"** (itens 5 e 7). Consulte no `prd.md` os requisitos RF-04, RF-06, RF-11, RF-16, RF-17, RF-18 e RF-19.

## Critérios de Sucesso

- Custo operacional total da nota é rateado de forma proporcional, determinística e reprodutível
- Soma dos custos rateados por operação bate exatamente com o custo total da nota
- Preço médio incremental permanece correto após importação de nota com múltiplos ativos
- Fluxo de ingestão mantém separação de camadas sem acoplamento indevido no domínio

## Testes da Tarefa

- [ ] Testes de unidade (algoritmo de rateio, arredondamento e conservação de total)
- [ ] Testes de integração (parser/adapters + persistência + recálculo de posição)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/infrastructure/parsers/`
- `src/main/infrastructure/persistence/`
- `src/main/application/use-cases/`
- `src/main/database/repositories/operation-repository.ts`
- `src/main/domain/portfolio/average-price-service.ts`
