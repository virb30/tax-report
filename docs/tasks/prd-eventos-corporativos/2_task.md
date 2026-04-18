# Tarefa 2.0: Suporte para Operações Matemáticas (Desdobramento e Grupamento)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar suporte transacional passivo para escalar quantidades através de desdobramentos (Split) e grupamentos (ReverseSplit), alterando a quantidade sob a custódia, mantendo firmemente o Custo Total inalterado e redistribuindo o Preço Médio.

<requirements>
- `applySplit` deve empilhar a quantidade submetendo um fator multiplicador (extraído pelo campo nativo).
- `applyReverseSplit` deve reduzir a quantidade utilizando fator matemático `Math.floor(quantity / ratio)`, lidando com o arredondamento natural em favor do inteiro menor (imitando leilão fracionado da B3).
- As operações matemáticas sob hipótese alguma podem causar distorção no saldo monetário (`totalCost`), devendo o PM oscilar isoladamente.
</requirements>

## Subtarefas

- [ ] 2.1 Implementar `applySplit` em `AssetPosition` que multiplique condicionalmente a quantidade embasado no ratio alocado.
- [ ] 2.2 Implementar `applyReverseSplit` em `AssetPosition` processando o corte e arredondamento `Math.floor`.
- [ ] 2.3 Adequar `PositionCalculatorService` (e demais ramificações dos serviços atrelados) provendo total compatibilidade e fluxo.

## Detalhes de Implementação

- Seguir a fundação estabelecida na `techspec.md`, que prioriza isolar o recálculo em favor do `quantity` das Transações ditando o comportamento dos sub-lotes e recaindo numa divisão passiva.

## Critérios de Sucesso

- Garantia absoluta de testes comprovando: Uma custódia de 10 ações a PM R$10 (Custo R$100). Em caso de *Desdobramento* Ratio=2: Saldo Fica 20 ações, PM R$5, Custo Cobre R$100.
- Outro Teste: Um ativo de 109 ações sofrendo *Grupamento* em Ratio 10: Fica suportando saldo exato de 10 ações alocadas na corretora. (As 9 residuais seriam perdidas pelo truncamento com o Math floor), PM sobe proporcionalmente.

## Testes da Tarefa

- [ ] Testes de unidade em mock da Entidade medindo os desdobramentos lógicos garantido proteção do custo contábil do usuário.
- [ ] Testes da integridade de frações usando assert de agrupamentos que causem dízimas periódicas contornadas via `Math.floor`.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/domain/portfolio/entities/asset-position.entity.ts`
- `src/main/domain/portfolio/services/position-calculator.service.ts`
