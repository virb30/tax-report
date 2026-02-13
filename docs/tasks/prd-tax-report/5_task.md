# Tarefa 5.0: Classificador de Ativos e Entrada Manual de Preço Médio

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o `AssetClassifier` para inferência automática do tipo de ativo baseado no ticker, e criar a feature completa de entrada manual de preço médio (F4 do PRD). Esta tarefa entrega a primeira funcionalidade visível ao usuário: cadastrar e gerenciar preço médio manualmente.

<requirements>
- Implementar classe `AssetClassifier` com inferência por sufixo do ticker
- Lista de ETFs conhecidos para desambiguação (sufixo 11)
- Override manual de classificação
- Tela `AveragePricePage` com formulário de entrada manual
- Handlers IPC: asset:list, asset:set-manual, asset:update, asset:delete-manual
- Listagem de ativos cadastrados com opção de editar/excluir
- Validação: não permitir exclusão se houver operações vinculadas
- Testes de unidade do classificador e testes de integração do fluxo completo
- Conformidade com RF-12 a RF-15 do PRD
</requirements>

## Subtarefas

- [ ] 5.1 Implementar `AssetClassifier` com lógica de inferência por sufixo
- [ ] 5.2 Criar lista de ETFs conhecidos (BOVA11, IVVB11, etc.)
- [ ] 5.3 Adicionar suporte a override manual de classificação
- [ ] 5.4 Criar testes de unidade do `AssetClassifier`
- [ ] 5.5 Implementar handlers IPC para operações de asset
- [ ] 5.6 Criar página `AveragePricePage` com formulário
- [ ] 5.7 Criar componente de listagem de ativos (tabela)
- [ ] 5.8 Implementar edição inline de ativos manuais
- [ ] 5.9 Implementar exclusão com validação de operações vinculadas
- [ ] 5.10 Criar testes de integração do fluxo completo

## Detalhes de Implementação

Consulte as seções **F4 (RF-12 a RF-15)** no `prd.md` e **"Sequenciamento de Desenvolvimento"** (itens 5 e 6) da `techspec.md`.

### Regras de Classificação

| Sufixo | Tipo | Exceções |
|--------|------|----------|
| 3, 4   | Stock (Ação) | - |
| 11     | FII ou ETF | Verificar lista de ETFs conhecidos |
| 34     | BDR | - |
| Outros | Manual | Usuário deve classificar |

### ETFs Conhecidos (Lista Inicial)

- BOVA11 (Ibovespa)
- IVVB11 (S&P 500)
- SMAL11 (Small Caps)
- DIVO11 (Dividendos)
- etc.

### Estrutura de Arquivos

```
src/main/services/
├── asset-classifier.ts
└── __tests__/
    └── asset-classifier.test.ts

src/renderer/pages/AveragePricePage/
├── AveragePricePage.tsx
├── AssetForm.tsx
├── AssetList.tsx
└── __tests__/
    └── AveragePricePage.test.tsx (opcional)
```

### Formulário de Entrada Manual

Campos:
- Ticker (input text, uppercase)
- Quantidade (input number)
- Preço Médio (input number, R$)
- Corretora (select ou input text)
- Tipo de Ativo (select com inferência automática, editável)

## Critérios de Sucesso

- ✅ `AssetClassifier.classify('PETR4')` retorna `AssetType.Stock`
- ✅ `AssetClassifier.classify('HGLG11')` retorna `AssetType.Fii`
- ✅ `AssetClassifier.classify('BOVA11')` retorna `AssetType.Etf`
- ✅ `AssetClassifier.classify('DISB34')` retorna `AssetType.Bdr`
- ✅ Usuário consegue cadastrar preço médio manual e salvar no banco
- ✅ Listagem mostra todos os ativos cadastrados (manuais e importados)
- ✅ Edição de ativos manuais funciona corretamente
- ✅ Exclusão de ativo manual sem operações vinculadas é permitida
- ✅ Exclusão de ativo com operações vinculadas retorna erro claro

## Testes da Tarefa

- [ ] **Testes de unidade - AssetClassifier**:
  - [ ] Classificar ações (sufixo 3/4) → Stock
  - [ ] Classificar FII (sufixo 11, não na lista ETF) → Fii
  - [ ] Classificar ETF (sufixo 11, na lista ETF) → Etf
  - [ ] Classificar BDR (sufixo 34) → Bdr
  - [ ] Ticker desconhecido → retornar null ou solicitar manual
  - [ ] Override manual funciona

- [ ] **Testes de integração - Entrada Manual**:
  - [ ] Criar asset manual via IPC
  - [ ] Listar assets via IPC
  - [ ] Atualizar asset manual via IPC
  - [ ] Deletar asset manual sem operações
  - [ ] Tentar deletar asset com operações → erro

- [ ] **Testes de UI (manual ou E2E básico)**:
  - [ ] Abrir página de preço médio
  - [ ] Preencher formulário e salvar
  - [ ] Verificar que ativo aparece na listagem
  - [ ] Editar ativo e verificar atualização
  - [ ] Deletar ativo e verificar remoção

### Exemplo de Teste - AssetClassifier

```typescript
// src/main/services/__tests__/asset-classifier.test.ts
import { AssetClassifier } from '../asset-classifier';
import { AssetType } from '../../../shared/enums';

describe('AssetClassifier', () => {
  let classifier: AssetClassifier;

  beforeEach(() => {
    classifier = new AssetClassifier();
  });

  it('should classify stock by suffix 3', () => {
    expect(classifier.classify('PETR3')).toBe(AssetType.Stock);
  });

  it('should classify stock by suffix 4', () => {
    expect(classifier.classify('PETR4')).toBe(AssetType.Stock);
  });

  it('should classify FII by suffix 11', () => {
    expect(classifier.classify('HGLG11')).toBe(AssetType.Fii);
  });

  it('should classify ETF when in known list', () => {
    expect(classifier.classify('BOVA11')).toBe(AssetType.Etf);
  });

  it('should classify BDR by suffix 34', () => {
    expect(classifier.classify('DISB34')).toBe(AssetType.Bdr);
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `src/main/services/asset-classifier.ts`
- `src/main/services/__tests__/asset-classifier.test.ts`
- `src/renderer/pages/AveragePricePage/AveragePricePage.tsx`
- `src/renderer/pages/AveragePricePage/AssetForm.tsx`
- `src/renderer/pages/AveragePricePage/AssetList.tsx`

**A serem atualizados:**
- `src/main/ipc/ipc-handler-registry.ts` (adicionar handlers de asset)
- `src/renderer/App.tsx` (adicionar rota)

**Dependências:**
- Task 2.0 (AssetRepository)
- Task 3.0 (IPC + tipos)
- Task 4.0 (AveragePriceCalculator para integração futura)

**References no PRD:**
- F4: RF-12 a RF-15

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/electron.mdc`
- `.cursor/rules/react.mdc`
- `.cursor/rules/node.mdc`
- `.cursor/rules/tests.mdc`
