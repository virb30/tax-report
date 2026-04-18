# Tarefa 13.0: Relatório de Bens e Direitos (Tax Reporting Context)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o contexto de Tax Reporting do MVP: o serviço de domínio `ReportGenerator`, o caso de uso `GenerateAssetsReportUseCase` para posição consolidada em 31/12, e a UI completa do relatório com texto de discriminação formatado (PT-BR, R$), CNPJ da corretora e botão de copiar. Ao final, o usuário consegue selecionar o ano-base, gerar o relatório de Bens e Direitos e copiar o texto de discriminação de cada ativo para o programa da Receita Federal.

<requirements>
- `ReportGenerator` como serviço de domínio em `src/main/domain/tax-reporting/`
- `GenerateAssetsReportUseCase` que consolida posições em 31/12 com PM global e detalhamento por corretora (CNPJ)
- Texto de discriminação no formato RFB: "[QTD] ações/cotas [TICKER]. CNPJ: [CNPJ_CORRETORA]. Corretora: [NOME_CORRETORA]. Custo médio: R$ [PM]. Custo total: R$ [TOTAL]."
- Classificação por grupo/código da Receita: Ações (03/01), FIIs (07/03), ETFs (07/09), BDRs (03/01)
- Moeda em R$ (formato brasileiro: `1.234,56`)
- Relatório agrupado por tipo de ativo
- Botão de copiar por ativo (texto de discriminação) e copiar tudo
- Handler IPC: `report:assets-annual`
- UI: ReportPage com tabela formatada e botões de copiar
</requirements>

## Subtarefas

- [ ] 13.1 Criar `ReportGenerator` em `src/main/domain/tax-reporting/report-generator.service.ts`:
  - Recebe posições consolidadas + dados de corretoras
  - Para cada posição com qty > 0, gera item de relatório: ticker, assetType, totalQuantity, averagePrice, totalCost, classificação RFB, texto de discriminação por alocação (uma entrada por corretora)
  - Formato de discriminação: `"[QTD] ações/cotas [TICKER]. CNPJ: [CNPJ]. Corretora: [NOME]. Custo médio: R$ [PM]. Custo total: R$ [TOTAL]."`
  - Classificação: stock/bdr → Grupo 03/Código 01, fii → Grupo 07/Código 03, etf → Grupo 07/Código 09
- [ ] 13.2 Refatorar `GenerateAssetsReportUseCase` em `src/main/application/use-cases/generate-assets-report-use-case.ts`:
  - Recebe `{ baseYear: number }`
  - Calcula data de corte `{baseYear}-12-31`
  - Busca todas as transações até a data de corte via `TransactionRepository.findByPeriod()`
  - Reconstrói posições de cada ticker aplicando transações em ordem cronológica (mesmo algoritmo do recálculo, mas até a data de corte)
  - Busca corretoras via `BrokerRepository.findAll()` para enriquecer com nome e CNPJ
  - Passa posições + corretoras para o `ReportGenerator`
  - Retorna relatório formatado
- [ ] 13.3 Atualizar contrato compartilhado: `src/shared/contracts/assets-report.contract.ts` — incluir campos de CNPJ, nome da corretora, discriminação formatada, classificação RFB.
- [ ] 13.4 Criar/atualizar handler IPC `report:assets-annual`. Atualizar `register-main-handlers.ts`.
- [ ] 13.5 Atualizar preload e `electron-api.ts`.
- [ ] 13.6 Atualizar composition root.
- [ ] 13.7 Refatorar `ReportPage.tsx`:
  - Select de ano-base (default: ano anterior ao corrente)
  - Botão "Gerar Relatório"
  - Tabela agrupada por tipo de ativo (Ações, FIIs, ETFs, BDRs)
  - Para cada ativo: ticker, quantidade, PM (R$), custo total (R$), corretora(s), grupo/código RFB
  - Texto de discriminação visível com botão "Copiar" individual
  - Botão "Copiar Tudo" (copia todas as discriminações)
  - Formato de moeda brasileiro: R$ 1.234,56
  - Estado vazio: "Nenhuma posição encontrada para o ano-base selecionado"
- [ ] 13.8 Ocultar aba "Apuração Mensal" no `App.tsx` (funcionalidade v2 — não faz parte do MVP).
- [ ] 13.9 Testes de unidade e integração.
- [ ] 13.10 Remover classes não utilizadas após refatoração

## Detalhes de Implementação

Consultar as seções **ReportGenerator**, **GenerateAssetsReportUseCase** e **Tax Reporting Context** da `techspec.md`.

**Lógica de reconstrução de posição na data de corte:**

O relatório não pode usar a posição "atual" do aggregate, pois ela pode conter transações de anos posteriores. O use case deve:
1. Buscar todas transações com `date <= {baseYear}-12-31`
2. Para cada ticker, criar AssetPosition vazio e aplicar transações em ordem
3. A posição resultante é a "foto" em 31/12

**Formato de discriminação por alocação:**

Se um ativo tem posição em 2 corretoras (XP e Clear), gera 2 entradas de discriminação:
- `"100 ações PETR4. CNPJ: 02.332.886/0001-04. Corretora: XP Investimentos. Custo médio: R$ 35,20. Custo total: R$ 3.520,00."`
- `"50 ações PETR4. CNPJ: 02.332.886/0011-78. Corretora: Clear Corretora. Custo médio: R$ 35,20. Custo total: R$ 1.760,00."`

Note que o **custo médio é o mesmo** (PM global), mas a **quantidade e custo total variam** por corretora.

## Critérios de Sucesso

- Usuário seleciona ano-base e vê relatório com posições consolidadas em 31/12
- Texto de discriminação segue formato RFB com CNPJ da corretora
- Moeda formatada como R$ brasileiro (separador de milhar `.`, decimal `,`)
- Classificação grupo/código correta por tipo de ativo
- Botão "Copiar" copia texto de discriminação para o clipboard
- Aba "Apuração Mensal" oculta
- Posições multi-corretora geram entradas separadas por corretora no relatório
- Todos os testes passam

## Testes da Tarefa

- [ ] Testes de unidade: `ReportGenerator` — texto de discriminação por tipo de ativo, classificação RFB, formato de moeda, posição multi-corretora
- [ ] Testes de unidade: `GenerateAssetsReportUseCase` — reconstrução de posição na data de corte, enriquecimento com dados de corretora, cenário sem posições
- [ ] Testes de integração: fluxo completo (criar transações → gerar relatório → verificar itens) com SQLite in-memory
- [ ] Testes de integração: handler IPC `report:assets-annual`
- [ ] Teste de regressão: importar operações de 2 corretoras para mesmo ticker → gerar relatório → verificar PM global e entradas separadas por corretora

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/tax-reporting/report-generator.service.ts` (criar)
- `src/main/application/use-cases/generate-assets-report-use-case.ts` (refatorar)
- `src/shared/contracts/assets-report.contract.ts` (atualizar)
- `src/main/ipc/handlers/register-main-handlers.ts` (atualizar)
- `src/preload.ts` (atualizar)
- `src/shared/types/electron-api.ts` (atualizar)
- `src/renderer/pages/ReportPage.tsx` (refatorar)
- `src/renderer/App.tsx` (atualizar — ocultar Apuração Mensal)
