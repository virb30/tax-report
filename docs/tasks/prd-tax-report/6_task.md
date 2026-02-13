# Tarefa 6.0: Parsers de Importação (PDF e CSV/Excel)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar os parsers de importação usando Strategy Pattern: `XpSinacorParser` para PDFs de notas de negociação da XP, e `SpreadsheetParserService` para arquivos CSV/Excel. Esta é uma das tarefas mais complexas pois envolve parsing de texto não estruturado e validação robusta de dados.

<requirements>
- Interface `BrokerageNoteParser` como Strategy
- Implementação completa do `XpSinacorParser` para notas XP SINACOR
- Orquestrador `PdfParserService` que delega para parser correto
- Implementação do `SpreadsheetParserService` para CSV/Excel
- Extração de: data, tipo operação, ticker, quantidade, preço, custos, IRRF
- Rateio proporcional de custos operacionais entre ativos da mesma nota
- Validação de dados extraídos e tratamento de erros
- Template CSV de importação para download
- Testes com fixtures de notas reais anonimizadas
- Conformidade com RF-03 a RF-11 do PRD
</requirements>

## Subtarefas

- [ ] 6.1 Criar interface `BrokerageNoteParser` (Strategy Pattern)
- [ ] 6.2 Implementar `PdfParserService` orquestrador
- [ ] 6.3 Implementar `XpSinacorParser.canParse()` (detectar formato)
- [ ] 6.4 Implementar `XpSinacorParser.parse()` - extração de dados
- [ ] 6.5 Implementar rateio proporcional de custos operacionais
- [ ] 6.6 Criar fixtures de teste (PDFs reais anonimizados)
- [ ] 6.7 Criar testes de unidade do `XpSinacorParser`
- [ ] 6.8 Implementar `SpreadsheetParserService` para CSV
- [ ] 6.9 Implementar validação de colunas obrigatórias
- [ ] 6.10 Criar template CSV de importação
- [ ] 6.11 Criar testes do `SpreadsheetParserService` com fixtures

## Detalhes de Implementação

Consulte as seções **F2 (RF-03 a RF-07)** e **F3 (RF-08 a RF-11)** no `prd.md`, além das **"Interfaces Principais"** (linhas 154-176) e **"Sequenciamento"** (itens 7 e 8) da `techspec.md`.

### Interface BrokerageNoteParser

```typescript
export interface BrokerageNoteParser {
  readonly brokerName: string;
  canParse(textContent: string): boolean;
  parse(textContent: string): ParsedNoteResult;
}

export interface ParsedNoteResult {
  broker: string;
  noteDate: string;
  operations: ParsedOperation[];
  errors: string[];
}

export interface ParsedOperation {
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;  // Já rateado proporcionalmente
  irrfWithheld: number;
}
```

### Template CSV de Importação

Colunas obrigatórias:
- Data (DD/MM/YYYY)
- Tipo (Compra/Venda)
- Ticker
- Quantidade
- Preço Unitário
- Taxas Totais
- Corretora

### Estrutura de Arquivos

```
src/main/parsers/
├── brokerage-note-parser.ts      # Interface
├── pdf-parser-service.ts         # Orquestrador
├── xp-sinacor-parser.ts          # Parser XP
├── spreadsheet-parser-service.ts # CSV/Excel
└── __tests__/
    ├── xp-sinacor-parser.test.ts
    ├── spreadsheet-parser-service.test.ts
    └── fixtures/
        ├── xp-nota-anonimizada.txt
        └── movimentacoes-exemplo.csv

src/renderer/assets/
└── template-importacao.csv
```

### Parsing de PDF - XP SINACOR

Campos a extrair:
- Data do Pregão
- Tabela de negócios (C/V, tipo mercado, ticker, quantidade, preço)
- Resumo financeiro (corretagem, emolumentos, taxas, IRRF)

