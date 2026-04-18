# Tarefa 4.0: Frontend e Interface de Usuário

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Exibir interatividade e gatilhos correspondentes acionando a exportação XLS no frontend.

<requirements>
- Aba visível e desassociada focada puramente na opção "Exportar Posição Anual".
- Feedback em real-time: Em caso de falha ou caso o retorno de extração seja bem-sucedido, o cliente precisa reagir com um banner/toast de aviso adequado sem travar o aplicativo.
</requirements>

## Subtarefas

- [ ] 4.1 Adicionar tipagens da IPC API (`export:annual-position`) para o frontend lidar com promises e invocações do `invoke`.
- [ ] 4.2 Desenvolver a `ExportPositionPage` renderizando estado local e layout adequado do *PRD*.
- [ ] 4.3 Redirecionadores e ações injetadas nos Menus/Sidebars/Tabs do Frontend do React.
- [ ] 4.4 Escrever os blocos Playwright que testam de ponta a ponta chamadas na aba (com stubs se necessário para OS dialogs para não travar E2E container).

## Detalhes de Implementação

Referenciar: **Visão Geral -> Renderer** e **Experiência do Usuário** no `prd.md`.

## Critérios de Sucesso

- O usuário consegue acessar o botão via página e ao término recebe validação confirmada via Toast ou aviso visual amigável.
- Nenhum travamento IPC não administrado no processo principal bloqueando o renderer. 

## Testes da Tarefa

- [ ] Testes de unidade
- [x] Testes de integração (Playwright/E2E em App)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/renderer/pages/ExportPositionPage.tsx`
- Páginas da rota pai no Renderer.
- Sub-pasta de e2e testsPlaywright (`__tests__/e2e`).
