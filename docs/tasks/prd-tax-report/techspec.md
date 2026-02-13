# Especificação Técnica — Tax Report (DDD + Clean Architecture)

## Resumo Executivo

Esta atualização adota arquitetura orientada a domínio com Clean Architecture no `main process` do Electron, preservando a separação `src/main/`, `src/renderer/` e `src/shared/`. A solução será organizada por bounded contexts (`Ingestion`, `Portfolio`, `TaxCompliance`), com o domínio no centro (entidades, value objects, regras e invariantes), casos de uso na camada de aplicação e adapters de infraestrutura (SQLite/Knex, parser de arquivos, IPC) nas bordas.

A estratégia reduz acoplamento entre regra tributária, persistência e interface, permitindo evolução de regras fiscais por configuração/versionamento, inclusão de novas corretoras/parsers sem alterar o core e testes mais objetivos por camada. O baseline tributário do MVP permanece o do PRD atual (15% ações/ETF/BDR, 20% FII, isenção de R$ 20 mil para ações), com design preparado para múltiplos regimes no futuro.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **Domain Layer (`src/main/domain/`)**
  - `Ingestion Domain`: valida operação importada, normaliza origem, garante consistência mínima de dados.
  - `Portfolio Domain`: mantém posição, preço médio e invariantes de quantidade/custo.
  - `TaxCompliance Domain`: consolida mês, compensa prejuízos e calcula DARF.
- **Application Layer (`src/main/application/`)**
  - Casos de uso orientados a intenção do usuário: importar operações, registrar base manual, recalcular posição, apurar mês, gerar relatório.
  - Orquestra transações e chamadas a ports sem conter regra tributária central.
- **Infrastructure Layer (`src/main/infrastructure/`)**
  - Repositórios Knex/SQLite como implementações de ports.
  - Parsers (PDF/CSV) como adapters de entrada.
  - Mapeadores DTO <-> Domínio.
- **Interface Layer**
  - `src/main/ipc/`: handlers `ipcMain.handle` por caso de uso.
  - `src/preload.ts`: API segura via `contextBridge` com canais explícitos.
  - `src/renderer/`: UI React consumindo contratos tipados de `src/shared/`.

**Fluxo principal de dados**
1. Renderer solicita ação via preload (`window.electronApi.*`).
2. Handler IPC invoca um caso de uso.
3. Caso de uso coordena domínio + ports.
4. Adapters persistem/consultam SQLite.
5. Resultado retorna como DTO tipado ao renderer.

## Design de Implementação

### Interfaces Principais

```typescript
export interface OperationRepositoryPort {
  saveMany(operations: Operation[]): Promise<void>;
  findByPeriod(input: { startDate: string; endDate: string }): Promise<Operation[]>;
}

export interface AssetPositionRepositoryPort {
  findByTickerAndBroker(input: { ticker: string; broker: string }): Promise<AssetPosition | null>;
  save(position: AssetPosition): Promise<void>;
}

export interface TaxConfigRepositoryPort {
  getByAssetType(assetType: AssetType): Promise<TaxRuleConfig>;
  getActiveRegime(referenceDate: string): Promise<TaxRegime>;
}

export interface ImportOperationsUseCase {
  execute(input: ImportOperationsCommand): Promise<ImportOperationsResult>;
}
```

```typescript
export interface BrokerageNoteParserPort {
  supports(input: { broker: string; fileType: 'pdf' | 'csv' | 'xlsx' }): boolean;
  parse(filePath: string): Promise<ParsedOperation[]>;
}
```

### Modelos de Dados

- **Entidades de domínio**
  - `AssetPosition` (aggregate root): `ticker`, `broker`, `assetType`, `quantity`, `averagePrice`, `manualBase`.
  - `TradeOperation`: `tradeDate`, `operationType`, `quantity`, `unitPrice`, `operationalCosts`, `irrfWithheld`, `sourceType`.
  - `MonthlyTaxAssessment`: consolidação mensal por categoria.
  - `AccumulatedLossLedger`: saldo de prejuízo por categoria tributária.
