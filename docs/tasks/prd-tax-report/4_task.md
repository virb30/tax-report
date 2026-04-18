# Tarefa 4.0: Domínio de Portfolio (Posição e Preço Médio)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o domínio de `Portfolio` com entidades, value objects e serviços de domínio para manter posição e preço médio incremental com invariantes explícitas. Esta tarefa depende da 3.0 e entrega o núcleo de consistência para operações de compra e venda.

<requirements>
- Implementar aggregate `AssetPosition` com invariantes de quantidade e preço médio
- Implementar value objects de domínio necessários para `Portfolio`
- Implementar `AveragePriceService` com cálculo incremental e custos proporcionais
- Garantir regra de venda sem alteração de preço médio unitário
- Garantir erro de domínio em venda sem posição/base válida
- Preparar contratos de saída para uso nos casos de uso da tarefa 6.0
- Cobrir cenários críticos com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 4.1 Definir entidades e value objects do contexto `Portfolio`
- [ ] 4.2 Implementar invariantes do aggregate `AssetPosition`
- [ ] 4.3 Implementar `AveragePriceService` para compra inicial e compra incremental
- [ ] 4.4 Implementar regra de venda com redução de quantidade sem alterar preço médio
- [ ] 4.5 Implementar validações de domínio para cenários inválidos
- [ ] 4.6 Criar testes de unidade para cenários de compra, venda e borda
- [ ] 4.7 Criar testes de integração do domínio com persistência in-memory

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Modelos de Dados"** (entidades e serviços de domínio), **"Abordagem de Testes"** (domínio) e **"Sequenciamento de Desenvolvimento"** (ordem de construção item 2). Consulte no `prd.md` os requisitos RF-16 a RF-19.

## Critérios de Sucesso

- Domínio de `Portfolio` implementado sem dependência de infraestrutura
- Cálculo de preço médio incremental reproduz comportamento esperado do PRD
- Invariantes de quantidade e preço médio impedem estados inválidos
- Interfaces de domínio prontas para orquestração na camada de aplicação

## Testes da Tarefa

- [ ] Testes de unidade (invariantes e cálculo incremental)
- [ ] Testes de integração (domínio + persistência in-memory)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/portfolio/`
- `src/shared/types/domain.ts`
