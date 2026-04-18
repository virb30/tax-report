# Tarefa 7.0: Adapters de Infraestrutura para Relatório de IR (MVP)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar adapters de infraestrutura necessários para o fluxo do relatório anual de IR, conectando os ports da aplicação ao SQLite/Knex e aos parsers de importação. Esta tarefa depende da 6.0, mas as subtarefas de parser podem evoluir em paralelo com contratos de UI da 8.0 após fechamento dos DTOs.

<requirements>
- Implementar adapters de repositório para ports de aplicação
- Implementar parser modular por strategy para notas e movimentações
- Validar e normalizar dados de entrada antes de persistir
- Entregar somente integrações necessárias para o MVP de relatório (sem dependência de cálculo DARF)
- Cobrir integração parser -> use case -> repositório com testes
</requirements>

## Subtarefas

- [x] 7.1 Implementar adapters de persistência para `assets` e `operations` do fluxo MVP
- [x] 7.2 Implementar mapeadores row <-> domínio nos adapters
- [x] 7.3 Implementar parser CSV/XLSX com validação de template
- [x] 7.4 Implementar estratégia de seleção de parser por corretora e tipo de arquivo
- [x] 7.5 Implementar idempotência de importação e rastreabilidade por lote
- [x] 7.6 Definir contratos de consulta para posição em 31/12 e discriminação do relatório
- [x] 7.7 Criar testes de unidade para mapeadores e validações de parser
- [x] 7.8 Criar testes de integração de ingestão completa com persistência

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Infrastructure Layer"**, **"Pontos de Integração"**, **"Modelos de Dados"**, **"Abordagem de Testes"** (integração) e **"Sequenciamento de Desenvolvimento"** (item 5). Consulte no `prd.md` os requisitos RF-03 a RF-11, RF-29 a RF-32 e RF-33 a RF-35.

## Critérios de Sucesso

- Ports de aplicação conectados a adapters concretos sem acoplamento indevido
- Fluxo de importação aceita arquivos válidos e rejeita entradas inválidas com erro claro
- Dados importados ficam persistidos com rastreabilidade e sem duplicação indevida
- Integração técnica pronta para exposição via IPC do relatório anual no MVP

## Testes da Tarefa

- [x] Testes de unidade (mapeadores, validação e seleção de parser)
- [x] Testes de integração (parser + use case + repositório)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/infrastructure/persistence/`
- `src/main/infrastructure/parsers/`
- `src/main/database/`
