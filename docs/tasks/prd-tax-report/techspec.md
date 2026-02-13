# Especificação Técnica — Tax Report: Assistente de Declaração de IRPF para Renda Variável

## Resumo Executivo

O Tax Report será uma aplicação desktop Electron com arquitetura de dois processos: o **main process** (Node.js) concentra toda a lógica de negócio — parsing de PDFs, importação de planilhas, cálculo de preço médio, apuração de impostos e persistência via SQLite — enquanto o **renderer process** (React) cuida exclusivamente da interface. A comunicação ocorre via IPC tipado de ponta a ponta usando contratos definidos em `src/shared/`.

A estratégia de implementação privilegia módulos desacoplados com interfaces claras: um sistema de parsers extensível via Strategy Pattern para notas de corretoras, um motor de cálculo tributário parametrizável por configuração centralizada, e uma camada de dados com migrações gerenciadas por Knex. O scaffolding usa Electron Forge + Vite para desenvolvimento rápido com HMR, e a UI é construída com Tailwind CSS + shadcn/ui para acessibilidade e consistência visual.

## Arquitetura do Sistema

### Visão Geral dos Componentes

**Processo Principal (`src/main/`)**

- **DatabaseModule** — Inicialização do better-sqlite3, execução de migrações Knex, e repositórios de acesso a dados (assets, operations, accumulated losses, tax config).
- **PdfParserService** — Orquestrador que delega para parsers específicos de corretora via Strategy Pattern. Contém `XpSinacorParser` como implementação inicial.
- **SpreadsheetParserService** — Parsing de CSV/Excel via SheetJS (xlsx) para importação de movimentações padronizadas.
- **AveragePriceCalculator** — Lógica pura de cálculo de preço médio ponderado, rateio de custos operacionais e atualização incremental de posição.
- **TaxAssessmentEngine** — Motor de apuração mensal: calcula ganho/prejuízo por venda, consolida por mês/categoria, aplica isenções, compensa prejuízos acumulados e calcula DARF.
- **AssetClassifier** — Inferência automática de tipo de ativo (ação, FII, ETF, BDR) pelo ticker, com possibilidade de correção manual.
- **ReportGenerator** — Gera a posição de carteira em 31/12 com textos de discriminação formatados para a Receita Federal.
- **TaxConfigManager** — Leitura e atualização das alíquotas e limites de isenção na tabela de configuração.
- **IpcHandlerRegistry** — Registro centralizado de todos os handlers IPC, conectando cada canal ao serviço correspondente.

**Processo de Renderização (`src/renderer/`)**

- **AppRouter** — Roteamento entre telas via React Router.
- **HomePage** — Menu principal com acesso às operações (RF-01, RF-02).
- **ImportNotesPage** — Upload de PDFs, visualização dos dados extraídos e confirmação (RF-03 a RF-07).
- **ImportMovementsPage** — Upload de CSV/Excel, validação, conferência e confirmação (RF-08 a RF-11).
- **AveragePricePage** — Formulário de entrada manual, listagem e edição de ativos (RF-12 a RF-15).
- **MonthlyAssessmentPage** — Tabela de apuração mensal com ganhos, prejuízos, DARF e cores indicativas (RF-20 a RF-28).
- **AssetsReportPage** — Relatório de Bens e Direitos com botão de copiar por campo (RF-29 a RF-32).
- **SettingsPage** — Edição de alíquotas e parâmetros tributários (RF-37, RF-38).
- **Shared UI Components** — Componentes reutilizáveis baseados em shadcn/ui (DataTable, FileUpload, CopyButton, StatusBadge, etc.).

**Contratos Compartilhados (`src/shared/`)**

- **IPC Channel Types** — Tipagem de canais, payloads de request/response para comunicação main ↔ renderer.
- **Domain Types** — Interfaces de domínio compartilhadas (Asset, Operation, MonthlyAssessment, TaxConfig, etc.).
- **Enums e Constantes** — AssetType, OperationType, SourceType, classificações da Receita Federal.

