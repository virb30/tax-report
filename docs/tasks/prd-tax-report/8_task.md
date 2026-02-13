# Tarefa 8.0: Motor de Apuração Mensal e DARF

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o `TaxAssessmentEngine`, o motor de apuração mensal que calcula ganho/prejuízo por venda, consolida por mês e categoria de ativo, aplica isenções, compensa prejuízos acumulados e calcula o DARF devido. Esta é a tarefa mais complexa do projeto em termos de regras de negócio tributárias e requer testes extensivos cobrindo todos os cenários.

<requirements>
- Implementar classe `TaxAssessmentEngine` com método `assessYear(year)`
- Cálculo de ganho/prejuízo por operação de venda
- Consolidação mensal por tipo de ativo (stock, fii, etf, bdr)
- Aplicação de isenção mensal para ações (vendas < R$ 20.000)
- Compensação de prejuízos acumulados por categoria
- Cálculo de DARF com desconto de IRRF
- Implementar `TaxConfigManager` para leitura de alíquotas
- Persistência de prejuízos acumulados em `accumulated_losses`
- Testes de unidade cobrindo 100% dos cenários tributários
- Conformidade com RF-20 a RF-28 do PRD
</requirements>

## Subtarefas

- [ ] 8.1 Implementar `TaxConfigManager` (leitura de alíquotas)
- [ ] 8.2 Criar estrutura base do `TaxAssessmentEngine`
- [ ] 8.3 Implementar cálculo de ganho/prejuízo por venda
- [ ] 8.4 Implementar consolidação mensal por tipo de ativo
- [ ] 8.5 Implementar lógica de isenção para ações
- [ ] 8.6 Implementar compensação de prejuízos acumulados
- [ ] 8.7 Implementar cálculo de DARF com desconto de IRRF
- [ ] 8.8 Implementar persistência de prejuízos acumulados
- [ ] 8.9 Criar testes para cenários de lucro
- [ ] 8.10 Criar testes para cenários de prejuízo
- [ ] 8.11 Criar testes para compensação de prejuízos
- [ ] 8.12 Criar testes para isenção de ações
- [ ] 8.13 Criar testes para múltiplos meses encadeados

## Detalhes de Implementação

Consulte a seção **F6 (RF-20 a RF-28)** no `prd.md` e **"Interfaces Principais"** (linhas 205-223) e **"Sequenciamento"** (item 10) da `techspec.md`.

### Regras Tributárias

| Tipo Ativo | Alíquota | Isenção Mensal | IRRF |
|------------|----------|----------------|------|
| Ações      | 15%      | Vendas < R$ 20k| 0.005% |
| FIIs       | 20%      | Nenhuma        | 0.005% |
| ETFs       | 15%      | Nenhuma        | 0.005% |
| BDRs       | 15%      | Nenhuma        | 0.005% |

### Fórmula de Ganho/Prejuízo por Venda

```
ganho_líquido = (preço_venda × quantidade) - (preço_médio × quantidade) - custos_operacionais_venda
```

### Fórmula de DARF

```
base_cálculo = ganho_bruto - prejuízo_compensado
imposto_devido = base_cálculo × alíquota
irrf_a_compensar = total_vendas × 0.00005
darf = imposto_devido - irrf_a_compensar
```

### Compensação de Prejuízos

- Prejuízos de **ações** compensam apenas ganhos de **ações**
- Prejuízos de **FIIs** compensam apenas ganhos de **FIIs**
- Prejuízos de **ETFs** compensam apenas ganhos de **ETFs**
- Prejuízos de **BDRs** compensam apenas ganhos de **BDRs**
- Prejuízo não compensado é acumulado para meses futuros

### Interface MonthlyAssessment

```typescript
export interface MonthlyAssessment {
  year: number;
  month: number;               // 1-12
  assetType: AssetType;
  totalSales: number;          // Volume total de vendas
  grossGain: number;           // Ganho/prejuízo bruto
  lossCompensated: number;     // Prejuízo compensado neste mês
  taxBase: number;             // Base de cálculo após compensação
  taxDue: number;              // Imposto devido (antes IRRF)
  irrfToCompensate: number;    // IRRF a compensar
  darfValue: number;           // Valor final do DARF
  isExempt: boolean;           // Se isento por limite (só ações)
}
```

### Estrutura de Arquivos

```
src/main/services/
├── tax-assessment-engine.ts
├── tax-config-manager.ts
└── __tests__/
    ├── tax-assessment-engine.test.ts
    └── tax-config-manager.test.ts
```

## Critérios de Sucesso

