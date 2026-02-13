# Tarefa 9.0: Relatório Anual, Observabilidade e Validação E2E

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Finalizar o produto com geração do relatório de Bens e Direitos, instrumentação de observabilidade (logs e métricas) e validação fim a fim do fluxo completo do MVP. Esta tarefa depende da 8.0 e fecha os objetivos de negócio do PRD.

<requirements>
- Implementar geração de relatório anual de posição em 31/12
- Implementar textos de discriminação prontos para cópia
- Garantir classificação de ativos por grupo/código conforme PRD
- Instrumentar logs estruturados e métricas técnicas definidas na techspec
- Validar fluxo completo `import -> portfolio -> tax -> report`
- Consolidar critérios de aceite funcionais e técnicos com testes automatizados
</requirements>

## Subtarefas

- [ ] 9.1 Implementar geração do relatório anual de ativos (31/12)
- [ ] 9.2 Implementar montagem de discriminação por ativo com botão de cópia
- [ ] 9.3 Implementar classificação automática por grupo/código da Receita
- [ ] 9.4 Instrumentar logs estruturados com correlação por request/lote
- [ ] 9.5 Instrumentar métricas de importação, domínio, apuração e repositório
- [ ] 9.6 Criar testes de integração do relatório anual
- [ ] 9.7 Criar suíte E2E de regressão do fluxo completo do MVP

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Monitoramento e Observabilidade"**, **"Abordagem de Testes"** (E2E) e **"Sequenciamento de Desenvolvimento"** (ordem de construção item 7). Consulte no `prd.md` os requisitos RF-29 a RF-32 e os critérios de sucesso do produto.

## Critérios de Sucesso

- Relatório anual completo e coerente com posição e preço médio persistidos
- Conteúdo de discriminação pronto para uso no programa da declaração
- Métricas e logs permitem rastrear performance e falhas do fluxo
- Fluxo completo do MVP validado por integração e E2E

## Testes da Tarefa

- [ ] Testes de unidade (formatação e classificação de relatório)
- [ ] Testes de integração (relatório + dados persistidos + observabilidade básica)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/`
- `src/main/domain/tax-compliance/`
- `src/main/ipc/handlers/`
- `src/renderer/`
- `src/shared/contracts/`
# Tarefa 9.0: Tela de Apuração Mensal e Configurações

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar a página `MonthlyAssessmentPage` que exibe a apuração mensal em formato de tabela com cores indicativas (vermelho para DARF devido, verde para isento), e a página `SettingsPage` para edição de alíquotas e parâmetros tributários. Esta tarefa expõe ao usuário os cálculos realizados pelo motor de apuração (Task 8.0).

<requirements>
- Página `MonthlyAssessmentPage` com seletor de ano e tabela de apuração
- Tabela com colunas: Mês, Tipo Ativo, Total Vendas, Ganho/Prejuízo, Compensação, Base Cálculo, DARF
- Cores indicativas: vermelho para DARF > 0, verde para isento, amarelo para prejuízo
- Página `SettingsPage` com formulário de edição de alíquotas
- Handlers IPC: assessment:monthly, config:get-tax, config:update-tax
- Validação de valores editados (alíquotas entre 0 e 1, limites > 0)
- Testes de integração do fluxo completo
- Conformidade com RF-20 a RF-28, RF-37, RF-38 do PRD
</requirements>

## Subtarefas

- [ ] 9.1 Criar página `MonthlyAssessmentPage` (estrutura básica)
- [ ] 9.2 Implementar seletor de ano (dropdown ou input)
- [ ] 9.3 Criar componente de tabela de apuração mensal
- [ ] 9.4 Implementar handler IPC `assessment:monthly`
- [ ] 9.5 Implementar lógica de cores indicativas (status badge)
- [ ] 9.6 Adicionar tooltip/detalhamento por mês (opcional)
- [ ] 9.7 Criar página `SettingsPage` (estrutura básica)
- [ ] 9.8 Criar formulário de edição de alíquotas
- [ ] 9.9 Implementar handler IPC `config:get-tax`
- [ ] 9.10 Implementar handler IPC `config:update-tax`
- [ ] 9.11 Adicionar validação de valores editados
- [ ] 9.12 Criar testes de integração do fluxo de apuração
- [ ] 9.13 Criar testes de integração do fluxo de configuração

## Detalhes de Implementação

Consulte as seções **F6 (RF-20 a RF-28)** e **F9 (RF-37, RF-38)** no `prd.md`, além da **"Sequenciamento"** (itens 11 e 13) da `techspec.md`.

### Layout da Tabela de Apuração

| Mês | Tipo | Total Vendas | Ganho/Prej | Compensação | Base Cálc | DARF | Status |
|-----|------|--------------|------------|-------------|-----------|------|--------|
| Jan | Ações | R$ 15.000 | R$ 500 | R$ 0 | R$ 500 | R$ 0 | 🟢 Isento |
| Jan | FIIs | R$ 8.000 | R$ 300 | R$ 0 | R$ 300 | R$ 60 | 🔴 Devido |
| Fev | Ações | R$ 30.000 | -R$ 200 | R$ 0 | -R$ 200 | R$ 0 | 🟡 Prejuízo |

### Cores Indicativas

- 🔴 **Vermelho** (`darfValue > 0`): DARF devido, pagar até último dia útil do mês seguinte
- 🟢 **Verde** (`isExempt = true` ou `darfValue = 0`): Isento ou sem imposto
- 🟡 **Amarelo** (`grossGain < 0`): Prejuízo acumulado para compensação futura

### Formulário de Configurações

Campos editáveis por tipo de ativo:
- Alíquota (%) — validação: 0-100
- Limite de Isenção Mensal (R$) — validação: ≥ 0
- Alíquota IRRF (%) — validação: 0-100

### Estrutura de Arquivos

```
src/renderer/pages/
├── MonthlyAssessmentPage/
│   ├── MonthlyAssessmentPage.tsx
│   ├── AssessmentTable.tsx
│   ├── YearSelector.tsx
│   └── StatusBadge.tsx
└── SettingsPage/
    ├── SettingsPage.tsx
    ├── TaxConfigForm.tsx
    └── SettingsPage.css