**Fluxo de dados principal:**
Renderer → (IPC invoke) → Preload Bridge → Main Process Handler → Service/Calculator → Repository → SQLite → Response → Preload Bridge → Renderer.

## Design de Implementação

### Interfaces Principais

```typescript
// src/shared/types/domain.ts
export enum AssetType {
  Stock = 'stock',
  Fii = 'fii',
  Etf = 'etf',
  Bdr = 'bdr',
}

export enum OperationType {
  Buy = 'buy',
  Sell = 'sell',
}

export interface Asset {
  id: number;
  ticker: string;
  name: string | null;
  cnpj: string | null;
  assetType: AssetType;
  broker: string;
  averagePrice: number;
  quantity: number;
  isManualBase: boolean;
}

export interface Operation {
  id: number;
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: 'pdf' | 'csv' | 'manual';
}
```

```typescript
// src/shared/types/ipc-channels.ts
export interface IpcChannelMap {
  'import:parse-pdf': {
    request: { filePaths: string[] };
    response: ParsedNoteResult[];
  };
  'import:confirm-pdf': {
    request: { notes: ParsedNoteResult[] };
    response: ImportConfirmation;
  };
  'import:parse-spreadsheet': {
    request: { filePath: string };
    response: ParsedMovementResult;
  };
  'import:confirm-spreadsheet': {
    request: { movements: ParsedMovement[] };
    response: ImportConfirmation;
  };
  'asset:list': {
    request: void;
    response: Asset[];
  };
  'asset:set-manual': {
    request: ManualAssetInput;
    response: Asset;
  };
  'asset:update': {
    request: AssetUpdateInput;
    response: Asset;
  };
  'asset:delete-manual': {
    request: { id: number };
    response: void;
  };
  'assessment:monthly': {
    request: { year: number };
    response: MonthlyAssessment[];
  };
  'report:assets-rights': {
    request: { year: number };
    response: AssetsReport;
  };
  'config:get-tax': {
    request: void;
    response: TaxConfig[];
  };
  'config:update-tax': {
    request: TaxConfig;
    response: TaxConfig;
  };
  'db:backup': {
    request: { targetPath: string };
    response: void;
  };
  'db:restore': {
    request: { sourcePath: string };
    response: void;
  };
}
```

```typescript
// src/main/parsers/brokerage-note-parser.ts
export interface ParsedOperation {
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
}

export interface ParsedNoteResult {
  broker: string;
  noteDate: string;
  operations: ParsedOperation[];
  errors: string[];
}

export interface BrokerageNoteParser {
  readonly brokerName: string;
  canParse(textContent: string): boolean;
  parse(textContent: string): ParsedNoteResult;
}
```

```typescript
// src/main/services/average-price-calculator.ts
export interface AveragePriceUpdate {
  ticker: string;
  previousQuantity: number;
  previousAveragePrice: number;
  newQuantity: number;
  newUnitPrice: number;
  proportionalCosts: number;
}

export interface AveragePriceResult {
  ticker: string;
  newAveragePrice: number;
  newQuantity: number;
}

export interface AveragePriceCalculator {
  calculateBuy(update: AveragePriceUpdate): AveragePriceResult;
  calculateSell(params: {
    currentQuantity: number;
    sellQuantity: number;
  }): { remainingQuantity: number };
}
```

```typescript
// src/main/services/tax-assessment-engine.ts
export interface MonthlyAssessment {
  year: number;
  month: number;
  assetType: AssetType;
  totalSales: number;
  grossGain: number;
  lossCompensated: number;
  taxBase: number;
  taxDue: number;
  irrfToCompensate: number;
  darfValue: number;
  isExempt: boolean;
}

export interface TaxAssessmentEngine {
  assessYear(year: number): MonthlyAssessment[];
}
```

### Modelos de Dados

**Schema SQLite (gerenciado via Knex migrations):**

