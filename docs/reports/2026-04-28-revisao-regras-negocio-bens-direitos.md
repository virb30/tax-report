# Revisão de Regras de Negócio — Bens e Direitos

## Contexto

- Escopo analisado: `saldo inicial`, `importação de movimentações`, `importação de posição consolidada`, `recálculo de posição` e `relatório anual`.
- Referência fiscal usada nesta revisão: **IRPF 2026 / ano-calendário 2025**, para **pessoa física residente no Brasil**.
- Fontes oficiais consultadas em 2026-04-28:
  - [Perguntas e Respostas IRPF 2026](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/dirpf/p-r-irpf-2026-v1-0-2026-04-18.pdf)
  - [Manual MIR — Bens Financeiros](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/patrimonio/bens-financeiros)
  - [Tabela de grupos/códigos da Receita](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/formularios/impostos/abex.html/view)

## Achados

### BR-01 — Tipagem de ativo cai em `stock` nos fluxos importados

- **Tipo**: problema
- **Severidade**: alta
- **Evidência no código**:
  - `src/main/domain/portfolio/services/position-calculator.service.ts:22`
  - `src/main/application/use-cases/recalculate-position/recalculate-position.use-case.ts:51`
  - `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.ts:34`
  - `src/main/infrastructure/parsers/csv-xlsx-consolidated-position.parser.ts:8`
- **Leitura do problema**: quando o ativo nasce por importação, o sistema não resolve `assetType`; na ausência de posição prévia, a posição é criada como `AssetType.Stock`. Isso afeta compra/venda, importação de posição consolidada e qualquer recálculo posterior.
- **Impacto fiscal**: FII, ETF e BDR podem sair com grupo/código e limiar declaratório errados. O erro contamina a ficha de Bens e Direitos inteira.
- **Direção de implementação**:
  - criar uma estratégia obrigatória de resolução de tipo (`coluna explícita`, `cadastro de ticker`, ou `confirmação do usuário`);
  - impedir gravação/importação quando o tipo não estiver resolvido;
  - adicionar fluxo de correção de tipo para posições já persistidas.

### BR-02 — Relatório induz preenchimento por corretora e calcula custo por corretora com PM global

- **Tipo**: problema
- **Severidade**: alta
- **Evidência no código**:
  - `src/main/domain/tax-reporting/report-generator.service.ts:84-109`
  - `src/renderer/pages/ReportPage.tsx:48-55`
  - `src/renderer/pages/ReportPage.tsx:199-223`
- **Leitura do problema**: o backend gera `allocTotalCost` como `quantidade da corretora x PM global`; o frontend achata cada alocação em uma linha copiável. Esse valor por corretora não representa custo histórico real por custodiante, porque o modelo guarda só quantidade por corretora, não custo por corretora.
- **Regra fiscal relacionada**: a Receita orienta item por patrimônio/tipo, com descrição contendo quantidade/tipo e demais informações; não há base no modelo atual para transformar cada corretora em item autônomo com custo correto.
- **Impacto fiscal**: o usuário pode declarar o mesmo ticker em vários itens ou informar custo artificialmente repartido entre corretoras.
- **Direção de implementação**:
  - mudar o relatório para **um item declaratório por ativo/tipo**;
  - usar a lista de corretoras apenas dentro da discriminação consolidada;
  - remover da UI o conceito de “custo total por corretora”, a menos que o domínio passe a armazenar custo histórico por corretora.

### BR-03 — Relatório não entrega os dois campos exigidos pela ficha (`31/12 ano anterior` e `31/12 ano-base`)

- **Tipo**: gap
- **Severidade**: alta
- **Evidência no código**:
  - `src/shared/contracts/assets-report.contract.ts:31-33`
  - `src/main/application/use-cases/generate-asset-report/generate-assets-report.use-case.ts:16-38`
  - `src/renderer/pages/ReportPage.tsx:161`
- **Regra fiscal relacionada**:
  - Perguntão IRPF 2026: os bens devem refletir o patrimônio em **31/12/2024** e **31/12/2025**.
  - MIR: os patrimônios recuperados devem vir com o valor em `31/12/ano anterior`, e o contribuinte informa `31/12/ano-calendário`.
- **Impacto fiscal**: o app entrega só um retrato de `31/12` do ano-base; ainda falta ao usuário descobrir e transportar o valor do ano anterior.
- **Direção de implementação**:
  - ampliar o contrato do relatório com `previousYearValue`, `currentYearValue` e `acquiredInYear`;
  - exibir esses campos separadamente na UI;
  - permitir cópia individual dos campos usados na declaração.

### BR-04 — Faltam regras de limiar declaratório por classe de bem

- **Tipo**: gap
- **Severidade**: alta
- **Evidência no código**:
  - `src/main/domain/tax-reporting/report-generator.service.ts:74-79`
- **Regra fiscal relacionada**:
  - Participações societárias e ativos negociados em bolsa no Brasil, exceto ações e fundos: declarar a partir de **R$ 1.000,00**.
  - Fundos: declarar quando o saldo em `31/12` for **maior que R$ 140,00**.
