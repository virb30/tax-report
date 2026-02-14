# Tarefa 9.0: Gestão de Base Manual por Data + Migração entre Anos

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Consolidar em uma única entrega o fluxo de base manual com referência temporal: registrar posição com data de corte (ex.: `31/12/2024` e `31/12/2025`), manter histórico por data e oferecer migração de base entre anos para acelerar o início do novo ciclo de preenchimento e cálculos.

<requirements>
- Permitir registrar e persistir base manual com `data da posição` obrigatória
- Permitir selecionar e consultar base manual por data de referência
- Garantir consistência de domínio ao editar/excluir base manual datada
- Disponibilizar ação para importar/migrar base de um ano para outro
- Evitar duplicidade de base para mesmo ativo/corretora/data de posição
- Exibir feedback claro de sucesso/erro no fluxo de migração
- Cobrir o fluxo com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 9.1 Evoluir modelo de dados/contratos para suportar `data da posição`
- [ ] 9.2 Ajustar caso de uso de base manual para criar/editar/excluir por data de referência
- [ ] 9.3 Implementar consulta de base por data para consumo da aplicação
- [ ] 9.4 Implementar caso de uso de migração de base entre anos
- [ ] 9.5 Definir validações de duplicidade e conflitos de data no fluxo de migração
- [ ] 9.6 Expor handlers IPC e contratos compartilhados para operações de base datada e migração
- [ ] 9.7 Ajustar UI para seleção da data de posição e ação de migração
- [ ] 9.8 Criar testes de unidade (regras de data, consistência e migração)
- [ ] 9.9 Criar testes de integração ponta a ponta da jornada de base manual e migração

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Modelos de Dados"** (`AssetPosition`), **"Fluxo principal de dados"** (IPC tipado), **"Abordagem de Testes"** e **"Sequenciamento de Desenvolvimento"**. Consulte no `prd.md` os requisitos RF-12 a RF-15, RF-33 a RF-35 e os critérios de UX para mensagens acionáveis.

## Critérios de Sucesso

- Usuário consegue registrar base manual com data de posição explícita
- Migração de base entre anos ocorre sem perda de consistência de quantidade e preço médio
- Sistema bloqueia duplicidades por ativo/corretora/data com mensagem clara
- Fluxo completo validado por suíte de unidade e integração

## Testes da Tarefa

- [ ] Testes de unidade (validações de data, duplicidade, regras de migração)
- [ ] Testes de integração (persistência, consulta por data e migração entre anos)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/portfolio/`
- `src/main/application/use-cases/`
- `src/main/application/ports/`
- `src/main/infrastructure/persistence/`
- `src/main/ipc/handlers/`
- `src/renderer/`
- `src/shared/contracts/`