```sql
-- Tabela de ativos com posição atual
CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  name TEXT,
  cnpj TEXT,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('stock','fii','etf','bdr')),
  broker TEXT NOT NULL,
  average_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  is_manual_base INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(ticker, broker)
);

-- Tabela de operações (compras e vendas)
CREATE TABLE operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('buy','sell')),
  ticker TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  operational_costs REAL NOT NULL DEFAULT 0,
  irrf_withheld REAL NOT NULL DEFAULT 0,
  broker TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('pdf','csv','manual')),
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Prejuízos acumulados por categoria de ativo
CREATE TABLE accumulated_losses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_type TEXT NOT NULL UNIQUE CHECK(asset_type IN ('stock','fii','etf','bdr')),
  amount REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configuração de alíquotas e parâmetros tributários
CREATE TABLE tax_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_type TEXT NOT NULL UNIQUE CHECK(asset_type IN ('stock','fii','etf','bdr')),
  tax_rate REAL NOT NULL,
  monthly_exemption_limit REAL NOT NULL DEFAULT 0,
  irrf_rate REAL NOT NULL DEFAULT 0
);

-- Índices para consultas frequentes
CREATE INDEX idx_operations_ticker ON operations(ticker);
CREATE INDEX idx_operations_trade_date ON operations(trade_date);
CREATE INDEX idx_operations_type_date ON operations(operation_type, trade_date);
```

**Dados iniciais de `tax_config`:**

| asset_type | tax_rate | monthly_exemption_limit | irrf_rate |
|---|---|---|---|
| stock | 0.15 | 20000.00 | 0.00005 |
| fii | 0.20 | 0.00 | 0.00005 |
| etf | 0.15 | 0.00 | 0.00005 |
| bdr | 0.15 | 0.00 | 0.00005 |

### Endpoints de API

Nesta aplicação desktop, os "endpoints" são canais IPC entre renderer e main process, expostos via `contextBridge` no `preload.ts`:

```typescript
// src/main/preload.ts
contextBridge.exposeInMainWorld('api', {
  import: {
    parsePdf: (filePaths: string[]) =>
      ipcRenderer.invoke('import:parse-pdf', { filePaths }),
    confirmPdf: (notes: ParsedNoteResult[]) =>
      ipcRenderer.invoke('import:confirm-pdf', { notes }),
    parseSpreadsheet: (filePath: string) =>
      ipcRenderer.invoke('import:parse-spreadsheet', { filePath }),
    confirmSpreadsheet: (movements: ParsedMovement[]) =>
      ipcRenderer.invoke('import:confirm-spreadsheet', { movements }),
  },
  asset: {
    list: () => ipcRenderer.invoke('asset:list'),
    setManual: (input: ManualAssetInput) =>
      ipcRenderer.invoke('asset:set-manual', input),
    update: (input: AssetUpdateInput) =>
      ipcRenderer.invoke('asset:update', input),
    deleteManual: (id: number) =>
      ipcRenderer.invoke('asset:delete-manual', { id }),
  },
  assessment: {
    monthly: (year: number) =>
      ipcRenderer.invoke('assessment:monthly', { year }),
  },
  report: {
    assetsRights: (year: number) =>
      ipcRenderer.invoke('report:assets-rights', { year }),
  },
  config: {
    getTax: () => ipcRenderer.invoke('config:get-tax'),
    updateTax: (config: TaxConfig) =>
      ipcRenderer.invoke('config:update-tax', config),
  },
  db: {
    backup: (targetPath: string) =>
      ipcRenderer.invoke('db:backup', { targetPath }),
    restore: (sourcePath: string) =>
      ipcRenderer.invoke('db:restore', { sourcePath }),
  },
});
```

