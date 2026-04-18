# Tarefa 2.0: Caso de Uso (Lógica de Aplicação)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Desenvolver o núcleo da regra de negócio que seleciona a posição consolidada das carteiras. O Use Case irá processar posições, limpar registros inadequados (que zeraram a quantidade) e injetar tudo pela porta estática.

<requirements>
- Filtro absoluto: ignorar e omitir da planilha qualquer item em corretora onde a quantidade (`quantity`) da posição respectiva se qualifique como `<=` 0.
- Evitar que lixo ou falhas de mapeamento preencha nulos nos metadados da Corretora.
</requirements>

## Subtarefas

- [ ] 2.1 Criar as DTOs `ExportAnnualPositionInput` e `ExportAnnualPositionOutput`.
- [ ] 2.2 Implementar o `ExportAnnualPositionUseCase` consumindo `AssetPositionRepository`, `BrokerRepository` e invertendo para o `ConsolidatedPositionExporterPort`.
- [ ] 2.3 Criar suite de testes simulando registros positivos e nulos garantindo eliminação de posições não úteis.

## Detalhes de Implementação

Referenciar: **Arquitetura do Sistema -> Camada de Aplicação (`ExportAnnualPositionUseCase`)** e **Modelos de Dados** da `techspec.md`.

## Critérios de Sucesso

- Cenários de negócio omitindo efetivamente posições cujo saldo é 0.
- Exportação flui limpa via mock infra.
- Arquivos nomeados segundo o padrão Clean Architecture `[verbo]-[objeto]`.

## Testes da Tarefa

- [x] Testes de unidade
- [ ] Testes de integração

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/export-annual-position/export-annual-position.input.ts`
- `src/main/application/use-cases/export-annual-position/export-annual-position.output.ts`
- `src/main/application/use-cases/export-annual-position/export-annual-position-use-case.ts`
