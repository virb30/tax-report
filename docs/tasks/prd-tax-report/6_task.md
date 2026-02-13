# Tarefa 6.0: Application Layer, Ports e Contratos Compartilhados

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a camada de aplicação com casos de uso e ports explícitos, além de evoluir contratos compartilhados para tipar a comunicação entre `main`, `preload` e `renderer`. Esta tarefa depende da 5.0 e prepara a integração limpa com infraestrutura e interface.

<requirements>
- Criar ports de entrada/saída para repositórios e parsers
- Implementar casos de uso: importação, base manual, listagem de posições, apuração mensal e relatório anual
- Garantir que casos de uso orquestrem domínio sem regra tributária embutida
- Evoluir contratos compartilhados em `src/shared/` alinhados aos DTOs da aplicação
- Garantir compatibilidade de payloads para IPC da tarefa 8.0
- Cobrir orquestração com testes de unidade e integração de contratos
</requirements>

## Subtarefas

- [ ] 6.1 Definir ports de aplicação para persistência e parsing
- [ ] 6.2 Implementar `ImportOperationsUseCase`
- [ ] 6.3 Implementar `SetManualBaseUseCase` e `ListPositionsUseCase`
- [ ] 6.4 Implementar `AssessMonthlyTaxesUseCase`
- [ ] 6.5 Implementar `GenerateAssetsReportUseCase`
- [ ] 6.6 Evoluir contratos compartilhados em `src/shared/contracts` e tipos correlatos
- [ ] 6.7 Criar testes de unidade dos casos de uso com ports mockados
- [ ] 6.8 Criar testes de integração de contratos entre aplicação e interfaces

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Interfaces Principais"**, **"Modelos de Dados"**, **"Endpoints de API"** (IPC tipado) e **"Sequenciamento de Desenvolvimento"** (ordem de construção item 4). Consulte no `prd.md` os requisitos RF-01 a RF-32 relacionados aos fluxos.

## Critérios de Sucesso

- Casos de uso implementados e isolados de detalhes de infraestrutura
- Ports explícitos habilitam troca de adapters sem alteração no núcleo da aplicação
- Contratos compartilhados tipados e consistentes com payloads de IPC
- Orquestração validada por testes sem regressão das regras de negócio

## Testes da Tarefa

- [ ] Testes de unidade (casos de uso com mocks de ports)
- [ ] Testes de integração (consistência dos contratos compartilhados)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/`
- `src/main/application/ports/`
- `src/shared/contracts/`
- `src/shared/types/domain.ts`
- `src/shared/types/electron-api.ts`
