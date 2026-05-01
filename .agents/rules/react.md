---
trigger: model_decision
description: Regras de frontend React
globs: src/renderer/**/*.{ts,tsx,js,jsx,html,css,scss}
---

# React Rules

Use esta regra ao alterar codigo em `src/renderer/**`.

## Frontend (React)

- Mantenha paginas como composition roots.
- Mova workflows, IPC calls, submit handlers, modal state e estado derivado para hooks `use...` focados.
- Mova forms, tables e modals para componentes nomeados quando forem responsabilidades separadas.
- Use componentes funcionais e Hooks (`useState`, `useEffect`, etc.); nao use componentes de classe.
- Use Context API para comunicacao entre componentes quando necessario; evite bibliotecas de estado sem necessidade clara.
- Todo hook customizado deve comecar com `use` (ex.: `useUserData`).
- Evite spread de props (`<MyComponent {...props} />`); passe props explicitamente.
- Evite componentes maiores que 300 linhas; quebre em componentes menores quando necessario.
- Use `useMemo` e `useCallback` para otimizar computacoes ou handlers custosos.
- Componentes devem ter testes automatizados cobrindo o comportamento principal.
- Crie componentes em pastas `PascalCase`; o arquivo principal deve ter o mesmo nome da pasta com extensao `.tsx`; nao use `index.tsx` para componentes.
- Mantenha o estado o mais proximo possivel de onde ele e utilizado.