**Desafio**: O texto extraído via `pdf-parse` não tem estrutura; usar regex e posições relativas.

### Rateio de Custos Operacionais

```
custo_proporcional_ativo_i = custos_totais_nota × (volume_ativo_i / volume_total_nota)
volume = quantidade × preço_unitário
```

## Critérios de Sucesso

- ✅ `XpSinacorParser.canParse()` detecta corretamente notas da XP
- ✅ Parser extrai todas operações de uma nota com múltiplos ativos
- ✅ Custos operacionais são rateados proporcionalmente ao volume de cada ativo
- ✅ IRRF é extraído e associado às operações de venda
- ✅ `SpreadsheetParserService` valida colunas obrigatórias
- ✅ CSV com linha inválida retorna erro descritivo
- ✅ Template CSV está disponível para download
- ✅ Testes com fixtures cobrindo casos reais passam 100%

## Testes da Tarefa

- [ ] **Testes de unidade - XpSinacorParser**:
  - [ ] Detectar formato XP SINACOR via `canParse()`
  - [ ] Extrair operação única de compra
  - [ ] Extrair operação única de venda com IRRF
  - [ ] Extrair múltiplas operações da mesma nota
  - [ ] Ratear custos operacionais proporcionalmente
  - [ ] Lidar com nota sem operações (erro)
  - [ ] Lidar com PDF corrompido (erro)

- [ ] **Testes de unidade - SpreadsheetParserService**:
  - [ ] Validar CSV com todas colunas corretas
  - [ ] Detectar coluna faltante
  - [ ] Parsear linha com compra
  - [ ] Parsear linha com venda
  - [ ] Lidar com data em formato inválido
  - [ ] Lidar com quantidade/preço não numéricos

- [ ] **Testes de integração**:
  - [ ] PDF → Parse → Retornar lista de operações válidas
  - [ ] CSV → Parse → Retornar lista de movimentações válidas

### Exemplo de Teste - XpSinacorParser

```typescript
// src/main/parsers/__tests__/xp-sinacor-parser.test.ts
import { XpSinacorParser } from '../xp-sinacor-parser';
import fs from 'fs';
import path from 'path';

describe('XpSinacorParser', () => {
  let parser: XpSinacorParser;
  let fixtureText: string;

  beforeEach(() => {
    parser = new XpSinacorParser();
    fixtureText = fs.readFileSync(
      path.join(__dirname, 'fixtures/xp-nota-anonimizada.txt'),
      'utf-8'
    );
  });

  it('should detect XP SINACOR format', () => {
    expect(parser.canParse(fixtureText)).toBe(true);
  });

  it('should extract operations from note', () => {
    const result = parser.parse(fixtureText);
    
    expect(result.broker).toBe('XP Investimentos');
    expect(result.operations).toHaveLength(2);
    expect(result.operations[0]).toMatchObject({
      tradeDate: '2024-01-15',
      operationType: 'buy',
      ticker: 'PETR4',
      quantity: 100,
      unitPrice: 35.50,
    });
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/main/parsers/brokerage-note-parser.ts`
- `src/main/parsers/pdf-parser-service.ts`
- `src/main/parsers/xp-sinacor-parser.ts`
- `src/main/parsers/spreadsheet-parser-service.ts`
- `src/main/parsers/__tests__/*.test.ts`
- `src/main/parsers/__tests__/fixtures/*` (arquivos de teste)
- `src/renderer/assets/template-importacao.csv`

**Dependências:**
- Task 1.0 (scaffolding)
- Task 3.0 (tipos compartilhados)
- Bibliotecas: `pdf-parse`, `xlsx` (SheetJS)

**References no PRD:**
- F2: RF-03 a RF-07 (PDF)
- F3: RF-08 a RF-11 (CSV/Excel)

**References na TechSpec:**
- Linhas 154-176 (Interfaces de parsing)
- "Pontos de Integração" (linhas 358-373)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
