---
trigger: model_decision
description: Regras de frontend React com padroes comuns de TypeScript e testes
globs: src/renderer/**/*.{ts,tsx,js,jsx,html,css,scss}
---

# React Rules

Estas regras definem padroes para o frontend em React.

## Frontend (React)

- Use componentes funcionais e Hooks (`useState`, `useEffect`, etc.); nao use componentes de classe.
- Use Context API para comunicacao entre componentes quando necessario; evite bibliotecas de estado sem necessidade clara.
- Todo hook customizado deve comecar com `use` (ex.: `useUserData`).
- Evite spread de props (`<MyComponent {...props} />`); passe props explicitamente.
- Evite componentes maiores que 300 linhas; quebre em componentes menores quando necessario.
- Use `useMemo` e `useCallback` para otimizar computacoes ou handlers custosos.
- Componentes devem ter testes automatizados cobrindo o comportamento principal.
- Crie componentes em pastas `PascalCase`; o arquivo principal deve ter o mesmo nome da pasta com extensao `.tsx`; nao use `index.tsx` para componentes.
- Mantenha o estado o mais proximo possivel de onde ele e utilizado.

## Regras Comuns (TypeScript e JavaScript)

- Nao use `any`; prefira tipos especificos. Quando necessario, use `unknown` com validacao de tipo.
- Use `import` e `export` (ESM); nao use `require`.
- Prefira `async/await` em vez de callbacks ou cadeias de Promise desnecessarias.
- Use `const` por padrao. Use `let` apenas quando houver reatribuicao. `var` e proibido.

## Regras Comuns de Testes

- Mantenha arquivos de teste na mesma pasta do arquivo testado.
- Use sufixos `*.test.ts`, `*.test.tsx`, `*.spec.ts` ou `*.spec.tsx`.
