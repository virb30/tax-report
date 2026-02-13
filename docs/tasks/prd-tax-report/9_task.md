# Tarefa 9.0: Validação Final do MVP (Relatório, Qualidade e Observabilidade)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Finalizar o MVP com foco na confiabilidade da geração do relatório anual de Bens e Direitos, consolidando observabilidade mínima, critérios de aceite e regressão ponta a ponta dos fluxos entregues nas tarefas 5.0 a 8.0.

<requirements>
- Validar o fluxo completo do MVP: `import -> portfolio -> report`
- Garantir qualidade dos dados exibidos no relatório em 31/12 e textos de discriminação
- Instrumentar logs estruturados e métricas essenciais para rastrear falhas e performance
- Consolidar checklist de aceite funcional e técnico para release do MVP
- Definir explicitamente que DARF e prejuízo acumulado pertencem à tarefa 11.0 (v2)
- Cobrir o fechamento do MVP com testes de integração e E2E
</requirements>

## Subtarefas

- [ ] 9.1 Validar consistência do relatório anual com posição e preço médio persistidos
- [ ] 9.2 Validar classificação por grupo/código e texto de discriminação por ativo
- [ ] 9.4 Consolidar checklist de aceite do MVP com cenários positivos e negativos
- [ ] 9.5 Criar testes de integração do relatório anual com base persistida
- [ ] 9.6 Criar suíte E2E de regressão do fluxo completo do MVP

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Abordagem de Testes"** (integração e E2E) e **"Sequenciamento de Desenvolvimento"** (item 7). Consulte no `prd.md` os requisitos RF-29 a RF-32, critérios de sucesso do produto e requisitos de UX para feedback claro.

## Critérios de Sucesso

- Relatório anual está consistente com os dados persistidos de posição e custo
- Conteúdo de discriminação está pronto para uso na declaração sem retrabalho manual
- Logs e métricas permitem investigar erros e gargalos do fluxo do MVP
- Regressão ponta a ponta aprovada para os fluxos de importação, portfolio e relatório

## Testes da Tarefa

- [ ] Testes de unidade (formatação e classificação do relatório)
- [ ] Testes de integração (relatório + persistência + observabilidade básica)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/`
- `src/main/ipc/handlers/`
- `src/main/infrastructure/persistence/`
- `src/renderer/`
- `src/shared/contracts/`
