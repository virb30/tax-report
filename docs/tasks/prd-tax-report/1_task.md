# Tarefa 1.0: Scaffolding e Infraestrutura Base

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar a estrutura base do projeto usando Electron Forge com Vite, configurar React + TypeScript, Tailwind CSS, shadcn/ui e Jest. Esta tarefa estabelece a fundação sobre a qual todas as outras features serão construídas.

<requirements>
- Setup do Electron Forge com template Vite + TypeScript
- Estrutura de pastas `src/main/`, `src/renderer/`, `src/shared/`
- Configuração do React com TypeScript
- Configuração do Tailwind CSS + shadcn/ui
- Configuração do Jest para testes de unidade
- Aplicação deve abrir uma janela Electron vazia
- Suite de testes deve executar com `npm test`
- Conformidade com `.cursor/rules/electron.mdc`, `.cursor/rules/react.mdc` e `.cursor/rules/code-standards.mdc`
</requirements>

## Subtarefas

- [ ] 1.1 Inicializar projeto com Electron Forge + Vite template
- [ ] 1.2 Configurar estrutura de pastas (main/, renderer/, shared/)
- [ ] 1.3 Setup React + React Router
- [ ] 1.4 Configurar Tailwind CSS
- [ ] 1.5 Instalar e configurar shadcn/ui CLI
- [ ] 1.6 Configurar Jest + ts-jest
- [ ] 1.7 Configurar ESLint e Prettier
- [ ] 1.8 Criar janela Electron básica que renderiza componente React
- [ ] 1.9 Adicionar scripts npm (dev, start, test, lint)
- [ ] 1.10 Documentar comandos e estrutura no README

## Detalhes de Implementação

Consulte a seção **"Sequenciamento de Desenvolvimento"** da `techspec.md` (item 1).

### Estrutura de Pastas Alvo

```
src/
├── main/
│   └── main.ts              # Entry point do Electron
├── renderer/
│   ├── App.tsx              # Componente raiz
│   ├── main.tsx             # Entry point React
│   └── index.html
├── shared/
│   └── types/               # Será populado em tasks futuras
└── preload.ts               # Bridge IPC (básico)
```

### Dependências Principais

**Runtime:**
- electron
- react, react-dom
- react-router-dom

**Estilização:**
- tailwindcss, postcss, autoprefixer

**Development:**
- typescript
- @electron-forge/cli
- @electron-forge/plugin-vite
- jest, ts-jest, @types/jest
- eslint, prettier

### Configurações Necessárias

1. **vite.config.ts**: Configurar para Electron (main + renderer)
2. **tailwind.config.js**: Paths do renderer
3. **jest.config.js**: Configurar ts-jest, coverage, testEnvironment node
4. **tsconfig.json**: Paths aliases, strict mode

## Critérios de Sucesso

- ✅ `npm run dev` inicia a aplicação e abre janela Electron com "Hello World" renderizado via React
- ✅ HMR (Hot Module Replacement) funciona no renderer
- ✅ `npm test` executa suite vazia de testes sem erros
- ✅ `npm run lint` não reporta erros
- ✅ Estrutura de pastas segue padrão definido em `.cursor/rules/electron.mdc`
- ✅ README contém instruções de setup e comandos disponíveis

## Testes da Tarefa

- [ ] **Teste de unidade (smoke test)**: Teste básico que valida que Jest está configurado corretamente
- [ ] **Teste de integração manual**: Abrir aplicação e verificar se janela renderiza componente React

### Exemplo de Smoke Test

```typescript
// src/main/__tests__/main.test.ts
describe('Electron Main Process', () => {
  it('should be defined', () => {
    expect(true).toBe(true);
  });
});
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos Relevantes

**A serem criados:**
- `package.json`
- `vite.config.ts`
- `tailwind.config.js`
- `jest.config.js`
- `tsconfig.json`
- `src/main/main.ts`
- `src/renderer/App.tsx`
- `src/renderer/main.tsx`
- `src/renderer/index.html`
- `src/preload.ts`
- `README.md`

**Rules a seguir:**
- `.cursor/rules/code-standards.mdc`
- `.cursor/rules/electron.mdc`
- `.cursor/rules/react.mdc`
- `.cursor/rules/tests.mdc`