src/main/ipc/handlers/
└── assessment-handlers.ts
```

## Critérios de Sucesso

- ✅ Usuário consegue selecionar ano e ver apuração de todos os meses
- ✅ Tabela exibe corretamente todos os campos de `MonthlyAssessment`
- ✅ Cores indicativas funcionam conforme critérios
- ✅ Usuário consegue editar alíquotas na tela de configurações
- ✅ Validação impede valores inválidos (alíquota > 100%, limite negativo)
- ✅ Alteração de alíquota é salva e refletida na apuração futura
- ✅ Testes de integração cobrem fluxo completo (buscar apuração + exibir)

## Testes da Tarefa

- [ ] **Testes de integração - Apuração Mensal**:
  - [ ] Chamar `window.api.assessment.monthly(2024)`
  - [ ] Verificar que retorna array de `MonthlyAssessment`
  - [ ] Seed de operações → Validar cálculos na resposta

- [ ] **Testes de integração - Configuração**:
  - [ ] Chamar `window.api.config.getTax()`
  - [ ] Editar alíquota de ações para 18%
  - [ ] Chamar `window.api.config.updateTax()`
  - [ ] Verificar que valor foi persistido no banco

- [ ] **Testes de UI (manual ou E2E básico)**:
  - [ ] Abrir página de apuração mensal
  - [ ] Selecionar ano 2024
  - [ ] Verificar que tabela exibe dados
  - [ ] Verificar cores corretas por status
  - [ ] Abrir página de configurações
  - [ ] Editar alíquota e salvar
  - [ ] Verificar mensagem de sucesso

### Exemplo de Teste - Handler IPC

```typescript
// src/main/ipc/handlers/__tests__/assessment-handlers.test.ts
import { handleAssessmentMonthly } from '../assessment-handlers';
import { TaxAssessmentEngine } from '../../../services/tax-assessment-engine';

jest.mock('../../../services/tax-assessment-engine');

describe('Assessment Handlers', () => {
  describe('handleAssessmentMonthly', () => {
    it('should return monthly assessment for given year', async () => {
      const mockEngine = new TaxAssessmentEngine();
      (mockEngine.assessYear as jest.Mock).mockResolvedValue([
        {
          year: 2024,
          month: 1,
          assetType: 'stock',
          totalSales: 15000,
          grossGain: 500,
          lossCompensated: 0,
          taxBase: 500,
          taxDue: 0,
          irrfToCompensate: 0,
          darfValue: 0,
          isExempt: true,
        },
      ]);

      const result = await handleAssessmentMonthly(null, { year: 2024 });

      expect(result).toHaveLength(1);
      expect(result[0].isExempt).toBe(true);
    });
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/renderer/pages/MonthlyAssessmentPage/*`
- `src/renderer/pages/SettingsPage/*`
- `src/main/ipc/handlers/assessment-handlers.ts`
- `src/main/ipc/handlers/__tests__/assessment-handlers.test.ts`

**A serem atualizados:**
- `src/main/ipc/ipc-handler-registry.ts` (registrar handlers)
- `src/renderer/App.tsx` (adicionar rotas)

**Dependências:**
- Task 3.0 (IPC)
- Task 8.0 (TaxAssessmentEngine, TaxConfigManager)

**References no PRD:**
- F6: RF-20 a RF-28 (Apuração Mensal)
- F9: RF-37, RF-38 (Configurações)
- Seção "Requisitos de UI/UX" (linhas 210-217)

**References na TechSpec:**
- Linhas 32-34 (MonthlyAssessmentPage, SettingsPage)
- Seção "Endpoints de API" (linhas 325-330, 333-337)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/electron.mdc`
- `.cursor/rules/react.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