- **Value Objects**
  - `Money`, `Quantity`, `Ticker`, `BrokerCode`, `TaxRate`, `ReferenceMonth`.
- **Serviços de domínio**
  - `AveragePriceService`
  - `LossCompensationService`
  - `DarfCalculatorService`
  - `AssetClassifierService`
- **DTOs de aplicação**
  - `ImportOperationsCommand/Result`
  - `ManualBaseCommand/Result`
  - `AssessMonthlyTaxesCommand/Result`
  - `GenerateAssetsReportQuery/Result`

**Mapeamento para schema existente (SQLite)**
- `assets` -> estado persistido do aggregate `AssetPosition`.
- `operations` -> histórico de `TradeOperation`.
- `accumulated_losses` -> `AccumulatedLossLedger`.
- `tax_config` -> parâmetros do `TaxRegime` ativo.

**Evoluções de schema recomendadas (incrementais)**
- `operations.external_ref` (idempotência de importação).
- `operations.import_batch_id` (rastreabilidade por arquivo/lote).
- `tax_config.effective_from` e `tax_config.effective_to` (versionamento de regime sem hardcode).

### Endpoints de API

Não há API HTTP no MVP. A superfície de integração é IPC tipado:

- `ipcMain.handle('import:operations', payload)` — importa/parsa/valida/persiste operações.
- `ipcMain.handle('portfolio:set-manual-base', payload)` — define base manual de ativo.
- `ipcMain.handle('portfolio:list-positions', payload)` — lista posições correntes.
- `ipcMain.handle('tax:assess-monthly', payload)` — apura mês e calcula DARF.
- `ipcMain.handle('tax:list-assessments', payload)` — consulta histórico de apuração.
- `ipcMain.handle('report:assets-annual', payload)` — gera Bens e Direitos (posição 31/12).
- `ipcMain.handle('config:tax-rules:get|update', payload)` — consulta/edita parâmetros tributários.

## Pontos de Integração

- **Arquivos locais (PDF/CSV/Excel)**
  - Entrada de dados via parser em adapter dedicado.
  - Tratamento de erro com classificação: formato inválido, dado inconsistente, arquivo não suportado.
- **Electron IPC (interno)**
  - Exposição mínima via `contextBridge` e canais allowlist.
  - Nunca expor `ipcRenderer` bruto ao renderer.
- **Sem dependências externas online no MVP**
  - Não há autenticação externa.
  - Sistema opera offline com persistência local.

## Abordagem de Testes

### Testes Unidade

- **Domínio (prioridade máxima)**
  - Invariantes de `AssetPosition` (quantidade não negativa, preço médio válido).
  - Cálculo incremental de preço médio com custos proporcionais.
  - Venda sem posição/base válida deve falhar com erro de domínio.
  - Compensação de prejuízo por categoria sem cruzamento indevido.
  - Cálculo DARF com dedução de IRRF e piso zero.
- **Aplicação**
  - Casos de uso com ports mockados (`jest-mock-extended`).
  - Garantir orquestração correta de transação, validação e persistência.
- **Infraestrutura**
  - Repositórios com SQLite in-memory.
  - Mapeamento row <-> domínio validado por contrato.

### Testes de Integração

- Fluxo completo `import -> portfolio update -> monthly tax`.
- Integração parser + caso de uso + repositório.
- Reprocessamento idempotente por `external_ref`/`import_batch_id`.
- Migrações e seeds executando em base limpa.

### Testes de E2E

- Playwright com app desktop:
  - Importar arquivo válido e confirmar atualização de posição.
  - Informar base manual e validar apuração subsequente.
  - Exibir apuração de mês com DARF esperado.
  - Gerar relatório de Bens e Direitos e copiar campo.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Fundação de arquitetura**: criar estrutura por camadas/contextos e contratos de ports (base para desacoplamento).
