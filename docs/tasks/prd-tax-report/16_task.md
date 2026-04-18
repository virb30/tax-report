# Tarefa 16.0: Edição e Ativação/Desativação de Corretoras

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Estender a gestão de corretoras com duas funcionalidades: (1) **editar** dados de uma corretora existente (nome, CNPJ, código); (2) **ativar/desativar** corretoras. Corretoras inativas continuam visíveis na tela de corretoras (BrokersPage), mas **não aparecem nos seletores** de outras telas (ImportPage, InitialBalancePage). Ao final, o usuário consegue editar corretoras cadastradas e alternar o status ativo/inativo de cada uma.

<requirements>
- Edição de corretora: botão "Editar" na tabela; formulário para alterar nome, CNPJ e código; validações: nome não vazio, CNPJ único (exceto a própria), código único (exceto a própria)
- Campo `active` na entidade Broker e tabela `brokers` (boolean, default true)
- Botão "Ativar/Desativar" na BrokersPage por corretora; indicador visual (ex.: badge Ativa/Inativa)
- BrokersPage lista **todas** as corretoras (ativas e inativas)
- Seletores de corretora (ImportPage, InitialBalancePage) exibem **apenas corretoras ativas**
- Handler IPC: `brokers:update`, `brokers:toggle-active`; `brokers:list` com parâmetro opcional `activeOnly`
- Atualizar ManageBrokersUseCase com `update` e `toggleActive`; BrokerRepository com `findAllActive`
</requirements>

## Subtarefas

- [x] 16.1 Criar migração para adicionar coluna `active` (INTEGER 1/0, default 1) na tabela `brokers`.
- [x] 16.2 Atualizar entidade `Broker` e tipo `BrokerRecord` com campo `active: boolean`.
- [x] 16.3 Atualizar `BrokerRepositoryPort` e `KnexBrokerRepository`: adicionar `findAllActive(): Promise<BrokerRecord[]>`; garantir que `save` persista `active`; implementar `update` para edição parcial.
- [x] 16.4 Estender `ManageBrokersUseCase`:
  - `update(id, { name?, cnpj?, code? })`: validações de unicidade (CNPJ e código) excluindo o próprio registro; retorna sucesso ou erro.
  - `toggleActive(id)`: alterna `active` da corretora e persiste.
- [x] 16.5 Atualizar handler IPC e contratos:
  - `brokers:list` — aceitar payload opcional `{ activeOnly?: boolean }`; quando true, retornar apenas ativas.
  - `brokers:update` — payload `{ id, name?, cnpj?, code? }`.
  - `brokers:toggle-active` — payload `{ id }`.
- [x] 16.6 Atualizar preload e `electron-api.ts` com `updateBroker`, `toggleBrokerActive`, e `listBrokers({ activeOnly?: boolean })`.
- [x] 16.7 Atualizar BrokersPage:
  - Botão "Editar" por corretora → abre modal/form com dados atuais; ao salvar, chama `brokers:update`.
  - Coluna "Status" com badge Ativa/Inativa.
  - Botão "Ativar" ou "Desativar" por corretora → chama `brokers:toggle-active`.
  - Tabela exibe **todas** as corretoras (ativas e inativas).
- [x] 16.8 Atualizar ImportPage e InitialBalancePage: chamar `listBrokers({ activeOnly: true })` nos seletores de corretora, em vez de `listBrokers()` sem filtro.
- [x] 16.9 Atualizar composition root e registrar handlers.
- [x] 16.10 Testes de unidade e integração.

## Detalhes de Implementação

Consultar a seção **Entidade — Broker** e **BrokerRepositoryPort** da `techspec.md` e da `9_task.md`.

**Schema — coluna `active`:**

```sql
ALTER TABLE brokers ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
```

**Regras de negócio:**
- Edição: CNPJ e código devem ser únicos no sistema, exceto para o próprio registro que está sendo editado.
- Desativação: corretora inativa não é removida; transações e posições vinculadas permanecem válidas. Apenas deixa de aparecer em novos fluxos (seletores).
- Seed de corretoras: migração deve garantir `active = 1` para registros existentes.

**Telas que usam seletor de corretoras:**
- `InitialBalancePage` — select "Corretora"
- `ImportPage` — select "Códigos das corretoras cadastradas" (referência)

## Critérios de Sucesso

- Usuário edita nome, CNPJ ou código de uma corretora e alterações são persistidas.
- Validação impede CNPJ ou código duplicado ao editar.
- Usuário alterna status ativo/inativo pelo botão na tabela.
- Corretoras inativas aparecem na BrokersPage com indicador "Inativa".
- Corretoras inativas **não** aparecem no select de corretora da InitialBalancePage.
- Corretoras inativas **não** aparecem no select de referência da ImportPage.
- Todos os testes passam.

## Testes da Tarefa

- [x] Testes de unidade: `ManageBrokersUseCase.update` — sucesso, nome vazio, CNPJ duplicado (outra corretora), código duplicado (outra corretora), não altera própria corretora ao validar
- [x] Testes de unidade: `ManageBrokersUseCase.toggleActive` — alterna corretamente, corretora inexistente retorna erro
- [x] Testes de unidade: `ManageBrokersUseCase.list` com `activeOnly: true` — retorna apenas ativas
- [x] Testes de integração: `KnexBrokerRepository` — `findAllActive`, `update`, coluna `active`
- [x] Testes de integração: handlers IPC `brokers:update`, `brokers:toggle-active`, `brokers:list` com `activeOnly`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/main/database/migrations/` (nova migração para `active`)
- `src/main/domain/portfolio/broker.entity.ts` (adicionar `active`)
- `src/main/application/repositories/broker.repository.ts` (findAllActive, update)
- `src/main/infrastructure/persistence/knex-broker.repository.ts` (implementar)
- `src/main/application/use-cases/manage-brokers-use-case.ts` (update, toggleActive, list com filtro)
- `src/shared/contracts/brokers.contract.ts` (tipos UpdateBrokerCommand, ToggleBrokerActiveCommand)
- `src/main/ipc/handlers/register-main-handlers.ts`
- `src/preload.ts`, `src/shared/types/electron-api.ts`
- `src/renderer/pages/BrokersPage.tsx` (editar, ativar/desativar)
- `src/renderer/pages/ImportPage.tsx` (listBrokers com activeOnly)
- `src/renderer/pages/InitialBalancePage.tsx` (listBrokers com activeOnly)