| Canal IPC | Direção | Descrição |
|---|---|---|
| `import:parse-pdf` | renderer → main | Recebe paths de PDFs, retorna operações extraídas para conferência |
| `import:confirm-pdf` | renderer → main | Confirma importação, atualiza preço médio e registra operações |
| `import:parse-spreadsheet` | renderer → main | Recebe path de CSV/Excel, retorna movimentações validadas |
| `import:confirm-spreadsheet` | renderer → main | Confirma importação de movimentações |
| `asset:list` | renderer → main | Lista todos os ativos com preço médio |
| `asset:set-manual` | renderer → main | Define preço médio manual para um ativo |
| `asset:update` | renderer → main | Atualiza dados de um ativo |
| `asset:delete-manual` | renderer → main | Remove entrada manual sem operações vinculadas |
| `assessment:monthly` | renderer → main | Retorna apuração mensal do ano solicitado |
| `report:assets-rights` | renderer → main | Gera relatório de Bens e Direitos com posição em 31/12 |
| `config:get-tax` | renderer → main | Retorna configuração tributária atual |
| `config:update-tax` | renderer → main | Atualiza alíquotas e limites |
| `db:backup` | renderer → main | Copia arquivo SQLite para path de destino |
| `db:restore` | renderer → main | Restaura banco a partir de arquivo SQLite |

## Pontos de Integração

Não há integrações com serviços ou APIs externas. Todo processamento é local.

Os únicos pontos de integração são com o **sistema de arquivos**:

- **Leitura de PDFs**: O main process usa `dialog.showOpenDialog` do Electron para abrir o file picker e recebe os paths dos arquivos selecionados. O conteúdo é lido via `fs.readFile` e processado pelo `pdf-parse`.
- **Leitura de CSV/Excel**: Mesmo fluxo de file picker, processado via SheetJS.
- **Download de template**: O template de importação CSV é servido como asset estático empacotado com a aplicação.
- **Backup/Restore do SQLite**: Cópia do arquivo `.db` via `fs.copyFile`. O backup usa `dialog.showSaveDialog` e o restore usa `dialog.showOpenDialog`.

**Tratamento de erros em I/O:**
- Arquivo corrompido ou ilegível: retornar erro descritivo ao renderer para exibição.
- PDF não reconhecido como nota SINACOR: o parser retorna `canParse = false` e o orquestrador informa que o formato não é suportado.
- Planilha com colunas faltantes: validação prévia retorna lista de erros por linha.

## Abordagem de Testes

### Testes de Unidade

**Componentes críticos a testar (cobertura 100% no main process conforme rule `node.mdc`):**

- **AveragePriceCalculator**: Cenários incluem primeira compra, compra adicional recalculando média, venda parcial (média não altera), venda total, compra com custos operacionais rateados, múltiplas compras no mesmo dia.
- **TaxAssessmentEngine**: Cálculo de ganho/prejuízo por venda, isenção de ações (<R$20k), tributação de FIIs sem isenção, compensação de prejuízos acumulados (ações compensam só ações, FIIs compensam só FIIs), desconto de IRRF, múltiplos meses encadeados.
- **XpSinacorParser**: Extração correta de operações a partir de texto de nota SINACOR, tratamento de múltiplas operações por nota, rateio proporcional de custos entre ativos da nota.
- **AssetClassifier**: Classificação correta por sufixo do ticker (3/4 → ação, 11 → FII ou ETF, 34 → BDR), override manual, casos ambíguos (units com sufixo 11).
- **SpreadsheetParserService**: Validação de colunas obrigatórias, parsing de datas, tratamento de linhas inválidas.
- **Repositórios**: Operações CRUD, constraints de unicidade, queries de apuração mensal.

**Mock:**
- `better-sqlite3` mockado nos testes de repositório com banco in-memory.
- `fs` e `dialog` mockados nos testes de importação de arquivos.
- `pdf-parse` mockado nos testes do parser com fixtures de texto extraído.

**Framework:** Jest + `jest-mock-extended` conforme rule `tests.mdc`.

### Testes de Integração

- **Fluxo de importação PDF completo**: PDF → Parse → Conferência → Confirmação → Atualização de preço médio e operações no banco.
- **Fluxo de importação CSV completo**: CSV → Parse → Validação → Confirmação → Atualização de dados.
- **Apuração mensal end-to-end**: Seed de operações no banco → Cálculo de apuração → Verificação de resultados contra valores esperados.
- **IPC round-trip**: Testes verificando que os handlers IPC processam e respondem corretamente.

**Dados de teste:** Fixtures com notas de negociação reais anonimizadas e planilhas de movimentação de exemplo.

### Testes de E2E

