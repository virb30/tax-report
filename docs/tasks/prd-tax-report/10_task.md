# Tarefa 10.0: Relatório de Bens e Direitos e Features Finais

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o `ReportGenerator` e a página `AssetsReportPage` que gera o relatório de Bens e Direitos com posição em 31/12, textos de discriminação formatados para a Receita Federal e botões de copiar por campo. Adicionar funcionalidade de backup/restore do SQLite, criar a `HomePage` com menu de operações, e implementar testes E2E com Playwright cobrindo os fluxos principais. Esta tarefa finaliza o sistema e valida a integração de todas as features.

<requirements>
- Implementar classe `ReportGenerator` que gera relatório de posição em 31/12
- Página `AssetsReportPage` com tabela de ativos e textos formatados
- Botões de copiar por campo (ticker, quantidade, discriminação)
- Classificação automática nos códigos da Receita Federal
- Funcionalidade de backup/restore do SQLite via menu ou tela
- Página `HomePage` com menu de navegação para todas operações
- Testes E2E com Playwright cobrindo fluxos principais
- Conformidade com RF-01, RF-02, RF-29 a RF-36 do PRD
</requirements>

## Subtarefas

- [ ] 10.1 Implementar `ReportGenerator.generateAssetsReport(year)`
- [ ] 10.2 Implementar classificação da Receita Federal (grupos/códigos)
- [ ] 10.3 Implementar geração de texto de discriminação formatado
- [ ] 10.4 Criar handler IPC `report:assets-rights`
- [ ] 10.5 Criar página `AssetsReportPage` (estrutura básica)
- [ ] 10.6 Criar componente `CopyButton` reutilizável
- [ ] 10.7 Implementar tabela de relatório com botões de copiar
- [ ] 10.8 Implementar handlers IPC `db:backup` e `db:restore`
- [ ] 10.9 Adicionar menu/botão de backup/restore na UI
- [ ] 10.10 Criar página `HomePage` com menu de navegação
- [ ] 10.11 Configurar Playwright para testes E2E
- [ ] 10.12 Criar teste E2E: fluxo de importação PDF completo
- [ ] 10.13 Criar teste E2E: fluxo de relatório de bens e direitos
- [ ] 10.14 Criar teste E2E: navegação entre telas

## Detalhes de Implementação

Consulte as seções **F1 (RF-01, RF-02)**, **F7 (RF-29 a RF-32)**, **F8 (RF-33 a RF-36)** no `prd.md`, além da **"Sequenciamento"** (itens 12, 14, 15) da `techspec.md`.

### Classificação da Receita Federal

| Tipo Ativo | Grupo | Código | Discriminação |
|------------|-------|--------|---------------|
| Ações      | 03    | 01     | Ações (inclusive as provenientes de linha telefônica) |
| FIIs       | 07    | 03     | Fundos de Investimento Imobiliário |
| ETFs       | 07    | 09     | Fundos de índice negociados em Bolsa |
| BDRs       | 03    | 01     | Ações (inclusive as provenientes de linha telefônica) |

### Formato do Texto de Discriminação

```
[QTD] ações/cotas [TICKER] - [NOME EMPRESA]. CNPJ: [CNPJ]. Corretora: [CORRETORA]. Custo médio: R$ [PREÇO_MÉDIO]. Custo total: R$ [VALOR_TOTAL].
```

Exemplo:
```
100 ações PETR4 - Petróleo Brasileiro S.A. CNPJ: 33.000.167/0001-01. Corretora: XP Investimentos. Custo médio: R$ 35,50. Custo total: R$ 3.550,00.
```

### Estrutura de Arquivos

```
src/main/services/
├── report-generator.ts
└── __tests__/
    └── report-generator.test.ts

src/renderer/pages/
├── HomePage/
│   ├── HomePage.tsx
│   └── HomePage.css
└── AssetsReportPage/
    ├── AssetsReportPage.tsx
    ├── AssetsTable.tsx
    └── CopyButton.tsx

src/main/ipc/handlers/
├── report-handlers.ts
└── db-handlers.ts

tests/e2e/
├── import-flow.spec.ts
├── assets-report-flow.spec.ts
└── navigation.spec.ts
```

### HomePage - Menu de Operações

Botões/Cards:
- 📄 Importar Notas de Negociação
- 📊 Importar Movimentações (CSV/Excel)
- 💰 Gerenciar Preço Médio
- 📅 Apuração Mensal / DARF
- 📋 Relatório de Bens e Direitos
- ⚙️ Configurações
- 💾 Backup / Restore

