# Tarefa 3.0: Contratos Compartilhados e IPC Base

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Definir todos os tipos de domínio compartilhados entre main e renderer, implementar a ponte IPC tipada via `preload.ts` com `contextBridge`, e criar o registry de handlers IPC no main process. Esta tarefa estabelece a comunicação segura e tipada entre os processos do Electron.

<requirements>
- Definir todas as interfaces de domínio em `src/shared/types/domain.ts`
- Definir todos os canais IPC e payloads em `src/shared/types/ipc-channels.ts`
- Implementar `preload.ts` com `contextBridge` expondo API tipada
- Criar `IpcHandlerRegistry` no main process
- Implementar handlers IPC básicos para validar comunicação
- Declaração de tipos global para `window.api` no renderer
- Testes de round-trip IPC (renderer → main → renderer)
- Conformidade com `.cursor/rules/electron.mdc` e `.cursor/rules/code-standards.mdc`
</requirements>

## Subtarefas

- [ ] 3.1 Criar tipos de domínio (`Asset`, `Operation`, `MonthlyAssessment`, etc.)
- [ ] 3.2 Criar enums (`AssetType`, `OperationType`, `SourceType`)
- [ ] 3.3 Definir interface `IpcChannelMap` com todos os canais
- [ ] 3.4 Implementar `preload.ts` com `contextBridge.exposeInMainWorld`
- [ ] 3.5 Criar arquivo de tipos globais para `window.api`
- [ ] 3.6 Implementar `IpcHandlerRegistry` no main process
- [ ] 3.7 Criar handler IPC de teste (ping/pong)
- [ ] 3.8 Criar testes de integração IPC
- [ ] 3.9 Atualizar `main.ts` para inicializar handlers

## Detalhes de Implementação

Consulte as seções **"Interfaces Principais"**, **"Endpoints de API"** e **"Sequenciamento de Desenvolvimento"** (item 3) da `techspec.md`.

### Tipos de Domínio

Ver `techspec.md` linhas 50-88 para interfaces completas:
- `Asset`
- `Operation`
- `MonthlyAssessment`
- `TaxConfig`
- `ParsedNoteResult`
- `ParsedMovement`
- etc.

### Canais IPC

Ver `techspec.md` linhas 90-150 para `IpcChannelMap` completo:
- `import:parse-pdf`
- `import:confirm-pdf`
- `asset:list`
- `asset:set-manual`
- `assessment:monthly`
- `report:assets-rights`
- `config:get-tax`
- `db:backup`
- etc.

### Estrutura de Arquivos

```
src/
├── shared/
│   ├── types/
│   │   ├── domain.ts           # Interfaces de domínio
│   │   └── ipc-channels.ts     # Tipagem IPC
│   └── enums/
│       └── index.ts            # Enums compartilhados
├── main/
│   └── ipc/
│       ├── ipc-handler-registry.ts
│       └── __tests__/
│           └── ipc-handler-registry.test.ts
├── renderer/
│   └── types/
│       └── global.d.ts         # window.api types
└── preload.ts
```

## Critérios de Sucesso

- ✅ `window.api` está disponível no renderer com autocomplete TypeScript
- ✅ Handler IPC de teste (ping) retorna resposta correta
- ✅ Tipos de domínio estão acessíveis tanto em main quanto em renderer
- ✅ IpcHandlerRegistry permite registrar novos handlers facilmente
- ✅ Testes de round-trip IPC passam sem erros
- ✅ Nenhum uso de `any` — tudo completamente tipado
- ✅ Preload script é carregado corretamente na janela Electron

## Testes da Tarefa

- [ ] **Testes de unidade - IpcHandlerRegistry**:
  - [ ] Registrar handler e verificar que está registrado
  - [ ] Registrar múltiplos handlers
  - [ ] Tentar registrar handler duplicado (deve falhar ou sobrescrever)

- [ ] **Testes de integração - IPC Round-trip**:
  - [ ] Chamar `window.api.ping()` no renderer e verificar resposta
  - [ ] Simular chamada com payload complexo e validar tipagem
  - [ ] Testar tratamento de erro em handler IPC

### Exemplo de Teste IPC

```typescript
// src/main/ipc/__tests__/ipc-handler-registry.test.ts
import { ipcMain } from 'electron';
import { IpcHandlerRegistry } from '../ipc-handler-registry';

describe('IpcHandlerRegistry', () => {
  it('should register handler and respond to IPC call', async () => {
    const registry = new IpcHandlerRegistry();
    registry.register('test:ping', async () => 'pong');
    
    // Simular invoke
    const response = await ipcMain.handle('test:ping', null);
    expect(response).toBe('pong');
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/shared/types/domain.ts`
- `src/shared/types/ipc-channels.ts`
- `src/shared/enums/index.ts`
- `src/preload.ts` (atualizar)
- `src/renderer/types/global.d.ts`
- `src/main/ipc/ipc-handler-registry.ts`
- `src/main/ipc/__tests__/ipc-handler-registry.test.ts`

**Dependências:**
- Task 1.0 (scaffolding)
- Task 2.0 (camada de dados - para entender estrutura dos tipos)

**References na TechSpec:**
- Seção "Interfaces Principais" (linhas 48-223)
- Seção "Endpoints de API" (linhas 293-357)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/electron.mdc`
- `.cursor/rules/tests.mdc`
