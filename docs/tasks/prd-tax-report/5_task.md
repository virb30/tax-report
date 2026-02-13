# Tarefa 5.0: Domínio de TaxCompliance (Apuração Mensal e DARF)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o domínio de `TaxCompliance` para apuração mensal de ganhos/prejuízos, compensação de perdas por categoria e cálculo do DARF com dedução de IRRF. Esta tarefa depende da 4.0 e entrega o núcleo tributário do MVP.

<requirements>
- Implementar `MonthlyTaxAssessment` e `AccumulatedLossLedger`
- Implementar `LossCompensationService` por categoria tributária
- Implementar `DarfCalculatorService` com dedução de IRRF e piso zero
- Aplicar isenção mensal de ações para vendas abaixo do limite configurado
- Garantir separação por categorias (acoes, fii, etf, bdr) conforme PRD
- Preparar resultado de apuração para uso em casos de uso da tarefa 6.0
- Cobrir regras fiscais com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 5.1 Definir entidades e value objects do contexto `TaxCompliance`
- [ ] 5.2 Implementar consolidação mensal por categoria de ativo
- [ ] 5.3 Implementar compensação de prejuízos acumulados por categoria
- [ ] 5.4 Implementar cálculo de DARF com dedução de IRRF
- [ ] 5.5 Implementar regra de isenção para ações abaixo do limite mensal
- [ ] 5.6 Criar testes de unidade para lucro, prejuízo, compensação e isenção
- [ ] 5.7 Criar testes de integração para meses encadeados

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Modelos de Dados"** (TaxCompliance), **"Abordagem de Testes"** (domínio) e **"Sequenciamento de Desenvolvimento"** (ordem de construção item 3). Consulte no `prd.md` os requisitos RF-20 a RF-28.

## Critérios de Sucesso

- Apuração mensal por categoria implementada com regras tributárias corretas
- Compensação de prejuízo ocorre sem cruzamento indevido entre categorias
- DARF final considera IRRF e nunca resulta em valor negativo
- Resultado de apuração pronto para consumo em aplicação e UI

## Testes da Tarefa

- [ ] Testes de unidade (cenários fiscais completos)
- [ ] Testes de integração (sequência de meses com compensação)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/tax-compliance/`
- `src/shared/types/domain.ts`
