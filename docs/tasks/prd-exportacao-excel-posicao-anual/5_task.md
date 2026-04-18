# Tarefa 5.0: Validação e Garantia de Qualidade (QA Execution)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Ao concluir a implementação (backend e frontend) descrita nas tarefas anteriores detalhadamente, é obrigatório executar a fase final de testes de aceitação global, garantindo assim comportamentos end-to-end integrados contra todas as premissas estabelecidas do projeto. Você deve invocar e rodar os processos de garantia de qualidade usando estritamente a skill especializada em "execução de QA".

<requirements>
- É OBRIGATÓRIO invocar e executar a skill `@qa-execution` (localizada em `.agents/skills/qa-execution/SKILL.md`) garantindo a validação de rotinas reais de usuário e assegurando estabilidade na branch atual sem que haja a quebra de outras features pelo _side effect_.
- Nenhum push ou declaração final de entrega deve ser feito se não existirem logs afirmativos resultantes do processamento total ou se o lint não estiver verde em conformidade com as regras (ex: Clean Architecture, separação Electron).
</requirements>

## Subtarefas

- [ ] 5.1 Invocar explicitamente a skill `/qa-execution` instruindo-a a rodar o pipeline completo local com foco em testar o processo IPC do `ExportAnnualPositionUseCase` e a respectiva renderização visual do frontend.
- [ ] 5.2 Avaliar e corrigir retroativamente caso ocorram falhas de build de tipagens cruzadas entre as interfaces Main vs Renderer, reportadas pelo log da rotina de QA.
- [ ] 5.3 Assegurar a aprovação dos testes E2E do sistema. Repare qualquer _failing spec_ que quebre testes antigos e do fluxo atual antes de encerrar.

## Detalhes de Implementação

Referenciar: Utilize a skill `/qa-execution` (`.agents/skills/qa-execution`) e atrele suas asserções às expectativas descritas no PRD. Não force ou suprima erros ignorando dependências corrompidas do SheetJs (XLSX).

## Critérios de Sucesso

- O log final da execução aponta verde para Linter (`eslint`, `tsc`), Unitários (`jest`), e a verificação Build (`electron-builder` & `vite`).
- Todas as anomalias detectadas que possuam referências diretas à implementação (Task 1 a 4) foram refatoradas e resolvidas estruturalmente durante a fase de verificação.

## Testes da Tarefa

- [x] Testes de unidade
- [x] Testes de integração / E2E de Pipeline Global

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `.agents/skills/qa-execution/SKILL.md`
