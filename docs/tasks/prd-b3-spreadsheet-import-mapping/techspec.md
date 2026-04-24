# Template de Especificação Técnica

## Resumo Executivo

A lógica atual de importação de planilhas de transações será refatorada para se adequar nativamente ao formato de exportação de movimentações da Área do Investidor da B3, removendo a dependência de preparos manuais de planilhas (criação da coluna "Tipo"). Isso envolve substituir a coluna legada "Tipo" pelas colunas oficiais "Entrada/Saída" e "Movimentação". Para aprimorar a arquitetura e manter o código aderente aos princípios do S.O.L.I.D. e _Clean Architecture_, a lógica de conversão e classificação textual em primários de sistema (`OperationType`) será delegada para uma nova classe injetável: `B3SpreadsheetTransactionMapper`. Eventos fora de escopo (como Direitos de Subscrição) serão ignorados de modo silencioso e automático.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **`CsvXlsxTransactionParser`** (Modificado): Terá os `REQUIRED_COLUMNS` atualizados, removendo a coluna "Tipo" e adicionando "Entrada/Saída" e "Movimentação". Terá a responsabilidade pesada de decifração de texto extraída, atuando apenas sobre a consolidação da leitura validada.
- **`B3SpreadsheetTransactionMapper`** (Novo Componente): Classe de adaptador/estratégia (em `infrastructure/mappers`) que implementa a interface do mapeador e possui as regras e constantes do dicionário da corretora interna. Ela recebe as cruas das colunas "Movimentação" e "Entrada/Saída" isoladas, devolvendo o `OperationType` correspondente, e avisa ao parser parent se a linha é caso de descarte silencioso (`shouldIgnore`).
- Ambos interagem como dependências no momento do setup do Parser.

## Design de Implementação

### Interfaces Principais

```typescript
export interface B3TransactionMappingResult {
  operationType?: OperationType;
  shouldIgnore: boolean; // Indica se a linha deve ser descartada silenciosamente
}

export interface SpreadsheetTransactionMapper {
  mapRowType(entradaSaida: string, movimentacao: string): B3TransactionMappingResult;
  validateRowIntegrity(rowRawData: any, mappingResult: B3TransactionMappingResult): void;
}
```

### Modelos de Dados

O `OperationType` e o `TransactionType` no arquivo `src/shared/types/domain.ts` permanecem os mesmos.
Será adicionada uma estrutura de mapeamento interna na classe `B3SpreadsheetTransactionMapper`:

- Um mapeamento literal ou conjunto de instruções avaliando "Movimentação" e "Entrada/Saída" simultaneamente, convertendo-as para `OperationType` (como `"Transferência" + "Credito"` -> `TransferIn`) e a lista nominal de eventos sumariamente ignorados ("Direito de Subscrição", etc).

### Endpoints de API

_Não se aplica, todo o fluxo opera na camada Application/Infrastructure do backend via handlers de IPC existentes._

## Pontos de Integração

_Não há._

## Abordagem de Testes

### Testes Unidade

A estratégia será separada para respeitar o SRP (_Single Responsibility Principle_):

- **`b3-spreadsheet-transaction.mapper.test.ts` (Novo)**:
  - Validar todos os cenários das regras do PRD (Crédito vs Débito para Compra, Venda, Transferências, Bonificações).
  - Assertar retornos com `shouldIgnore = true` explícito para Leilão e Subscrição.
  - Testar o diparo de erros se o tipo for "Bonificação" sem haver um numérico positivo válido em `Preco Unitario`.
- **`csv-xlsx-transaction.parser.test.ts` (Modificado)**:
  - Renovar mock data para a nova estrutura de dados colunar, e certificar de que os testes originais reagem bem ao novo Mapper e as planilhas novas (`verify ignores` e `validate valid rows`).

### Testes de Integração

Atualizar os arquivos _Stubs_ integrativos (os `.xlsx` e `.csv` usados nas asserções do Use-Case `ImportB3SpreadsheetUseCase` ou Handlers relacionados) para refletir a nova presença de "Entrada/Saída" e "Movimentação". Sem isso todos falhariam no _validator_ de colunas requeridas.

