# Tarefa 3.0: Refatoração Arquitetural para DDD + Clean Architecture

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Refatorar o `main process` para o padrão definido na nova techspec, separando o código em camadas (`domain`, `application`, `infrastructure`, `ipc`) e bounded contexts (`Ingestion`, `Portfolio`, `TaxCompliance`). Esta tarefa cria a base estrutural para as próximas tarefas sem alterar regras de negócio do MVP.

<requirements>
- Estruturar diretórios e módulos conforme arquitetura da techspec
- Aplicar Dependency Rule (`infra -> application -> domain`)
- Isolar regras de negócio em `src/main/domain/`
- Criar anti-corruption layer para integrar código legado durante a transição
- Garantir que contratos de entrada/saída permaneçam compatíveis no fluxo principal
- Preparar base para ports explícitos usados nas tarefas 6.0 e 7.0
- Cobrir com testes de unidade e integração de fumaça após a refatoração
</requirements>

## Subtarefas

- [ ] 3.1 Mapear componentes atuais e definir plano de movimentação por contexto
- [ ] 3.2 Criar estrutura de pastas em `src/main/domain`, `src/main/application`, `src/main/infrastructure` e `src/main/ipc`
- [ ] 3.3 Extrair regras de domínio de `Portfolio` para camada de domínio
- [ ] 3.4 Extrair regras de domínio de `TaxCompliance` para camada de domínio
- [ ] 3.5 Implementar anti-corruption layer para adaptação gradual de repositórios legados
- [ ] 3.6 Ajustar imports/dependências para cumprir Dependency Rule
- [ ] 3.7 Executar testes de unidade de regressão do comportamento já implementado
- [ ] 3.8 Executar teste de integração de fumaça do fluxo principal existente

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Arquitetura do Sistema"**, **"Design de Implementação"** e **"Sequenciamento de Desenvolvimento"** (ordem de construção item 1). Consulte também o `prd.md` para preservar os requisitos funcionais já aprovados no MVP.

## Critérios de Sucesso

- Estrutura em camadas e contexts criada e utilizada no `main process`
- Regras de negócio desacopladas de Electron/Knex
- Fluxos já existentes continuam funcionais após a refatoração
- Dependências entre módulos respeitam a direção arquitetural definida

## Testes da Tarefa

- [ ] Testes de unidade (arquitetura e regressão de domínio existente)
- [ ] Testes de integração (smoke test do fluxo principal após refatoração)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/`
- `src/main/application/`
- `src/main/infrastructure/`
- `src/main/ipc/`
- `src/main/database/`
