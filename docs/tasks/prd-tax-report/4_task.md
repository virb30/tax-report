# Tarefa 4.0: Motor de Cálculo de Preço Médio

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o `AveragePriceCalculator` como um módulo de lógica pura (sem dependências externas) que calcula o preço médio ponderado de ativos considerando compras incrementais, rateio de custos operacionais, e redução de quantidade em vendas. Este é o coração do cálculo tributário e deve ter cobertura de testes 100% com todos os cenários possíveis.

<requirements>
- Implementar classe `AveragePriceCalculator` como lógica pura
- Cálculo de média ponderada para operações de compra
- Rateio proporcional de custos operacionais entre ativos
- Redução de quantidade para vendas (sem alterar preço médio)
- Validações de quantidade negativa e divisão por zero
- Testes de unidade cobrindo 100% dos cenários
- Zero dependências externas (apenas lógica matemática)
- Conformidade com `.cursor/rules/node.mdc` e `.cursor/rules/code-standards.mdc`
</requirements>

## Subtarefas

- [ ] 4.1 Criar interface `AveragePriceCalculator` e tipos relacionados
- [ ] 4.2 Implementar método `calculateBuy()` - primeira compra
- [ ] 4.3 Implementar método `calculateBuy()` - compra adicional (média ponderada)
- [ ] 4.4 Implementar rateio proporcional de custos operacionais
- [ ] 4.5 Implementar método `calculateSell()` - redução de quantidade
- [ ] 4.6 Adicionar validações (quantidade negativa, venda maior que posição)
- [ ] 4.7 Criar testes para primeira compra
- [ ] 4.8 Criar testes para múltiplas compras
- [ ] 4.9 Criar testes para vendas parciais e totais
- [ ] 4.10 Criar testes para cenários com custos operacionais
- [ ] 4.11 Criar testes para edge cases (validações)

## Detalhes de Implementação

Consulte as seções **"Interfaces Principais"** (linhas 179-202) e **"RF-16 a RF-19"** no `prd.md`, além do **"Sequenciamento de Desenvolvimento"** (item 4) da `techspec.md`.

### Fórmula de Preço Médio

```
novo_preço_médio = (
  (quantidade_anterior × preço_médio_anterior) +
  (quantidade_nova × preço_novo) +
  custos_proporcionais
) / (quantidade_anterior + quantidade_nova)
```

### Interfaces

```typescript
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
```

### Cenários de Teste Obrigatórios

1. **Primeira compra**: Quantidade anterior = 0
2. **Compra adicional**: Recalcular média
3. **Venda parcial**: Reduz quantidade, mantém preço médio
4. **Venda total**: Zera posição
5. **Múltiplas compras no mesmo dia**: Consolidar antes de calcular
6. **Custos operacionais**: Incorporar ao preço médio
7. **Validações**: Quantidade negativa, venda > posição

## Critérios de Sucesso

- ✅ Primeira compra retorna `newAveragePrice = newUnitPrice + (proportionalCosts / newQuantity)`
- ✅ Compra adicional recalcula média ponderada corretamente
- ✅ Venda reduz quantidade mas não altera preço médio unitário
- ✅ Custos operacionais são incorporados proporcionalmente ao preço médio
- ✅ Validações lançam exceções claras (ex: `InsufficientQuantityError`)
- ✅ Cobertura de testes 100%
- ✅ Nenhuma dependência externa (apenas TypeScript/Node puro)

## Testes da Tarefa

- [ ] **Testes de unidade - Primeira Compra**:
  - [ ] Compra de 100 ações a R$10 → preço médio = R$10
  - [ ] Compra com custos operacionais R$5 → incorporar ao preço médio

- [ ] **Testes de unidade - Compra Adicional**:
  - [ ] Posição: 100@R$10, Compra: 50@R$12 → novo preço médio = R$10,67
  - [ ] Múltiplas compras incrementais

- [ ] **Testes de unidade - Venda**:
  - [ ] Posição: 100@R$10, Venda: 50 → quantidade = 50, preço médio = R$10
  - [ ] Venda total → quantidade = 0

- [ ] **Testes de unidade - Custos Operacionais**:
  - [ ] Compra: 100@R$10 + R$20 custos → preço médio = R$10,20

- [ ] **Testes de unidade - Validações**:
  - [ ] Tentar vender 150 quando posição = 100 → erro
  - [ ] Quantidade negativa → erro
  - [ ] Preço unitário negativo → erro

### Exemplo de Teste

```typescript
// src/main/services/__tests__/average-price-calculator.test.ts
import { AveragePriceCalculator } from '../average-price-calculator';

describe('AveragePriceCalculator', () => {
  let calculator: AveragePriceCalculator;

  beforeEach(() => {
    calculator = new AveragePriceCalculator();
  });

  describe('calculateBuy', () => {
    it('should calculate average price for first buy', () => {
      const result = calculator.calculateBuy({
        ticker: 'PETR4',
        previousQuantity: 0,
        previousAveragePrice: 0,
        newQuantity: 100,
        newUnitPrice: 10.00,
        proportionalCosts: 5.00,
      });

      expect(result.newQuantity).toBe(100);
      expect(result.newAveragePrice).toBe(10.05); // (100*10 + 5) / 100
    });

    it('should calculate average price for additional buy', () => {
      const result = calculator.calculateBuy({
        ticker: 'PETR4',
        previousQuantity: 100,
        previousAveragePrice: 10.00,
        newQuantity: 50,
        newUnitPrice: 12.00,
        proportionalCosts: 0,
      });

      expect(result.newQuantity).toBe(150);
      expect(result.newAveragePrice).toBeCloseTo(10.67, 2);
    });
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/main/services/average-price-calculator.ts`
- `src/main/services/__tests__/average-price-calculator.test.ts`

**Dependências:**
- Task 1.0 (scaffolding + Jest)

**References na TechSpec:**
- Linhas 179-202 (Interfaces)
- Seção "Sequenciamento" item 4

**References no PRD:**
- RF-16 a RF-19 (Cálculo de Preço Médio)

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
