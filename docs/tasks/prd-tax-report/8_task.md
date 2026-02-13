# Tarefa 8.0: IPC, Preload Seguro e UI para Geração do Relatório (MVP)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Conectar a interface do usuário aos casos de uso por meio de IPC tipado e preload seguro, implementando os fluxos de importação, conferência, gestão de base manual e geração do relatório anual de Bens e Direitos. Esta tarefa depende da 7.0 e mantém fora do MVP a tela de apuração mensal de DARF.

<requirements>
- Criar handlers `ipcMain.handle` para os casos de uso definidos na aplicação
- Expor API segura no preload com canais explícitos (allowlist)
- Integrar telas do renderer aos contratos compartilhados tipados
- Implementar fluxo de importação com conferência e confirmação
- Implementar fluxo de gestão manual de posição/preço médio
- Implementar fluxo de visualização e cópia do relatório anual de Bens e Direitos
- Marcar explicitamente dependências com tarefa 6.0 e 7.0 e paralelismo possível na construção de componentes de UI
- Cobrir com testes de integração IPC e E2E dos fluxos principais
</requirements>

## Subtarefas

- [ ] 8.1 Implementar handlers IPC para importação, portfolio e report
- [ ] 8.2 Atualizar `preload.ts` com API segura e tipada
- [ ] 8.3 Integrar tela de importação de arquivos e conferência pré-confirmação
- [ ] 8.4 Integrar tela de base manual e listagem de posições
- [ ] 8.5 Integrar tela de relatório anual com botão de cópia por ativo/campo
- [ ] 8.6 Tratar erros de domínio e validação com feedback acionável na UI
- [ ] 8.7 Criar testes de integração dos canais IPC
- [ ] 8.8 Criar testes E2E dos fluxos de UI críticos do MVP

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Fluxo principal de dados"**, **"Endpoints de API"** (IPC), **"Pontos de Integração"** (contextBridge/allowlist), **"Abordagem de Testes"** (E2E) e **"Sequenciamento de Desenvolvimento"** (itens 4 e 7). Consulte no `prd.md` os requisitos RF-01, RF-02, RF-05, RF-10, RF-12 a RF-15 e RF-29 a RF-32.

## Critérios de Sucesso

- Renderer acessa funcionalidades apenas via API segura do preload
- Fluxos de importação, base manual e relatório anual executam ponta a ponta
- Erros relevantes são exibidos com mensagens claras para o usuário
- Integração entre UI e casos de uso validada por testes automáticos

## Testes da Tarefa

- [ ] Testes de unidade (componentes e adaptadores de UI com mocks)
- [ ] Testes de integração (IPC main/preload/renderer)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/ipc/handlers/`
- `src/preload.ts`
- `src/renderer/`
- `src/shared/contracts/`