- **Playwright** para testar o fluxo completo na aplicação Electron:
  - Navegar pelo menu e acessar cada tela.
  - Importar um PDF de nota e conferir dados exibidos.
  - Confirmar importação e verificar atualização na tela de preço médio.
  - Consultar apuração mensal e verificar cálculos.
  - Gerar relatório de Bens e Direitos e verificar botão de copiar.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Scaffolding e infraestrutura** — Electron Forge + Vite + React + TypeScript + Tailwind + shadcn/ui. Configurar estrutura `src/main/`, `src/renderer/`, `src/shared/`. Configurar Jest. *(Por que primeiro: base para todo o resto)*

2. **Camada de dados** — better-sqlite3 + Knex migrations. Criar schema, seed de `tax_config`, repositórios de acesso. *(Dependência: scaffolding pronto)*

3. **Contratos compartilhados e IPC** — Definir tipos de domínio em `src/shared/`, implementar `preload.ts` com `contextBridge`, registrar handlers IPC no main process. *(Dependência: camada de dados)*

4. **Motor de cálculo de preço médio** — `AveragePriceCalculator` como módulo puro com testes extensivos. *(Dependência: tipos de domínio)*

5. **Classificador de ativos** — `AssetClassifier` com inferência por ticker e override manual. *(Dependência: tipos de domínio)*

6. **Entrada manual de preço médio (F4)** — Formulário no renderer + handler IPC + repositório. *(Dependência: IPC, camada de dados, classificador)*

7. **Parser de PDF — XP SINACOR (F2)** — `BrokerageNoteParser` interface + `XpSinacorParser` implementação + `PdfParserService` orquestrador. *(Dependência: tipos de domínio, pdf-parse)*

8. **Importação de movimentações CSV/Excel (F3)** — `SpreadsheetParserService` + template de download. *(Dependência: tipos de domínio, SheetJS)*

9. **Tela de importação e confirmação** — Páginas `ImportNotesPage` e `ImportMovementsPage` no renderer com upload, conferência e confirmação. *(Dependência: parsers, IPC, cálculo de preço médio)*

10. **Motor de apuração mensal (F6)** — `TaxAssessmentEngine` + `TaxConfigManager`. *(Dependência: operações persistidas, preço médio calculado)*

11. **Tela de apuração mensal** — `MonthlyAssessmentPage` com tabela, cores e detalhamento. *(Dependência: motor de apuração, IPC)*

12. **Gerador de relatório de Bens e Direitos (F7)** — `ReportGenerator` + `AssetsReportPage` com textos de discriminação e botão de copiar. *(Dependência: posição de ativos consolidada)*

13. **Configuração de alíquotas (F9)** — `SettingsPage` no renderer. *(Dependência: TaxConfigManager, IPC)*

14. **Backup e restauração (F8)** — Funcionalidade de backup/restore do SQLite via menu ou tela. *(Dependência: camada de dados)*

15. **Testes E2E e polish** — Testes Playwright, ajustes de UX, acessibilidade final. *(Dependência: todas as features implementadas)*

### Dependências Técnicas

- **Electron Forge + Vite**: Deve ser inicializado antes de qualquer desenvolvimento.
- **better-sqlite3 com Electron**: Requer rebuild nativo para o Electron (`electron-rebuild` ou `@electron/rebuild`). O plugin `@electron-forge/plugin-auto-unpack-natives` deve ser configurado para empacotar o binding nativo corretamente.
- **pdf-parse**: Depende de `pdfjs-dist`; deve ser testado com PDFs reais do formato SINACOR da XP para validar a extração.
- **Knex + better-sqlite3**: O client Knex para `better-sqlite3` requer configuração específica (`client: 'better-sqlite3'`).

## Monitoramento e Observabilidade

Como aplicação desktop sem servidor, a observabilidade foca em logging local e tratamento de erros:

