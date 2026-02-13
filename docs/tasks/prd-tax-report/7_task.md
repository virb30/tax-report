# Tarefa 7.0: Telas de Importação e Confirmação

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar as páginas de importação de notas PDF (`ImportNotesPage`) e movimentações CSV/Excel (`ImportMovementsPage`). Implementar o fluxo completo: upload de arquivos, parsing, exibição de dados extraídos para conferência, confirmação, atualização de preço médio e persistência de operações. Esta tarefa integra parsers (Task 6.0), cálculo de preço médio (Task 4.0) e camada de dados (Task 2.0).

<requirements>
- Página `ImportNotesPage` com upload de PDFs
- Página `ImportMovementsPage` com upload de CSV/Excel
- Componente `FileUpload` reutilizável com drag & drop
- Exibição de dados extraídos em tabela para conferência
- Feedback visual de erros de parsing
- Confirmação atualiza preço médio usando `AveragePriceCalculator`
- Operações de venda são registradas para apuração futura
- Handlers IPC: import:parse-pdf, import:confirm-pdf, import:parse-spreadsheet, import:confirm-spreadsheet
- Testes de integração do fluxo completo
- Conformidade com RF-03 a RF-11 do PRD
</requirements>

## Subtarefas

- [ ] 7.1 Criar componente `FileUpload` com drag & drop
- [ ] 7.2 Criar página `ImportNotesPage` (estrutura básica)
- [ ] 7.3 Implementar handler IPC `import:parse-pdf`
- [ ] 7.4 Implementar handler IPC `import:confirm-pdf`
- [ ] 7.5 Integrar `import:confirm-pdf` com `AveragePriceCalculator` e repositórios
- [ ] 7.6 Criar componente de tabela de conferência de dados extraídos
- [ ] 7.7 Criar página `ImportMovementsPage` (estrutura básica)
- [ ] 7.8 Implementar handler IPC `import:parse-spreadsheet`
- [ ] 7.9 Implementar handler IPC `import:confirm-spreadsheet`
- [ ] 7.10 Adicionar botão de download do template CSV
- [ ] 7.11 Criar testes de integração do fluxo PDF completo
- [ ] 7.12 Criar testes de integração do fluxo CSV completo

## Detalhes de Implementação

Consulte as seções **F2 (RF-03 a RF-07)** e **F3 (RF-08 a RF-11)** no `prd.md`, além da **"Sequenciamento"** (item 9) da `techspec.md`.

### Fluxo de Importação de PDF

1. Usuário faz upload de 1 ou mais PDFs
2. Renderer chama `window.api.import.parsePdf(filePaths)`
3. Main process: `PdfParserService` extrai operações
4. Renderer exibe operações em tabela para conferência
5. Usuário confirma → Renderer chama `window.api.import.confirmPdf(notes)`
6. Main process:
   - Para cada operação de compra: atualiza preço médio via `AveragePriceCalculator`
   - Para cada operação de venda: registra em `operations` para apuração
   - Salva via repositórios

### Fluxo de Importação de CSV

Similar ao PDF, mas usa `SpreadsheetParserService`.

### Estrutura de Arquivos

```
src/renderer/pages/
├── ImportNotesPage/
│   ├── ImportNotesPage.tsx
│   ├── NotesTable.tsx          # Tabela de conferência
│   └── ImportNotesPage.css
├── ImportMovementsPage/
│   ├── ImportMovementsPage.tsx
│   ├── MovementsTable.tsx
│   └── ImportMovementsPage.css
└── components/
    └── FileUpload/
        ├── FileUpload.tsx
        └── FileUpload.css

src/main/ipc/handlers/
├── import-handlers.ts          # Todos handlers de import
└── __tests__/
    └── import-handlers.test.ts
```

### Componente FileUpload

Props:
- `accept`: string (ex: ".pdf" ou ".csv,.xlsx")
- `multiple`: boolean
- `onFilesSelected`: (files: File[]) => void

