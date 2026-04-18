# Tarefa 1.0: Infraestrutura e Porta de Exportação

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a camada fundacional (Infraestrutura) e sua respectiva interface (Porta) responsável pela geração nativa de arquivos Excel `.xlsx`. O foco aqui é estabelecer o contrato base `ConsolidatedPositionExporterPort` e construir um adaptador limpo usando a biblioteca SheetJS já presente no projeto.

<requirements>
- A porta deve suportar formatação tabular usando os cabeçalhos fixados (`Ticker`, `Quantidade`, `Preco Medio`, `Corretora`).
- O adaptador infraestrutural (`SheetJsConsolidatedPositionExporter`) não pode acoplar-se à lógica de negócio, apenas injetar colunas corretamente.
</requirements>

## Subtarefas

- [ ] 1.1 Criar a interface `ConsolidatedPositionExporterPort` e tipos necessários (`ExportablePositionRow`).
- [ ] 1.2 Implementar a classe `SheetJsConsolidatedPositionExporter` no módulo de `infrastructure/exporters` que satisfaça a interface e produza os `.xlsx`.
- [ ] 1.3 Criar os testes unitários para o `SheetJsConsolidatedPositionExporter`.

## Detalhes de Implementação

Referenciar: **Design de Implementação -> Interfaces Principais** e **Arquivos relevantes e dependentes** no `techspec.md`.

## Critérios de Sucesso

- Dados mocados resultam na correta exibição dos 4 cabeçalhos esperados.
- Testes endossam a compatibilidade do formato das células sem erro estático do TypeScript.

## Testes da Tarefa

- [x] Testes de unidade
- [ ] Testes de integração

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/interfaces/consolidated-position-exporter.port.ts`
- `src/main/infrastructure/exporters/sheetjs-consolidated-position-exporter.ts`
- Modificações de testes no diretório `__tests__` respectivo infra/export.
