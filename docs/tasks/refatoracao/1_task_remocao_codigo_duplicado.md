# Tarefa 1.0: Remoção de Código Duplicado e Adequação Arquitetural

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Com base na análise arquitetural realizada (Report 2026-04-18), verificou-se uma taxa de aproximadamente 4.2% de código duplicado no sistema, com maior concentração nas páginas de Interface do Usuário (UI) e helpers de setup para testes (Test Factories). 
Além da duplicação, foram identificados alguns *dead codes* (exports sem utilidade) que aumentam a complexidade do repositório, bem como *code smells* como *Magic Numbers* no modelo de domínio de `AssetPosition` e condicional excessiva/complexidade alta no `CsvXlsxTransactionParser`. O objetivo central dessa tarefa é fazer o refactoring dessas áreas críticas utilizando componentes comuns da interface e o padrão *Resource Factories*, diminuindo o custo de manutenção da aplicação sem agregar quebras comportamentais, visando aliviar cerca de 500 linhas de código.

<requirements>
- Extrair os componentes paralelos de lógica de modal e a respectiva renderização de campos que geram a duplicação entre `InitialBalancePage` e `PositionsPage` para um componente compartilhado reutilizável na UI.
- Extrair os componentes comuns referentes à *loading states* (estados de carregamento) e áreas de feedback entre `MigrateYearModal` e `ImportConsolidatedPositionModal` para criar um componente renderizável isolado.
- Criar a factory chamada `SpreadsheetTestFactory` para abstrair as instanciações de planilhas repetitivas que se encontram em clonagem no arquivo `sheetjs.spreadsheet.file-reader.spec.ts`.
- Remover a redundância gerada nos blocos de setup (repetição do lifecycle inicial) dentro da respectiva suite de teste em `app-lifecycle.test.ts`.
- Excluir os 4 *dead exports* mapeados na análise: `RevenueClassification` de `assets-report.contract.ts`, `BrokerBreakdownItem` de `list-positions.contract.ts`, `Asset` e `Operation` de `types/domain.ts` (verificando antes se podem ser desfeitos da API pública).
- Alterar o `AssetPosition` subtituindo o *magic number* `1e-9` do seu `Math.abs(breakdownSum - this._totalQuantity) > 1e-9` pelo uso apropriado da sintaxe de tolerância/margem ou exportá-la como constante de contexto (`EPSILON`).
- Refatorar o `CsvXlsxTransactionParser`, diminuindo sensivelmente a quantidade alta de declarações `if` (23 declaradas), mapeando um objeto ou strategy (ex: object hash map da B3 Bovespa para tipos de operação). Nomes de varíaveis pobres como `num` e `str` no Date Parser também devem ser melhoradas para nomes descritivos.
- Assegurar que os testes continuem passando de forma completa após as mudanças de arquitetura com a ausência e limpeza dos arquivos inutilizados.
- Não introduzir dependências cíclicas entre o parser modificado ou o compartilhamento de UI das telas de contexto.
</requirements>

## Subtarefas

- [ ] 1.1 Limpeza de Dead Code: Remover e checar utilidade de exportações ociosas em `assets-report.contract.ts`, `list-positions.contract.ts` e em `types/domain.ts`.
- [ ] 1.2 Refactor de UI (Páginas Primárias): Extrair base comum entre `InitialBalancePage.tsx` e `PositionsPage.tsx` criando novos componentes padrão para os modais, importando aos componentes de ambas as páginas originais.
- [ ] 1.3 Refactor de UI (Modais): Analisar e separar logicamente os blocos similares de *feedback state* (erros, alertas) e de *loading status* (spinners) de `MigrateYearModal.tsx` e `ImportConsolidatedPositionModal.tsx` para componente isolado e enjertar nas janelas.
- [ ] 1.4 Refatoração de Code Smells: Identificar a redundância de condicionais em `CsvXlsxTransactionParser` e substituir seu fluxo de execução para a estrutura de *Strategy Pattern* ou dicionário de mapeamento local, juntamente da renomeação das variáveis pobres da engine de conversão de data, e embutir constante `EPSILON` em `AssetPosition`.
- [ ] 1.5 Padronização em Testes (Reader): Implementar classes utilitárias construtoras, tais como a `SpreadsheetTestFactory`, e unificar a inicialização de leitura do arquivo no ambiente de teste de `sheetjs.spreadsheet.file-reader.spec.ts`.
- [ ] 1.6 Padronização em Testes (Lifecycle): Refatorar a suite de testes `app-lifecycle.test.ts` e desassociar as etapas sobrepostas de beforeEach/setup de forma limpa.

## Detalhes de Implementação

Nesta tarefa, deve-se observar que o report arquitetural (`architectural-analysis-20260418.md.resolved`) atua de certa forma como nosso Tech Spec, descrevendo as anomalias onde os blocos de componentes foram construídos isoladamente no *renderer* ou repetitivamente na base *main*. Siga as filosofias contidas nas definições de Clean Architecture e de React para compilação local de UI. A nova implementação do parser `CsvXlsxTransactionParser` sugere o uso de map object patterns para remoção dos 23 "ifs" (por exemplo, criando constantes estáticas parciais com callbacks ou strings de mapeamento para tratar tipos de evento da B3).

## Critérios de Sucesso

- Total do repositório testado mantendo o coverage ou readequando as rotas da nova pipeline base `npm run test` e validando o `tsc`.
- Nenhuma variação do layout das páginas alteradas da aplicação no fluxo do Electron (Visual/Estético das páginas deve permanecer idêntico e consistente com o de antes ao interagir).
- Descarte de arquivos não necessários de export, sem falhas de sub-build por módulos perdidos do Main e de Infra.
- Redução explícita do LOC (Lines Of Code) em páginas e nos testes, correspondendo em particular a diminuição da poluição visual em mais de 500 linhas ao longo da master de análise.

## Testes da Tarefa

- [ ] Testes de unidade (Atualizar e reagrupar as suites de teste afetadas para utilizar a nova factory base, além de assegurar os cenários originais do parser de CSV e XLSX com todas ramificações recriadas em Hash maps e testar a precisão das contas refatoradas com uso explícito da constante Epsilon).
- [ ] Testes de integração (Certificar funcionalidade dos modais renderizados através das interfaces unificadas que usufruem do core uníssono da base).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/renderer/pages/InitialBalancePage.tsx`
- `src/renderer/pages/PositionsPage.tsx`
- `src/renderer/pages/ImportConsolidatedPositionModal.tsx`
- `src/renderer/components/MigrateYearModal.tsx`
- `src/main/infrastructure/adapters/file-readers/sheetjs.spreadsheet.file-reader.spec.ts`
- `src/main/infrastructure/parsers/csv-xlsx-transaction.parser.ts`
- `src/main/domain/portfolio/entities/asset-position.entity.ts`
- `src/main/app-lifecycle.test.ts`
- Contratos apontados com dead code em `src/shared/contracts/` e `src/shared/types/`
