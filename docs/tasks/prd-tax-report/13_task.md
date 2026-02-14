# Tarefa 13.0: Fluxo de Posição Inicial e Gestão de Carteira por Planilha (Bootstrap + Upsert)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Garantir a jornada inicial de carteira no MVP: ao abrir o app, o sistema detecta se existem ativos na base; sem ativos, orienta a importação de planilha de posição atual; com ativos, apresenta tabela com `ticker`, `quantidade`, `preço médio` e `total` calculado. A tarefa também cobre edição manual de preço médio, exclusão de ativo e reimportação com upsert por ticker.

<requirements>
- Detectar no carregamento da tela se a base possui ativos cadastrados
- Exibir estado vazio com CTA para importar planilha quando não houver ativos
- Aceitar planilha de posição atual com colunas mínimas: `ticker`, `quantidade`, `preço médio` (opcional)
- Persistir importação inicial criando posições para os tickers recebidos
- Exibir tabela de posições quando houver dados, incluindo coluna `total = preço médio x quantidade`
- Permitir edição manual de preço médio com impacto nos cálculos posteriores
- Permitir exclusão de ativo da base pela tela de posições
- Permitir nova importação com regra de upsert: atualizar tickers existentes e criar tickers ausentes
- Cobrir toda a jornada com testes de unidade e integração
</requirements>

## Subtarefas

- [ ] 13.1 Definir contrato de consulta de estado inicial da carteira (base vazia vs base preenchida)
- [ ] 13.2 Implementar caso de uso de importação de posição atual por planilha com validação de colunas mínimas
- [ ] 13.3 Implementar estratégia de upsert por `ticker` para reimportações de planilha
- [ ] 13.4 Implementar caso de uso para edição manual de preço médio com persistência imediata
- [ ] 13.5 Implementar caso de uso para exclusão de ativo da carteira
- [ ] 13.6 Expor handlers IPC e contratos compartilhados para listar posições, importar, editar e excluir
- [ ] 13.7 Implementar UI de estado vazio com CTA de importação e feedback de validação
- [ ] 13.8 Implementar UI da tabela de posições com colunas `ticker`, `quantidade`, `preço médio` e `total`
- [ ] 13.9 Criar testes de unidade dos casos de uso (validação, upsert, edição e exclusão)
- [ ] 13.10 Criar testes de integração da jornada completa (primeira carga e reimportação)

## Detalhes de Implementação

Consulte na `techspec.md` as seções **"Fluxo principal de dados"** (IPC tipado entre renderer e main), **"Modelos de Dados"** (`AssetPosition` e DTOs de aplicação), **"Abordagem de Testes"** (unidade e integração) e **"Sequenciamento de Desenvolvimento"** (integração e E2E). Consulte no `prd.md` os requisitos RF-12 a RF-15, RF-29, RF-33 a RF-35 e os requisitos de UX do fluxo principal.

## Critérios de Sucesso

- Ao abrir o sistema sem ativos cadastrados, a UI exibe estado vazio com opção de importação de planilha
- Ao abrir o sistema com ativos cadastrados, a UI exibe tabela com os campos esperados e total calculado por linha
- Importação inicial insere posições corretamente a partir da planilha válida
- Reimportação aplica upsert corretamente: atualiza tickers existentes e cria novos tickers
- Edição manual de preço médio e exclusão de ativo funcionam e persistem sem inconsistência
- Jornada completa validada por suíte de unidade e integração

## Testes da Tarefa

- [ ] Testes de unidade (validação de planilha, cálculo de total exibido, regras de upsert, edição e exclusão)
- [ ] Testes de integração (carregamento inicial, importação com base vazia, reimportação com base preenchida)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `src/main/application/use-cases/`
- `src/main/application/ports/`
- `src/main/infrastructure/persistence/`
- `src/main/ipc/handlers/`
- `src/renderer/`
- `src/shared/contracts/`
