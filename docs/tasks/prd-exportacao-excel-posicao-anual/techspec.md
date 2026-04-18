# Especificação Técnica: Exportação de Posição Anual em Excel

## Resumo Executivo

A solução implementará a exportação consolidada de posições da carteira de forma estruturada para um arquivo `.xlsx`, com base nos dados do `AssetPositionRepository` e `BrokerRepository`. O fluxo será acionado pelo frontend por meio de uma aba dedicada com um seletor de anos. Toda a orquestração do arquivo em disco (salvamento/geração) ocorrerá integralmente no Backend (processo Main) aproveitando recursos nativos do Electron (`dialog.showSaveDialog`) e a biblioteca já existente SheetJS (`xlsx`). Através da inversão de dependência em uma nova porta `ConsolidatedPositionExporterPort`, abstrairemos o uso da biblioteca para manter as camadas da aplicação puras.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **Renderer (Frontend)**: Uma nova tela ou tab `ExportAnnualPositionPage` acionará a extração. O usuário determina o ano de extração e o backend inicia a negociação de pasta (onde salvar) e processo de geração.
- **IPC Controllers (`ExportController`)**: Um novo IPC listener (ex: `export:annual-position`) será o ponto de entrada no main process para resolver o diálogo de salvar do SO (`dialog.showSaveDialog`), adquirindo o caminho alvo, que será repassado para o caso de uso.
- **Camada de Aplicação (`ExportAnnualPositionUseCase`)**: Irá requerer injeção direta de `AssetPositionRepository` e `BrokerRepository`. Será responsável por consultar as posições do alvo da filtragem, eliminar/omitir qualquer corretora do `brokerBreakdown` cuja quantidade seja `<= 0`, formatar para os DTOs esperados na porta e acionar a exportação. 
- **Adaptadores de Infraestrutura (`SheetJsConsolidatedPositionExporter`)**: Implementação concreta que formata as linhas e colunas fixas: `Ticker`, `Quantidade`, `Preco Medio`, `Corretora` e escreve as abas para salvar o XLSX.

## Design de Implementação

### Interfaces Principais

```typescript
export type ExportablePositionRow = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerCode: string;
};

export interface ConsolidatedPositionExporterPort {
  exportToFile(filePath: string, rows: ExportablePositionRow[]): Promise<void>;
}
```

### Modelos de Dados

Para a DTO de entrada do UseCase:
```typescript
export interface ExportAnnualPositionInput {
  targetYear: number;
  filePath: string;
}

export interface ExportAnnualPositionOutput {
  exportedCount: number;
}
```

### Endpoints de API (Canais IPC)

- **`export:annual-position`**
  - Input: `{ year: number }`
  - Ação: Pede o salvamento de um `.xlsx` nativamente (`dialog`). Se o usuário cancelar retorna falso. Caso passe um caminho, é enviado para `ExportAnnualPositionUseCase.execute({ targetYear, filePath })`.
  - Retorno: Sucesso confirmando dados e volume extraído `ExportAnnualPositionOutput`.

## Pontos de Integração

Não haverá integrações remotas além de dependências sistêmicas internas. É necessário e dependente da biblioteca nativa utilitária de extração `xlsx` (SheetJs, já no projeto) injetada através do container IoC interno da aplicação awilix.

## Abordagem de Testes

### Testes Unidade

- **`ExportAnnualPositionUseCase`**: Mock das respostas dos *repositories* para simular um cenário misto em que ativos com `quantity === 0`, ou preços não validáveis existam na simulação, atestando de que a chamada do mock de `ConsolidatedPositionExporterPort` não irá exportar quantidades iguais (ou menores) que 0.
- **`SheetJsConsolidatedPositionExporter`**: Teste de validação que checa o mapeamento correto dos cabeçalhos requeridos como colunas base (`Ticker`, `Quantidade`, `Preco Medio`, `Corretora`) sem acoplamento à dados concretos da camada.

### Testes de Integração