### Testes de E2E

Sendo um fluxo IPC central, o componente responsável por orquestrar em uma janela `playwright` (se houver varredura frontend na etapa e2e contínua) necessitará usar um arquivo Excel novo modificado.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Criar a `B3SpreadsheetTransactionMapper`**: Produzir o dicionário de combinações exatas em forma de interface para o adapter, o setup das diretrizes de ignorar itens silenciados, e cobrir com Unittests os mapeamentos isolados.
2. **Atualizar Arquivos Mock de Teste**: Trocar os mocks dos testes do `CsvXlsxTransactionParser` e arquivos estáticos (.csv/.yml/.xlsx) das pastas de assets de teste para portabilizar os _fixtures_ com o formato novo.
3. **Refatorar `CsvXlsxTransactionParser`**:
   - Modificar os `REQUIRED_COLUMNS`.
   - Injetar/Instanciar o `B3SpreadsheetTransactionMapper`.
   - Extrair e descartar as sub-rotinas obsoletas `parseOperationType()`.
   - Adicionar o _early-return_ explícito (via `continue`) se o Mapper devolver `shouldIgnore`.
   - Integrar a rotina da checagem especial da bonificação (`> 0.00`).
4. **Verificar Build e Run tests**: Rodar Jest integrativo local para confirmar tudo passando sem loops infinitos e cobertura 100% do novo adapter.

### Dependências Técnicas

Nenhum bloco adicional. Permitem uso da lib legada (`xlsx`) do jeito usual.

## Monitoramento e Observabilidade

Os registros `shouldIgnore = true` serão contornados via `continue` dentro do for loop de parsing no back, evadindo processos pesados ou envios inócuos de debug para interfaces gráficas e livrando tráfego IPC.

## Considerações Técnicas

### Decisões Principais

- **Breaking Change (Corte Abruto)**: Conforme respondido à analise do sistema, descartar inteiramente planilhas baseadas num tipo manipulado de "Tipo", deixando que _apenas_ formatos nativamente B3 importem. Isso favorece um código magro no _Parser_ que não precisa ficar checando ambiguidade ou retrocompatibilidade pesada por um formato incorreto ou _workaround_.
- **Mapper Pattern / Strategy**: Ao retirar o fluxo de condições confusas dentro do arquivo `...parser.ts` para um componente testável `B3SpreadsheetTransactionMapper.ts`, possibilita o open-closed pattern. Novos eventos e ações corporativas que a B3 crie magicamente exigirão edição em arquivo local com risco zero à lógica de I/Os e Streams do Parser em si.

### Riscos Conhecidos

- **Efeito Borboleta em Regex e Case Insensitive**: Na B3, pode haver diferenças ocasionais de formato texto legível ("Credito" x "crédito"), a mitigação principal continua de remover acentuação antes do mapping.
- Bonificações falsamente válidas por causa da ausência de coluna de Valor financeiro - Como será aferido unicamente de o "Preço Unitário" é válido, o investidor não tem outra escolha que não manipular a quantidade unitária em valores justificados na planilha, o qual atende a finalidade.

### Conformidade com Padrões

- **`architecture.md` / _Clean Architecture_**: Implementação da inteligência de adaptação estrutural separada das especificações de negócios contábeis. (Domain > Infrastructure/Adapters).
- **`node.md` / _Interfaces & TypeScript_**: A estrutura adota Interfaces de _Dependency Inversion/Injection_ mantendo o SRP de ambas as classes.
- **`tests.md` / _Unit Tests_**: TDD encorajou as regras detalhadas da Tech Spec de construir o mapper explicitamente à sombra de um arquivo robusto de Unit tests.

### Arquivos relevantes e dependentes

- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.ts`
- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.test.ts`
- `src/main/infrastructure/parsers/b3-spreadsheet-transaction.mapper.ts` (Novo)
- `src/main/infrastructure/parsers/b3-spreadsheet-transaction.mapper.test.ts` (Novo)