- **Logging**: Usar `electron-log` para logging estruturado com níveis `error`, `warn`, `info`, `debug`. Logs persistidos em arquivo no diretório `userData` do Electron.
- **Erros de parsing**: Logar warnings quando PDFs não são reconhecidos ou contêm dados inesperados, incluindo o trecho problemático para diagnóstico.
- **Erros de banco**: Logar erros de SQLite (constraint violations, migrations falhas) com contexto da operação.
- **Performance**: Logar tempo de parsing de PDFs grandes e tempo de cálculo de apuração mensal em nível `debug`.
- **Alertas ao usuário**: Todos os erros que impactam o fluxo do usuário devem ser traduzidos em mensagens acionáveis exibidas via toast/dialog no renderer (ex: "Ativo PETR4 possui venda sem preço médio registrado").

## Considerações Técnicas

### Decisões Principais

| Decisão | Escolha | Justificativa | Alternativas Rejeitadas |
|---|---|---|---|
| Build tool | Electron Forge + Vite | HMR rápido, DX moderna, suporte oficial Electron | Webpack (mais lento), electron-builder (foco em empacotamento) |
| Banco de dados | better-sqlite3 | API síncrona simples, melhor performance para Electron, sem overhead de async | node-sqlite3 (async desnecessário para desktop local) |
| Migrações | Knex.js | Sistema maduro de migrações, query builder, suporte a better-sqlite3 | Migrações manuais (menos tooling), Drizzle (mais recente, menos testado com Electron) |
| PDF parsing | pdf-parse | 2.4M downloads/semana, estável, baseado em pdf.js, boa extração de texto | pdfjs-dist direto (mais controle mas mais trabalho), pdf-parse-new (mais novo, menos testado) |
| CSV/Excel | SheetJS (xlsx) | Suporta CSV e Excel num pacote só, maduro e robusto | PapaParse + ExcelJS (duas dependências separadas) |
| UI | Tailwind + shadcn/ui | Componentes acessíveis e bonitos, customizáveis, sem overhead de runtime | MUI (mais pesado), CSS Modules (menos produtivo) |
| Estado | Context API + useReducer | Conforme rule React, suficiente para a complexidade da aplicação | Zustand (dependência extra sem necessidade clara) |
| Roteamento | React Router | Padrão da comunidade, bem documentado, suporta nested routes | Estado simples (limitado para 7+ telas) |
| Classificação de ativos | Auto-inferência + override | Reduz trabalho manual mas permite correção em casos ambíguos (units x FIIs com sufixo 11) | Só manual (mais trabalho), só automático (erros em edge cases) |

### Riscos Conhecidos

| Risco | Impacto | Mitigação |
|---|---|---|
| Variação no formato PDF SINACOR entre corretoras/anos | Parsing quebra silenciosamente | Testes com múltiplas notas reais; validação pós-parse com checagem de campos obrigatórios; logs detalhados de erros |
| better-sqlite3 com Electron requer rebuild nativo | Build falha em diferentes plataformas | Configurar `@electron/rebuild` no `postinstall`; testar em Linux, macOS e Windows |
| Ambiguidade na classificação de ativos por ticker (sufixo 11 pode ser FII, ETF ou unit) | Tipo errado gera cálculo tributário incorreto | Override manual obrigatório em caso de ambiguidade; lista interna de ETFs conhecidos |
| Alteração legislativa de alíquotas ou regras de isenção | Cálculos incorretos | Configuração externalizada em `tax_config`; tela de edição de parâmetros |
| PDFs com texto como imagem (scanned) em vez de texto selecionável | pdf-parse não extrai texto | Detectar e alertar o usuário; sugerir re-download da nota no portal da corretora |

### Conformidade com Padrões

As seguintes rules da pasta `.cursor/rules/` se aplicam diretamente a esta tech spec:

- **`code-standards.mdc`** (always apply): Código em inglês, camelCase, PascalCase, kebab-case para arquivos, early return, sem flag params, separação de consulta e mutação. Todas as interfaces e módulos descritos seguem estas convenções.
- **`electron.mdc`**: Estrutura `src/main/`, `src/renderer/`, `src/shared/`. Comunicação via IPC com `preload.ts`. Backend em `src/main/`, frontend em `src/renderer/`.
- **`react.mdc`**: Componentes funcionais com Hooks, Context API, hooks customizados com prefixo `use`, sem spread de props, componentes em pastas PascalCase, estado próximo do uso. Proíbe `any`.
- **`node.mdc`**: Cobertura de testes 100% no main process, OO com classes coesas, `private`/`readonly`, named exports, sem dependência circular, tipagem completa.
- **`tests.mdc`**: Jest, AAA pattern, testes independentes, um comportamento por teste, `jest-mock-extended`, `npm test`.

**Nenhum desvio das rules é proposto.** Todas as decisões arquiteturais são compatíveis com os padrões definidos.

### Arquivos relevantes e dependentes

**Arquivos existentes:**
- `docs/tasks/prd-tax-report/prd.md` — PRD que originou esta spec
- `.cursor/rules/code-standards.mdc` — Padrões de código obrigatórios
- `.cursor/rules/electron.mdc` — Regras de arquitetura Electron
- `.cursor/rules/react.mdc` — Regras de frontend React
- `.cursor/rules/node.mdc` — Regras de backend Node.js
- `.cursor/rules/tests.mdc` — Padrões de teste com Jest

**Arquivos a serem criados (estrutura prevista):**

```text
src/
├── main/
│   ├── main.ts                           # Entry point do Electron
│   ├── database/
│   │   ├── database.ts                   # Inicialização better-sqlite3
│   │   ├── migrations/                   # Knex migrations
│   │   └── repositories/
│   │       ├── asset-repository.ts
│   │       ├── operation-repository.ts
│   │       ├── accumulated-loss-repository.ts
│   │       └── tax-config-repository.ts
│   ├── parsers/
│   │   ├── brokerage-note-parser.ts      # Interface Strategy
│   │   ├── pdf-parser-service.ts         # Orquestrador
│   │   ├── xp-sinacor-parser.ts          # Parser XP
│   │   └── spreadsheet-parser-service.ts # CSV/Excel parser
│   ├── services/
│   │   ├── average-price-calculator.ts
│   │   ├── tax-assessment-engine.ts
│   │   ├── asset-classifier.ts
│   │   ├── report-generator.ts
│   │   └── tax-config-manager.ts
│   └── ipc/
│       └── ipc-handler-registry.ts
├── renderer/
│   ├── App.tsx
│   ├── main.tsx                          # Entry point React
│   ├── pages/
│   │   ├── HomePage/
│   │   ├── ImportNotesPage/
│   │   ├── ImportMovementsPage/
│   │   ├── AveragePricePage/
│   │   ├── MonthlyAssessmentPage/
│   │   ├── AssetsReportPage/
│   │   └── SettingsPage/
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   ├── DataTable/
│   │   ├── FileUpload/
│   │   └── CopyButton/
│   ├── contexts/
│   │   └── AppContext.tsx
│   └── hooks/
│       └── useIpc.ts
├── shared/
│   ├── types/
│   │   ├── domain.ts
│   │   ├── ipc-channels.ts
│   │   └── tax-constants.ts
│   └── enums/
│       └── asset-type.ts
└── preload.ts
```

**Dependências npm principais:**
- `electron` — Framework desktop
- `react`, `react-dom` — UI
- `react-router-dom` — Roteamento
- `better-sqlite3` — SQLite local
- `knex` — Migrações e query builder
- `pdf-parse` — Extração de texto de PDFs
- `xlsx` (SheetJS) — Parsing de CSV/Excel
- `tailwindcss`, `postcss`, `autoprefixer` — Estilização
- `electron-log` — Logging estruturado

**Dependências de desenvolvimento:**
- `typescript` — Linguagem
- `@electron-forge/cli` e plugins Vite — Build pipeline
- `jest`, `ts-jest`, `@types/jest` — Testes
- `jest-mock-extended` — Mocks tipados
- `playwright`, `@playwright/test` — Testes E2E
- `@types/better-sqlite3` — Tipagem SQLite
- `@electron/rebuild` — Rebuild de módulos nativos
- `eslint`, `prettier` — Linting e formatação
