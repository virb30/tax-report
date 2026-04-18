# Tarefa 3.0: Controladores IPC e Injeção de Dependência

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Resolver os conectivos do Backend configurando canais IPC seguros e promovendo as dependências no contêiner IoC. O controller capturará a negociação nativa do diálogo "Salvar como" do sistema operacional.

<requirements>
- Lide com requisições originárias de canais nativos do Electron chamando o `dialog.showSaveDialog` para obter o destino salvamento.
- Cancele a execução passivamente caso o usuário recuse (feche) o diálogo do SO sem emitir `throws`.
- Injetar no root das rotas Awilix (`container/index.ts`).
</requirements>

## Subtarefas

- [ ] 3.1 Registrar na injeção de dependência via Awilix (`container/index.ts`) as conexões da camada de porta para `SheetJsConsolidatedPositionExporter` e injetar o novo *Use Case*.
- [ ] 3.2 Criar `ExportController` para ser acessado via canal/handler de nome forte `export:annual-position`.
- [ ] 3.3 Implementar o `showSaveDialog` no Main Process recebendo `{ year }` e engatilhando a execução se bem-sucedido.
- [ ] 3.4 Escrever integração na camada *Main*.

## Detalhes de Implementação

Referenciar: **Endpoints de API (Canais IPC)** e **Abordagem de Testes** da `techspec.md`.

## Critérios de Sucesso

- Invocar o canal via IPC processando com contêiner autônomo sem side-effects visuais errôneos.
- Logs e rastreabilidade dos *errors* propagados caso haja falha ou colisão no path.

## Testes da Tarefa

- [ ] Testes de unidade
- [x] Testes de integração

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/ipc/controllers/export.controller.ts`
- `src/main/infrastructure/container/index.ts`
- Suite de integração na subpasta associada IPC.