2. **Domínio Portfolio**: implementar aggregate e serviços de preço médio (núcleo de consistência de posição).
3. **Domínio TaxCompliance**: implementar apuração mensal e compensação (núcleo fiscal).
4. **Aplicação + IPC**: conectar casos de uso aos handlers e contratos compartilhados.
5. **Ingestion adapters**: integrar parsers em ports de entrada com validação.
6. **Migrações incrementais**: incluir campos de idempotência/versionamento de regime.
7. **Integração e E2E**: validar fluxo ponta a ponta.

### Dependências Técnicas

- Base atual de SQLite/Knex já disponível.
- Contratos IPC em `src/shared/` devem evoluir junto dos use cases.
- Definição de formato de template CSV/Excel permanece dependência funcional para ingestão.
- Biblioteca de parsing PDF pode variar por qualidade de extração; manter adapter isolado.

## Considerações Técnicas

### Decisões Principais

- **DDD + Clean Architecture no main process**
  - Domínio isolado de Electron/Knex para manter regras fiscais testáveis e reutilizáveis.
- **Bounded contexts em 3 frentes**
  - `Ingestion`, `Portfolio`, `TaxCompliance` refletindo linguagem de negócio e fluxo operacional.
- **Repositórios como adapters de infraestrutura**
  - Reuso da implementação atual com evolução para ports explícitos.
- **Baseline tributário atual parametrizado**
  - Mantém aderência ao PRD e reduz risco de regressão, preparando versionamento por vigência.
- **Sem domain events no MVP**
  - Fluxo síncrono primeiro para simplificar entrega; extensão futura possível sem quebrar contratos.

### Riscos Conhecidos

- **Mudança regulatória**
  - Mitigação: regime fiscal versionado por vigência na `tax_config`.
- **Complexidade de parsing PDF**
  - Mitigação: parser por strategy/adapter com fallback para importação CSV.
- **Acoplamento legado**
  - Mitigação: anti-corruption layer ao migrar repositórios atuais para ports.
- **Precisão fiscal**
  - Mitigação: suíte de testes de domínio com cenários de referência e casos extremos.

### Conformidade com Padrões

- **`.cursor/rules/code-standards.mdc`**
  - Nomes claros e separação de responsabilidades; evitar mistura consulta/mutação em serviços.
- **`.cursor/rules/electron.mdc`**
  - Backend no `main`, frontend no `renderer`, contratos em `shared`, IPC via preload seguro.
- **`.cursor/rules/node.mdc`**
  - Tipagem forte, named exports, classes coesas e cobertura total em código crítico.
- **`.cursor/rules/react.mdc`**
  - Renderer consome contratos tipados sem lógica de negócio fiscal no frontend.
- **`.cursor/rules/tests.mdc`**
  - Jest com AAA, independência de testes e foco em comportamento.

### Arquivos relevantes e dependentes

**Já existentes**
- `docs/tasks/prd-tax-report/prd.md`
- `docs/templates/techspec-template.md`
- `src/main/database/database.ts`
- `src/main/database/repositories/asset-repository.ts`
- `src/main/database/repositories/operation-repository.ts`
- `src/main/database/repositories/accumulated-loss-repository.ts`
- `src/main/database/repositories/tax-config-repository.ts`
- `src/shared/types/domain.ts`
- `src/shared/types/electron-api.ts`
- `src/preload.ts`

**A criar/reestruturar**
- `src/main/domain/ingestion/`
- `src/main/domain/portfolio/`
- `src/main/domain/tax-compliance/`
- `src/main/application/use-cases/`
- `src/main/application/ports/`
- `src/main/infrastructure/persistence/`
- `src/main/infrastructure/parsers/`
- `src/main/ipc/handlers/`
- `src/shared/contracts/`