- **Impacto fiscal**: o app lista toda posição positiva como se fosse automaticamente item declarável.
- **Direção de implementação**:
  - criar um motor de elegibilidade declaratória por grupo/código;
  - marcar itens como `obrigatório`, `facultativo` ou `abaixo do limiar`;
  - permitir filtro para esconder itens não obrigatórios.

### BR-05 — Metadados do emissor existem no banco, mas não há fluxo operacional para preenchê-los

- **Tipo**: gap
- **Severidade**: alta
- **Evidência no código**:
  - `src/main/database/migrations/009-create-ticker-data.ts:6-9`
  - `src/main/infrastructure/repositories/knex-asset.repository.ts:38-46`
  - `src/main/domain/tax-reporting/report-generator.service.ts:80`
  - ausência de IPC/UI específica em `src/shared/types/electron-api.ts:53-65`
- **Leitura do problema**: o relatório depende de `ticker_data`, mas o produto não expõe cadastro/importação de nome/CNPJ do emissor. Na prática, o fallback é `N/A`.
- **Impacto fiscal**: a geração “pronta para copiar” fica incompleta justamente nos campos mais sensíveis para conferência do bem.
- **Direção de implementação**:
  - criar um cadastro de tickers/emissores;
  - permitir enriquecimento manual e, opcionalmente, importação em lote;
  - bloquear ou sinalizar relatório com metadados obrigatórios ausentes.

### BR-06 — Saldo inicial manual não é multi-corretora e não é idempotente

- **Tipo**: problema
- **Severidade**: média
- **Evidência no código**:
  - `src/main/domain/portfolio/entities/position-broker-allocation.ts:17`
  - `src/main/domain/portfolio/entities/asset-position.entity.ts:159-168`
  - `src/main/application/use-cases/set-initial-balance/set-initial-balance.use-case.ts:31-49`
  - `src/renderer/pages/initial-balance-page/InitialBalancePositionsTable.tsx:18-43`
- **Leitura do problema**:
  - `applyInitialBalance` troca o breakdown inteiro por uma única corretora;
  - `setInitialBalance` sempre grava nova transação e não substitui a anterior;
  - a UI não oferece editar/remover saldo inicial.
- **Impacto fiscal**: posições do mesmo ticker em mais de uma corretora ou correções de saldo inicial podem produzir base inconsistente para o relatório.
- **Direção de implementação**:
  - tratar saldo inicial como documento editável por `ticker + ano`, com múltiplas alocações;
  - substituir transações `initial_balance` anteriores do mesmo contexto ao salvar;
  - adicionar edição/remoção na UI.

### BR-07 — Cobertura de ativos/eventos relevantes para Bens e Direitos ainda é estreita

- **Tipo**: gap
- **Severidade**: média
- **Evidência no código/documentação**:
  - `src/shared/types/domain.ts:1-5`
  - `docs/tasks/prd-eventos-corporativos/prd.md:59-64`
- **Leitura do gap**:
  - o domínio suporta só `stock`, `fii`, `etf` e `bdr`;
  - a própria documentação marca como fora de escopo eventos que alteram custo patrimonial, como `amortização de FII`, `subscrições`, `conversão de ativos` e `frações`.
- **Regra fiscal relacionada**:
  - o MIR hoje contempla classes adicionais em `Fundos` (ex.: `Fiagro`, `FIP`, `FIDC`, `fundos de índice de renda fixa`) e `Aplicações e Investimentos`.
  - eventos como amortização e subscrição alteram o valor que vai para Bens e Direitos.
- **Impacto fiscal**: a posição de `31/12` pode ficar incorreta mesmo que as operações “básicas” estejam corretas.
- **Direção de implementação**:
  - explicitar em produto o escopo suportado e o não suportado;
  - priorizar primeiro os eventos que alteram custo patrimonial sem envolver DARF (`amortização`, `subscrição`, `conversão`);
  - expandir a taxonomia de ativos antes de anunciar suporte amplo a “renda variável”.

## Ordem sugerida de ataque

1. **Resolver tipagem de ativo na origem** (`BR-01`), porque isso hoje invalida classificação, limiar e relatório.
2. **Redesenhar o modelo declaratório do relatório** (`BR-02` + `BR-03` + `BR-04`).
3. **Criar cadastro operacional de metadados de ticker/emissor** (`BR-05`).
4. **Revisar saldo inicial manual para multi-corretora e edição segura** (`BR-06`).
5. **Abrir épico de cobertura de ativos/eventos não suportados** (`BR-07`).

## Observações finais

- A classificação atual de `BDR` em `04/04` parece consistente com a estrutura atual da Receita; o principal problema não está no código do BDR em si, e sim em o sistema não conseguir descobrir de forma confiável quando um ticker importado é BDR.
- Esta revisão foi intencionalmente limitada ao que impacta a ficha **Bens e Direitos**. Ela não cobre apuração mensal, IRRF, compensação de prejuízo ou DARF.
