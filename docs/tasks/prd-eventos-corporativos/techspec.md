# Especificação Técnica: Eventos Corporativos (Bonificação, Desdobramento, Grupamento)

## Resumo Executivo

A implementação provê suporte aos cálculos de eventos corporativos primários (Bonificações, Desdobramentos/Splits e Grupamentos/Inplits) no Tax Report. Foi decidida uma abordagem *Domain-Driven* onde o motor de posições atualizará quantidades e custo médio proporcionalmente para acompanhar as exigências da Receita Federal (IRPF), mantendo íntegro o Custo Total. As frações residuais resultantes de agrupamentos de lotes serão arredondadas para inteiro inferido (condizente com o descarte fracionário de lotes reais leiloados na B3), e o custo de bonificação utilizará os campos estruturais preexistentes de transação.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **`AssetPosition` (Domain Entity)**: Responsável por processar a matemática da posição e manter o status seguro do ativo. Receberá a injeção funcional para escalada de quantidade (`applySplit`, `applyReverseSplit`) e receberá um refinamento na assinatura do `applyBonus`.
- **`Transaction` (Domain Entity)**: Responsável pelo registro logbook das operações imutáveis. O campo nativo `quantity` servirá como ratio (fator) em eventos do tipo desdobramento, e `unitPrice` armazenará o custo por cota atribuído em bonificações. 
- **`AveragePriceService` (Domain Service)**: Intermediário de cálculo que estenderá o balanceamento aritmético (atualização do `averagePrice` com novos proventos de bonificação).
- **`TransactionType` (Shared Type)**: Enum central que reflete a raiz semântica das ações, a ser aditivado.
- **`ImportTransactionsUseCase` & `PreviewImportUseCase` (Application Use Cases)**: Validadores da fronteira para notificar (via *warnings*) planilhas que apresentem bonificações sem declaração de *unitCost*.

## Design de Implementação

### Interfaces Principais

Extensão dos contratos do pacote principal de aplicação e domínios.

```typescript
// Extensões na Transaction
export enum TransactionType {
  // ...
  Bonus = 'bonus',
  Split = 'split',
  ReverseSplit = 'reverse_split'
}

// Em AssetPosition - Novos e Alterados
interface ApplyBonusInput extends ApplyOperationInput {
  unitCost: number; // Mapeado diretamente do Transaction.unitPrice
}

interface ApplySplitInput {
  ratio: number; // Mapeado do Transaction.quantity
}

interface ApplyReverseSplitInput {
  ratio: number; // Mapeado do Transaction.quantity
}
```

### Modelos de Dados

O banco de dados e os contratos DTO originais não requerem alterações estruturais pesadas, tendo em vista que `Transaction` já possui `quantity` (que poderá portar um multiplicador de ratio) e `unitPrice` (que poderá portar o custo da bonificação).

- Adição explícita do arredondamento: Quando ocorrerem desdobramentos ou agrupamentos que gerem resíduos de ações nas Corretoras (`BrokerAllocation`), a entidade executará truncagem utilizando `Math.floor()`. A lógica imita o comportamento real de mercado, no qual sub-lotes quebram para liquidação em leilão.

### Endpoints de API / IPC

Não há novos Endpoints de dados; no Fluxo de IPC Desktop, as lógicas atreladas a `preview-import` devem passar a retornar os *warnings soft* do negócio no schema de feedback.

```typescript
// Exemplo em preview-import.output.ts
export interface PreviewImportOutput {
  // ...
  warnings?: {
    row: number;
    message: string;
    type: 'BONUS_MISSING_COST' | string;
  }[]
}
```

## Pontos de Integração

Não há alteração que envolva APIs rest/externas como B3 ou OpenFinance, mantendo o escopo 100% *offline* baseando-se no histórico ingerido.

## Abordagem de Testes

### Testes Unidade

- **Cenário em `asset-position.entity.spec.ts`:**
  - Garantir que `applySplit(ratio: 2)` duplique totalQuantity e corte o PM pela metade, deixando `totalCost` neutro.
  - Testar agrupamento `applyReverseSplit(ratio: 10)` com saldo residual (ex: tendo 109 cotas, sobra 10 cotas pelo Math.floor puro).
  - Garantir que `applyBonus` calcule o Custo Total Novo somando `(Qtd_recebida * Custo_Unitário)`.
  
- **Cenário em serviços de Import/Preview (`preview-import-use-case.test.ts`)**:
  - Prever assert de `warnings` ativados se o CSV mockado injetar transação de Bonificação com custo valendo "0".

### Testes de Integração
- Confirmar que migrações ou leituras baseadas nos Enuns persistem/resgatam normalmente (em `knex-transaction.repository.ts`).

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Camada de Setup Partilhado**: Atualizar dependências em `shared/types/domain.ts` (`TransactionType`).
2. **Camada de Domínio Core**: Refatorar `AssetPosition` adicionando suporte aos novos fluxos matemáticos (Split/Reverse Split) e adaptando input de `Bonus`. Ajustar `AveragePriceService`.
3. **Camada Application**: Injetar no `preview-import-use-case.ts` a validação de warning soft, permitindo *fallthrough* para o banco com `unitPrice = 0` se o usuário assim confirmar na UI.

## Considerações Técnicas

### Decisões Principais

- **Uso do campo `quantity` como Fator**: Ao invés de criarmos campos inúteis pro Schema como `factorX` e `factorY`, economizamos as tabelas relacionais reaproveitando `transaction.quantity` para ditar o ratio no momento do processamento de Event Sourcing do Portifólio (Split).
- **Frações descartadas via Dominio Numérico**: Conforme conversado, para espelhar transações bancárias e evitar disformismos de flutuantes (120.30 ações), o código domará sub-lotes com `Math.floor`. O dinheiro das possiveis vendas em leilões fica reservado ao lançamento opcional das vendas manuais pelo Usuário.

### Conformidade com Padrões

*   **@.cursor/rules/architecture.mdc**: A arquitetura mantém dependências apontadas do macro para o micro. As lógicas relativas às contas matemáticas de evento são isoladas rigidamente nas *entities* (Domain Layer) - o `AssetPosition` toma as responsabilidades de estado final - enquanto o parseamento e os alertas moram na *application layer*.
*   **Interfaces**: Todas as lógicas seguem mapeadas independentemente dos frameworks, favorecendo os DTOs enxutos listados em preview e import.

### Arquivos Relevantes e Dependentes

- `src/shared/types/domain.ts`
- `src/main/domain/portfolio/entities/asset-position.entity.ts`
- `src/main/domain/portfolio/entities/transaction.entity.ts`
- `src/main/domain/portfolio/services/average-price.service.ts`
- `src/main/domain/portfolio/services/position-calculator.service.ts`
- `src/main/application/use-cases/preview-import/preview-import-use-case.ts`
- `src/main/application/use-cases/import-consolidated-position/import-consolidated-position-use-case.ts`
