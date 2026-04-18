# Tarefa 6.0: Application Layer para Fluxo de Relatório de IR (MVP)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a camada de aplicação para o fluxo do relatório anual de IR, com casos de uso e ports explícitos para ingestão, atualização de posição e geração de Bens e Direitos. Esta tarefa depende da 5.0 e remove do escopo do MVP a apuração mensal de DARF/prejuízo acumulado.

<requirements>
- Criar ports de entrada/saída para repositórios e parsers
- Implementar casos de uso de importação, base manual, listagem de posições e geração de relatório anual
- Garantir que casos de uso orquestrem domínio sem regra tributária de DARF/prejuízo no MVP
- Evoluir contratos compartilhados em `src/shared/` alinhados aos DTOs da aplicação
- Garantir compatibilidade de payloads para IPC e UI da tarefa 8.0
- Definir claramente dependência com tarefa 7.0 e paralelismo com preparação de contratos de UI
- Cobrir orquestração com testes de unidade e integração de contratos
</requirements>

## Subtarefas

- [ ] 6.1 Definir ports de aplicação para persistência e parsing
- [ ] 6.2 Implementar `ImportOperationsUseCase`
- [ ] 6.3 Implementar `SetManualBaseUseCase` e `ListPositionsUseCase`
- [ ] 6.4 Implementar `GenerateAssetsReportUseCase` com posição em 31/12
- [ ] 6.5 Evoluir contratos compartilhados em `src/shared/contracts` e tipos correlatos
- [ ] 6.6 Definir contratos mínimos para IPC/UI da tarefa 8.0 (pode ocorrer em paralelo com 7.0)
- [ ] 6.7 Criar testes de unidade dos casos de uso com ports mockados
- [ ] 6.8 Criar testes de integração de contratos entre aplicação e interfaces

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Interfaces Principais"**, **"Modelos de Dados"**, **"Fluxo principal de dados"**, **"Endpoints de API"** (IPC tipado) e **"Sequenciamento de Desenvolvimento"** (item 4). Consulte no `prd.md` os requisitos RF-01 a RF-19 e RF-29 a RF-32.

## Critérios de Sucesso

- Casos de uso implementados e isolados de detalhes de infraestrutura
- Ports explícitos habilitam troca de adapters sem alteração no núcleo da aplicação
- Contratos compartilhados tipados e consistentes com payloads de IPC
- Orquestração validada por testes sem dependência de TaxCompliance no MVP

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