### Funcionalidade de Backup/Restore

- **Backup**: Copiar `tax-report.db` para local escolhido pelo usuário
- **Restore**: Substituir `tax-report.db` por arquivo escolhido (com confirmação)
- Usar `dialog.showSaveDialog` e `dialog.showOpenDialog`

## Critérios de Sucesso

- ✅ Relatório lista todos os ativos com posição > 0 em 31/12
- ✅ Texto de discriminação está formatado corretamente
- ✅ Botão de copiar funciona para cada campo
- ✅ Classificação da Receita Federal está correta por tipo de ativo
- ✅ Backup cria cópia do banco de dados no local escolhido
- ✅ Restore substitui banco atual e aplicação funciona normalmente
- ✅ HomePage exibe menu com acesso a todas funcionalidades
- ✅ Testes E2E cobrem os 3 fluxos principais (importação, apuração, relatório)

## Testes da Tarefa

- [ ] **Testes de unidade - ReportGenerator**:
  - [ ] Gerar relatório com 1 ativo
  - [ ] Gerar relatório com múltiplos ativos
  - [ ] Verificar classificação correta por tipo
  - [ ] Verificar formato do texto de discriminação
  - [ ] Asset com quantidade 0 não aparece no relatório

- [ ] **Testes de integração - Relatório Completo**:
  - [ ] Seed de assets no banco
  - [ ] Chamar `window.api.report.assetsRights(2024)`
  - [ ] Validar dados retornados

- [ ] **Testes de integração - Backup/Restore**:
  - [ ] Criar backup do banco
  - [ ] Verificar que arquivo foi criado
  - [ ] Restaurar backup
  - [ ] Verificar que dados foram restaurados

- [ ] **Testes E2E - Fluxo de Importação**:
  - [ ] Abrir aplicação
  - [ ] Clicar em "Importar Notas"
  - [ ] Fazer upload de PDF de teste
  - [ ] Conferir dados extraídos
  - [ ] Confirmar importação
  - [ ] Navegar para "Gerenciar Preço Médio"
  - [ ] Verificar que ativo aparece na lista

- [ ] **Testes E2E - Fluxo de Relatório**:
  - [ ] Navegar para "Relatório de Bens e Direitos"
  - [ ] Verificar que tabela exibe ativos
  - [ ] Clicar em botão de copiar
  - [ ] Verificar que texto foi copiado para clipboard

- [ ] **Testes E2E - Navegação**:
  - [ ] Abrir aplicação
  - [ ] Verificar que HomePage é exibida
  - [ ] Navegar por todas as telas
  - [ ] Verificar que todas carregam sem erro

### Exemplo de Teste E2E - Playwright

```typescript
// tests/e2e/assets-report-flow.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('should generate assets report', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Navegar para relatório
  await window.click('text=Relatório de Bens e Direitos');

  // Verificar que tabela está visível
  await expect(window.locator('table')).toBeVisible();

  // Verificar que há pelo menos 1 ativo
  const rows = await window.locator('tbody tr').count();
  expect(rows).toBeGreaterThan(0);

  // Clicar em botão de copiar
  await window.click('button:has-text("Copiar")').first();

  // Verificar toast de sucesso
  await expect(window.locator('text=Copiado!')).toBeVisible();

  await app.close();
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/main/services/report-generator.ts`
- `src/main/services/__tests__/report-generator.test.ts`
- `src/renderer/pages/HomePage/*`
- `src/renderer/pages/AssetsReportPage/*`
- `src/renderer/components/CopyButton/*`
- `src/main/ipc/handlers/report-handlers.ts`
- `src/main/ipc/handlers/db-handlers.ts`
- `tests/e2e/*.spec.ts`
- `playwright.config.ts`

**A serem atualizados:**
- `src/main/ipc/ipc-handler-registry.ts` (registrar handlers)
- `src/renderer/App.tsx` (adicionar rotas, definir HomePage como default)

**Dependências:**
- Todas as tasks anteriores (1.0 a 9.0)

**References no PRD:**
- F1: RF-01, RF-02 (Menu)
- F7: RF-29 a RF-32 (Relatório)
- F8: RF-33 a RF-36 (Backup/Restore)

**References na TechSpec:**
- Linhas 21, 28, 33 (ReportGenerator, HomePage, AssetsReportPage)
- Seção "Testes de E2E" (linhas 403-411)
- Seção "Endpoints de API" (linhas 351-356)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/electron.mdc`
- `.cursor/rules/react.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
