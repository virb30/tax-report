# Tarefa 14.0: Validação Final do MVP

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Validação ponta a ponta do MVP com suíte E2E (Playwright), testes de integração abrangentes, cenários multi-corretora, fluxo de migração de ano e checklist de aceite. Ao final, todos os fluxos do MVP estão validados com testes automatizados e o app está pronto para uso.

<requirements>
- Suíte E2E com Playwright cobrindo todos os fluxos do MVP
- Testes de integração end-to-end (import → portfolio → report)
- Cenários multi-corretora (mesmo ticker em 2+ corretoras)
- Cenário de migração entre anos
- Cenário de recálculo retroativo (importar nota antiga e recalcular)
- Checklist de aceite baseado nas métricas de sucesso do PRD
- Validação de consistência: PM calculado confere com cálculo manual de referência
- Teste de regressão completo
</requirements>

## Subtarefas

- [ ] 14.1 Criar suíte E2E com Playwright em `src/renderer/workflows/`:
  - **Fluxo 1 — Gestão de Corretoras**: abrir app → ver corretoras do seed → cadastrar nova corretora → verificar na tabela.
  - **Fluxo 2 — Saldo Inicial**: cadastrar saldo inicial para PETR4 na XP → verificar posição na tabela → cadastrar saldo para PETR4 na Clear → verificar PM global consolidado.
  - **Fluxo 3 — Importação CSV**: selecionar arquivo CSV de teste → verificar preview → confirmar → verificar posições atualizadas.
  - **Fluxo 4 — Relatório de Bens e Direitos**: gerar relatório para ano-base → verificar itens com discriminação, CNPJ e classificação → copiar discriminação.
  - **Fluxo 5 — Migração entre Anos**: criar posições em 2024 → migrar para 2025 → verificar transações InitialBalance criadas → verificar posições do novo ano.
  - **Fluxo 6 — Recálculo Retroativo**: importar operações → importar nota retroativa (data anterior) → recalcular → verificar PM atualizado.
- [ ] 14.2 Criar testes de integração abrangentes:
  - Fluxo completo: importar CSV com 3 ativos (ação, FII, ETF) de 2 corretoras → verificar posições consolidadas → gerar relatório → validar discriminações.
  - Cenário multi-corretora: PETR4 comprada na XP e na Clear → PM global único, brokerBreakdown com 2 entradas.
  - Cenário de bonificação: compra → bonificação → PM dilui corretamente.
  - Cenário de venda parcial: compra 100 → venda 30 → PM mantém → posição = 70.
- [ ] 14.3 Criar dados de teste de referência com cálculos manuais:
  - Planilha com operações pré-definidas e PM esperado calculado manualmente
  - Validar que o sistema produz exatamente o mesmo resultado
  - Incluir casos: compra simples, múltiplas compras, venda parcial, bonificação, multi-corretora
- [ ] 14.4 Checklist de aceite baseado no PRD:
  - [ ] Usuário importa notas e calcula PM em menos de 10 minutos
  - [ ] PM confere com cálculos manuais em 100% dos cenários
  - [ ] Relatório de Bens e Direitos gera texto de discriminação correto
  - [ ] CNPJ da corretora aparece no relatório
  - [ ] Botão copiar funciona para cada ativo
  - [ ] Posições multi-corretora consolidam PM global
  - [ ] Migração entre anos funciona sem duplicação
  - [ ] Erros são exibidos com mensagens claras e acionáveis
  - [ ] App inicia sem erros em base limpa
  - [ ] Navegação entre abas funciona sem ordem obrigatória (RF-01, RF-02)
- [ ] 14.5 Validar conformidade com regras de `.cursor/rules/`:
  - Nomenclatura de arquivos segue `[nome].[tipo].ts`
  - Clean Architecture: domain não depende de infra
  - Testes seguem padrão AAA
  - Cobertura de testes em `src/main/` (objetivo: 100% em código crítico)
- [ ] 14.6 Corrigir quaisquer bugs ou inconsistências encontradas durante a validação.

## Detalhes de Implementação

Consultar a seção **Abordagem de Testes** da `techspec.md` e as regras em `.cursor/rules/tests.mdc`.

**Dados de teste de referência (exemplo):**

```
Operação 1: Compra 100 PETR4 @ R$ 30,00 + R$ 10,00 taxas (XP)
  → PM = (100 × 30 + 10) / 100 = R$ 30,10

Operação 2: Compra 50 PETR4 @ R$ 32,00 + R$ 5,00 taxas (Clear)
  → PM = (100 × 30,10 + 50 × 32 + 5) / 150 = R$ 30,77

Operação 3: Venda 30 PETR4 @ R$ 35,00 (XP)
  → PM mantém R$ 30,77 | Qty = 120 (70 XP + 50 Clear)

Operação 4: Bonificação 15 PETR4 (XP)
  → Custo total anterior = 120 × 30,77 = R$ 3.692,40
  → Qty = 135 | PM = 3.692,40 / 135 = R$ 27,35

Relatório 31/12:
  → PETR4: 135 ações, PM R$ 27,35, Total R$ 3.692,25
  → XP: 85 ações | Clear: 50 ações
```

## Critérios de Sucesso

- Todos os testes E2E passam com sucesso
- Todos os testes de integração passam
- PM calculado confere com todos os cenários de referência manual
- Checklist de aceite 100% aprovado
- Zero bugs críticos abertos
- App funcional para uso real pelo desenvolvedor

## Testes da Tarefa

- [ ] Suíte E2E Playwright: 6 fluxos completos
- [ ] Testes de integração abrangentes: 4+ cenários
- [ ] Validação de dados de referência: 5+ cenários com cálculo manual cruzado
- [ ] Checklist de aceite: 10 itens verificados

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/renderer/workflows/mvp-flows.e2e.test.ts` (criar/refatorar)
- `src/renderer/workflows/mvp-flows.integration.test.ts` (criar/refatorar)
- `src/main/application/use-cases/*.integration.test.ts` (criar/atualizar)
- Todos os arquivos de teste existentes (verificar que passam)
