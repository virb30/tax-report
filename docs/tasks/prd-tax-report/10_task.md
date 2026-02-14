# Tarefa 10.0: Relatório por Data da Posição + Ajustes de UX e Discriminação

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Ajustar o relatório de Bens e Direitos para usar explicitamente a data da posição informada na base e consolidar ajustes de experiência e linguagem fiscal na UI: esconder o botão `Apuração mensal`, trocar `Average Cost` por `preço médio` e padronizar moeda com símbolo `R$` em vez de `BRL`.

<requirements>
- Relatório de Bens e Direitos deve buscar posição pela data de referência selecionada
- Texto de discriminação deve refletir a data da posição usada no cálculo
- Remover/ocultar botão `Apuração mensal` da UI do escopo atual
- Substituir rótulo `Average Cost` por `preço médio` em todas as telas relevantes
- Padronizar moeda para `R$` no lugar de `BRL` nos textos e exibições
- Garantir consistência de labels e formatação no renderer e nos builders de texto
- Cobrir ajustes com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 10.1 Ajustar query/caso de uso do relatório para consumir posição por data de referência
- [ ] 10.2 Ajustar builder de discriminação para refletir data da posição no conteúdo final
- [ ] 10.3 Ocultar botão `Apuração mensal` no fluxo de navegação vigente
- [ ] 10.4 Padronizar textos de custo médio: `Average Cost` -> `preço médio`
- [ ] 10.5 Padronizar exibição monetária: `BRL` -> `R$`
- [ ] 10.6 Validar consistência de labels em preload/IPC/shared contracts quando aplicável
- [ ] 10.7 Criar testes de unidade (builder de texto e formatadores)
- [ ] 10.8 Criar testes de integração/UI (data no relatório, botão oculto e textos atualizados)

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Fluxo principal de dados"** (IPC tipado), **"Modelos de Dados"** (`AssetPosition` e DTOs de relatório) e **"Abordagem de Testes"**. Consulte no `prd.md` os requisitos RF-29 a RF-32, objetivos de UX e critérios de clareza de mensagens.

## Critérios de Sucesso

- Relatório anual retorna valores coerentes com a data de posição selecionada
- Discriminação exibida usa terminologia em português e moeda padronizada com `R$`
- Botão `Apuração mensal` não aparece no fluxo atual da interface
- Ajustes validados por suíte de unidade e integração/UI

## Testes da Tarefa

- [ ] Testes de unidade (builder de discriminação, labels e formatadores monetários)
- [ ] Testes de integração (relatório por data + validação de UI e textos)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/`
- `src/main/ipc/handlers/`
- `src/main/infrastructure/persistence/`
- `src/renderer/`
- `src/shared/contracts/`
- `src/shared/types/`