Comportamento:
- Drag & drop area
- Click para selecionar arquivos
- Mostrar nomes dos arquivos selecionados
- Validação de tipo de arquivo

## Critérios de Sucesso

- ✅ Usuário consegue fazer upload de PDF, ver dados extraídos e confirmar
- ✅ Após confirmação, preço médio dos ativos é atualizado corretamente
- ✅ Operações de venda são registradas em `operations`
- ✅ Erros de parsing são exibidos claramente (ex: PDF não reconhecido)
- ✅ Upload de múltiplos PDFs funciona corretamente
- ✅ Fluxo CSV/Excel funciona de forma análoga ao PDF
- ✅ Template CSV está disponível para download
- ✅ Testes de integração cobrem fluxo completo (upload → parse → confirm → DB)

## Testes da Tarefa

- [ ] **Testes de integração - Fluxo PDF Completo**:
  - [ ] Upload PDF → Parse → Confirmar → Verificar asset atualizado no banco
  - [ ] Upload PDF com múltiplas operações → Todas são processadas
  - [ ] Upload PDF com erro de parsing → Erro é exibido

- [ ] **Testes de integração - Fluxo CSV Completo**:
  - [ ] Upload CSV → Parse → Confirmar → Verificar asset atualizado
  - [ ] CSV com linha inválida → Erro específico é exibido

- [ ] **Testes de integração - Atualização de Preço Médio**:
  - [ ] Asset sem posição anterior: nova posição é criada
  - [ ] Asset com posição anterior: preço médio é recalculado
  - [ ] Venda sem preço médio registrado: erro é retornado

- [ ] **Testes de UI (manual ou E2E básico)**:
  - [ ] Arrastar e soltar arquivo na área de upload
  - [ ] Clicar em "Selecionar arquivo"
  - [ ] Conferir dados na tabela
  - [ ] Clicar em "Confirmar Importação"
  - [ ] Verificar mensagem de sucesso

### Exemplo de Teste - Handler IPC

```typescript
// src/main/ipc/handlers/__tests__/import-handlers.test.ts
import { IpcMainInvokeEvent } from 'electron';
import { handleParsePdf } from '../import-handlers';
import { PdfParserService } from '../../../parsers/pdf-parser-service';

jest.mock('../../../parsers/pdf-parser-service');

describe('Import Handlers', () => {
  let mockEvent: IpcMainInvokeEvent;

  beforeEach(() => {
    mockEvent = {} as IpcMainInvokeEvent;
  });

  describe('handleParsePdf', () => {
    it('should parse PDF and return operations', async () => {
      const mockParserService = new PdfParserService();
      (mockParserService.parsePdfs as jest.Mock).mockResolvedValue([
        {
          broker: 'XP',
          operations: [
            { ticker: 'PETR4', quantity: 100, unitPrice: 35.00 }
          ],
          errors: [],
        },
      ]);

      const result = await handleParsePdf(mockEvent, {
        filePaths: ['/path/to/nota.pdf'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].operations).toHaveLength(1);
    });
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/renderer/pages/ImportNotesPage/*`
- `src/renderer/pages/ImportMovementsPage/*`
- `src/renderer/components/FileUpload/*`
- `src/main/ipc/handlers/import-handlers.ts`
- `src/main/ipc/handlers/__tests__/import-handlers.test.ts`

**A serem atualizados:**
- `src/main/ipc/ipc-handler-registry.ts` (registrar handlers)
- `src/renderer/App.tsx` (adicionar rotas)

**Dependências:**
- Task 2.0 (repositórios)
- Task 3.0 (IPC)
- Task 4.0 (AveragePriceCalculator)
- Task 5.0 (AssetClassifier)
- Task 6.0 (parsers)

**References no PRD:**
- F2: RF-03 a RF-07
- F3: RF-08 a RF-11

**References na TechSpec:**
- Seção "Endpoints de API" (linhas 341-346)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/electron.mdc`
- `.cursor/rules/react.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