- ✅ Venda com lucro calcula imposto corretamente
- ✅ Venda com prejuízo registra prejuízo acumulado
- ✅ Ações com vendas < R$ 20k são isentas (darfValue = 0)
- ✅ FIIs não têm isenção mesmo com vendas baixas
- ✅ Prejuízo de mês anterior compensa lucro de mês atual
- ✅ Prejuízo de ações não compensa ganho de FIIs
- ✅ IRRF é descontado corretamente do DARF
- ✅ Múltiplas vendas no mesmo mês são consolidadas
- ✅ Cobertura de testes 100%

## Testes da Tarefa

- [ ] **Testes de unidade - Cálculo de Ganho**:
  - [ ] Venda com lucro → ganho positivo
  - [ ] Venda com prejuízo → ganho negativo
  - [ ] Custos operacionais reduzem ganho

- [ ] **Testes de unidade - Isenção de Ações**:
  - [ ] Vendas totais < R$ 20k → isExempt = true, darfValue = 0
  - [ ] Vendas totais ≥ R$ 20k → isExempt = false, calcula DARF

- [ ] **Testes de unidade - Tributação de FIIs**:
  - [ ] Qualquer ganho em FII é tributável
  - [ ] Alíquota 20% aplicada corretamente

- [ ] **Testes de unidade - Compensação de Prejuízos**:
  - [ ] Mês 1: prejuízo de R$ 1000 em ações
  - [ ] Mês 2: lucro de R$ 1500 em ações
  - [ ] Resultado: compensa R$ 1000, tributa R$ 500

- [ ] **Testes de unidade - Segregação por Categoria**:
  - [ ] Prejuízo em ações não compensa ganho em FIIs
  - [ ] Prejuízo em FIIs não compensa ganho em ações

- [ ] **Testes de unidade - IRRF**:
  - [ ] IRRF = total_vendas × 0.00005
  - [ ] IRRF é descontado do imposto devido

- [ ] **Testes de integração - Fluxo Completo**:
  - [ ] Seed de operações no banco
  - [ ] Executar `assessYear(2024)`
  - [ ] Validar `MonthlyAssessment` para cada mês

### Exemplo de Teste

```typescript
// src/main/services/__tests__/tax-assessment-engine.test.ts
import { TaxAssessmentEngine } from '../tax-assessment-engine';
import { AssetType } from '../../../shared/enums';

describe('TaxAssessmentEngine', () => {
  let engine: TaxAssessmentEngine;

  beforeEach(() => {
    // Mock de repositórios
    engine = new TaxAssessmentEngine(/* deps */);
  });

  describe('Stock exemption', () => {
    it('should exempt stocks when total sales < 20000', () => {
      // Seed: venda de ações com volume total = R$ 15.000, lucro = R$ 500
      const assessment = engine.assessMonth(2024, 1, AssetType.Stock);

      expect(assessment.totalSales).toBe(15000);
      expect(assessment.grossGain).toBe(500);
      expect(assessment.isExempt).toBe(true);
      expect(assessment.darfValue).toBe(0);
    });

    it('should tax stocks when total sales >= 20000', () => {
      // Seed: venda de ações com volume total = R$ 25.000, lucro = R$ 1000
      const assessment = engine.assessMonth(2024, 1, AssetType.Stock);

      expect(assessment.totalSales).toBe(25000);
      expect(assessment.grossGain).toBe(1000);
      expect(assessment.isExempt).toBe(false);
      expect(assessment.taxDue).toBe(150); // 1000 * 0.15
    });
  });

  describe('Loss compensation', () => {
    it('should compensate accumulated loss', () => {
      // Seed: prejuízo acumulado de R$ 500 em ações
      // Mês atual: lucro de R$ 1000 em ações
      const assessment = engine.assessMonth(2024, 2, AssetType.Stock);

      expect(assessment.grossGain).toBe(1000);
      expect(assessment.lossCompensated).toBe(500);
      expect(assessment.taxBase).toBe(500); // 1000 - 500
      expect(assessment.taxDue).toBe(75); // 500 * 0.15
    });
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/main/services/tax-assessment-engine.ts`
- `src/main/services/tax-config-manager.ts`
- `src/main/services/__tests__/tax-assessment-engine.test.ts`
- `src/main/services/__tests__/tax-config-manager.test.ts`

**Dependências:**
- Task 2.0 (repositórios de operations, accumulated_losses, tax_config)
- Task 7.0 (operações registradas no banco)

**References no PRD:**
- F6: RF-20 a RF-28 (Apuração Mensal)
- Tabela de alíquotas (linha 133-139)

**References na TechSpec:**
- Linhas 205-223 (Interfaces)
- Linhas 286-291 (Dados de tax_config)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
