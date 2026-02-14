# Tarefa 11.0: Importação via Seleção de Arquivo + Modelo de Planilha na Tela

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Padronizar a experiência de importação para seleção explícita de arquivo via dialog e disponibilizar, na tela de importação, um modelo claro para preenchimento da planilha. O objetivo é reduzir erros de entrada e acelerar o onboarding do usuário no fluxo de ingestão.

<requirements>
- Importação deve ser iniciada por seleção de arquivo via dialog nativo
- Fluxo deve validar extensão/tipo de arquivo suportado antes do processamento
- Tela de importação deve exibir modelo com colunas obrigatórias e opcionais
- Modelo deve incluir: `data da operação`, `ticker`, `quantidade`, `valor unitário`, `valor total`, `custo operacional total (opcional)`
- Validação deve identificar erros de formato e orientar correção ao usuário
- Fluxo deve manter confirmação pré-importação com preview dos dados lidos
- Cobrir fluxo com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 11.1 Implementar/ajustar ação de selecionar arquivo via dialog no renderer/main
- [ ] 11.2 Validar tipo/extensão e tamanho básico do arquivo antes do parse
- [ ] 11.3 Exibir na tela o modelo de planilha com colunas obrigatórias e opcionais
- [ ] 11.4 Ajustar parser/normalização para aceitar o layout: data, ticker, quantidade, valor unitário, valor total, custo operacional total (opcional)
- [ ] 11.5 Exibir preview dos dados e mensagens de erro acionáveis para linhas inválidas
- [ ] 11.6 Manter confirmação explícita antes da persistência da importação
- [ ] 11.7 Criar testes de unidade (schema/validação/mapeamento de colunas)
- [ ] 11.8 Criar testes de integração (dialog -> preview -> confirmação -> persistência)

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Pontos de Integração"** (arquivos locais e IPC), **"Fluxo principal de dados"** e **"Abordagem de Testes"**. Consulte no `prd.md` os requisitos RF-08 a RF-11 e os requisitos de UX para feedback claro após importação.

## Critérios de Sucesso

- Usuário seleciona arquivo via dialog e conclui importação sem caminho manual
- Modelo de planilha está visível na tela de importação com colunas corretas
- Erros de formato retornam mensagens claras e específicas por campo/linha
- Fluxo completo validado por suíte de unidade e integração

## Testes da Tarefa

- [ ] Testes de unidade (schema, mapeamento e validação de planilha)
- [ ] Testes de integração (seleção de arquivo, preview, confirmação e persistência)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/`
- `src/main/application/ports/`
- `src/main/infrastructure/parsers/`
- `src/main/ipc/handlers/`
- `src/preload.ts`
- `src/renderer/`
- `src/shared/contracts/`
