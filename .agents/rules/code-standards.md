---
trigger: model_decision
---

# Code Standards

Estas regras existem para guiar implementação e revisão de código com consistência.

## Prioridade de interpretação

- `MUST`: obrigatório.
- `SHOULD`: recomendação forte; só quebrar com justificativa clara.
- Em caso de conflito, siga a ordem: corretude > legibilidade > convenção.

## Regras obrigatórias (`MUST`)

1. Escreva código em inglês (nomes de variáveis, funções, classes, métodos e mensagens técnicas).
2. Use `camelCase` para variáveis, funções e métodos.
3. Use `PascalCase` para classes e interfaces.
4. Use `kebab-case` para arquivos e diretórios.
5. Não use abreviações obscuras; mantenha nomes claros e com no máximo 30 caracteres quando possível.
6. Não use `flag params` para chavear comportamento (ex.: `doThing(true)`). Extraia funções/métodos específicos.
7. Não misture consulta com mutação na mesma função. Consultas devem ser livres de efeitos colaterais.
8. Evite mais de 2 níveis de aninhamento de `if/else`; prefira `early return`.
9. Nunca declare mais de uma variável na mesma linha.
10. Use TypeScript em todo código novo ou alterado.
11. Siga Prettier: aspas simples, ponto e vírgula, trailing commas e largura de linha de 100 caracteres.
12. Siga ESLint sem warnings, sem `any` e com imports type-only consistentes.
13. Use `import` e `export` (ESM); não use `require`.
14. Prefira `async/await` em vez de callbacks ou cadeias de Promise desnecessárias.
15. Use `const` por padrão. Use `let` apenas quando houver reatribuição. `var` é proibido.
16. Quando o tipo de entrada for desconhecido, use `unknown` com validação explícita.

## Regras recomendadas (`SHOULD`)

1. Evite passar mais de 3 parâmetros; prefira objeto de parâmetros quando necessário.
2. Substitua `magic numbers` por constantes nomeadas.
3. Mantenha funções com até 50 linhas e classes com até 300 linhas; extraia responsabilidades quando ultrapassar.
4. Declare variáveis o mais próximo possível do ponto de uso.
5. Evite comentários óbvios; use comentários apenas para explicar intenção, contexto ou trade-off.
6. Use sufixos de arquivo consistentes: `*.entity.ts`, `*.vo.ts`, `*.service.ts`, `*.use-case.ts`, `*.contract.ts` e `*.repository.ts`.
7. Mantenha a definição do tipo de entrada/saída de um método no mesmo arquivo da classe.

## Exemplos rápidos

- Ruim: `processData(true, 10, 20, 30)`
- Bom: `processInvoice({ retry: true, timeoutMs: DEFAULT_TIMEOUT })`

- Ruim: função de leitura que também escreve no banco
- Bom: separar em `getUserById()` (consulta) e `updateUserStatus()` (mutação)