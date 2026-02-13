# Tarefa 10.0: v2 - Domínio TaxCompliance (Apuração Mensal, DARF e Prejuízo Acumulado)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar na v2 o domínio de `TaxCompliance` para apuração mensal por categoria de ativo, compensação de prejuízos acumulados e cálculo de DARF com dedução de IRRF. Esta tarefa depende da conclusão do MVP (9.0) e amplia o produto com o fluxo fiscal mensal.

<requirements>
- Implementar `MonthlyTaxAssessment` e `AccumulatedLossLedger`
- Implementar `LossCompensationService` com segregação por categoria tributária
- Implementar `DarfCalculatorService` com dedução de IRRF e piso zero
- Aplicar isenção mensal para ações conforme limite configurado
- Garantir separação por categorias (acoes, fii, etf, bdr) conforme PRD
- Disponibilizar resultado de apuração para consumo por aplicação, IPC e UI da v2
- Cobrir regras fiscais com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 10.1 Definir entidades e value objects do contexto `TaxCompliance`
- [ ] 10.2 Implementar consolidação mensal por categoria de ativo
- [ ] 10.3 Implementar compensação de prejuízos acumulados por categoria
- [ ] 10.4 Implementar cálculo de DARF com dedução de IRRF
- [ ] 10.5 Implementar regra de isenção para ações abaixo do limite mensal
- [ ] 10.6 Expor DTOs e contratos para consulta de apuração mensal na aplicação
- [ ] 10.7 Criar testes de unidade para lucro, prejuízo, compensação e isenção
- [ ] 10.8 Criar testes de integração para meses encadeados com compensação acumulada

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Modelos de Dados"** (TaxCompliance), **"Abordagem de Testes"** (domínio e integração) e **"Sequenciamento de Desenvolvimento"** (item 3). Consulte no `prd.md` os requisitos RF-20 a RF-28 e RF-37 a RF-38.

## Critérios de Sucesso

- Apuração mensal por categoria implementada com regras tributárias corretas
- Compensação de prejuízo ocorre sem cruzamento indevido entre categorias
- DARF final considera IRRF e nunca resulta em valor negativo
- Resultado de apuração pronto para consumo pela aplicação e UI da v2

## Testes da Tarefa

- [ ] Testes de unidade (cenários fiscais completos por categoria)
- [ ] Testes de integração (sequência de meses com compensação e DARF)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/tax-compliance/`
- `src/main/application/use-cases/`
- `src/main/application/ports/`
- `src/main/infrastructure/persistence/`
- `src/main/ipc/handlers/`
- `src/shared/contracts/`