- **Handlers/Controllers**: Teste de ponta a ponta do processo `Main` do IPC com container real `awilix` mockando apenas a janela nativa do Electron e checando na ramificação de `Output` de que um arquivo fictício local simulado teria a requisição efetivada.

### Testes de E2E

- Teste o frontend junto com o backend usando o Playwright: simular acesso na interface da nova aba de exportação e a seleção do ano interativamente, observando que os loaders ou dialogs simulados terminem a ação retornando UI de sucesso.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Porta & Infra:** Definição da interface `ConsolidatedPositionExporterPort` e criação de `SheetJsConsolidatedPositionExporter` (lidando com API pura do XLSX).
2. **Casos de Uso:** Implementar e cobrir `ExportAnnualPositionUseCase` com unit-tests validando logic rules de omissões (zeros).
3. **Controladores e IoC:** Expor canais em `export.controller.ts`, com a injeção via `container/index.ts` e tratar o path `showSaveDialog`.
4. **Renderer / UI:** Início do frontend com a tela de Exportação usando seletores padronizados existentes, e ligações IPC.

### Dependências Técnicas

- Modificação da montagem do content provider `container/index.ts` é bloqueante e necessária de antemão. O Controller só será resolvido no router root do IPC com isso.

## Monitoramento e Observabilidade

Logs de erro vindos das promises do controller de IPC e falhas no adapter XLS devem repassar para a UI instâncias legíveis como por exemplo _toast_ banners com o motivo da exceção.

## Considerações Técnicas

### Decisões Principais

- **Segregação de UseCase vs Duplicação Repositories:** Opções avaliadas entre o chamar `ListPositionsUseCase` ou instanciar calls nos repositórios. Conforme os bons princípios da _Clean Architecture_ do projeto, um Use Case não foi feito para consumir outro caso de uso (para evitar acoplamentos imprevistos), então a extração lidará puramente via `AssetPositionRepository` e `BrokerRepository` reconstruindo localmente o que precisa em formato linear de "rows".
- **Comunicação por File System Integrada no Backend:** É estritamente performático e seguro processar instâncias de arquivos, buffers ou blobs nativos no framework Electron usando `Main/Backend Context` e `fs`, retornando apenas feedbacks simples ao cliente (Renderer) isolando-o de detalhes da máquina nativa do usuário.

### Riscos Conhecidos

- Mapeamento dinâmico fraco em corretoras que perderam os IDs e constam "desconhecidas" no repository poderão poluir o preenchimento da coluna "Corretora", o qual forçara uma injeção explícita "Não Identificada" ou erro na simulação se o parser recusar dados não preenchidos em uma retroalimentação. O tratamento da validação será blindado. 

### Conformidade com Padrões

Conformidade checada via `architecture.mdc`:
- **Domain Layer Isolation**: Não vaza objetos de domínio nem dados parciais sujos até a infra.
- **Application Layer**: Todos os casos de uso mantêm estruturas divididas na hierarquia esperada (Pastas com nome verbal ex: `[verbo]-[objeto]`).
- **Dependencies Mapping**: A interface UI se atrela apenas à interfaces de repositórios/portas, invertendo controle para injeção e isolando a biblioteca primária `SheetJS`. Todo arquivo aderirá as nomeclaturas `.port.ts` ou `.use-case.ts`.

### Arquivos relevantes e dependentes

- `src/main/application/interfaces/consolidated-position-exporter.port.ts` [NEW]
- `src/main/infrastructure/exporters/sheetjs-consolidated-position-exporter.ts` [NEW]
- `src/main/application/use-cases/export-annual-position/export-annual-position.input.ts` [NEW]
- `src/main/application/use-cases/export-annual-position/export-annual-position.output.ts` [NEW]
- `src/main/application/use-cases/export-annual-position/export-annual-position-use-case.ts` [NEW]
- `src/main/ipc/controllers/export.controller.ts` [NEW]
- `src/main/infrastructure/container/index.ts` [MODIFY]
- `src/renderer/pages/ExportPositionPage.tsx` [NEW]
