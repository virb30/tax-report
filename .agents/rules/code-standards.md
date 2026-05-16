---
trigger: model_decision
---

# Code Standards

Estas regras existem para guiar implementacao e revisao de codigo com consistencia.

## Prioridade de interpretacao

- `MUST`: obrigatorio.
- `SHOULD`: recomendacao forte; so quebrar com justificativa clara.
- Em caso de conflito, siga a ordem: corretude > legibilidade > convencao.

## Regras obrigatorias (`MUST`)

1. Escreva codigo em ingles (nomes de variaveis, funcoes, classes, metodos e mensagens tecnicas).
2. Use `camelCase` para variaveis, funcoes e metodos.
3. Use `PascalCase` para classes e interfaces.
4. Use `kebab-case` para arquivos e diretorios.
5. Nao use abreviacoes obscuras; mantenha nomes claros e com no maximo 30 caracteres quando possivel.
6. Nao use `flag params` para chavear comportamento (ex.: `doThing(true)`). Extraia funcoes/metodos especificos.
7. Nao misture consulta com mutacao na mesma funcao. Consultas devem ser livres de efeitos colaterais.
8. Evite mais de 2 niveis de aninhamento de `if/else`; prefira `early return`.
9. Nunca declare mais de uma variavel na mesma linha.
10. Use TypeScript em todo codigo novo ou alterado.
11. Siga Prettier: aspas simples, ponto e virgula, trailing commas e largura de linha de 100 caracteres.
12. Siga ESLint sem warnings, sem `any` e com imports type-only consistentes.
13. Use `import` e `export` (ESM); nao use `require`.
14. Prefira `async/await` em vez de callbacks ou cadeias de Promise desnecessarias.
15. Use `const` por padrao. Use `let` apenas quando houver reatribuicao. `var` e proibido.
16. Quando o tipo de entrada for desconhecido, use `unknown` com validacao explicita.
17. Use sufixos de arquivo alinhados ao papel do artefato: `[context].module.ts`, `*.controller.ts` e `*.handler.ts` quando aplicavel.
18. Construtores devem ser livres de efeitos colaterais, exceto em `*.module.ts`, `*.controller.ts` e `*.handler.ts`, onde o registro imediato de dependencias, rotas ou assinaturas faz parte do padrao arquitetural.
19. Sempre que possível evite `export from`, quando utilizar, crie um comentário TODO com as condições de quando deverá ser removido.

## Regras recomendadas (`SHOULD`)

1. Evite passar mais de 3 parametros; prefira objeto de parametros quando necessario.
2. Substitua `magic numbers` por constantes nomeadas.
3. Mantenha funcoes com ate 50 linhas e classes com ate 300 linhas; extraia responsabilidades quando ultrapassar.
4. Declare variaveis o mais proximo possivel do ponto de uso.
5. Evite comentarios obvios; use comentarios apenas para explicar intencao, contexto ou trade-off.
6. Use sufixos de arquivo consistentes: `*.entity.ts`, `*.vo.ts`, `*.service.ts`, `*.use-case.ts`, `*.contract.ts`, `*.repository.ts`, `*.module.ts`, `*.controller.ts` e `*.handler.ts`.
7. Mantenha a definicao do tipo de entrada/saida de um metodo no mesmo arquivo da classe.
8. Prefira métodos privados a funções utilitárias que serão utilizadas apenas por uma classe.

## Exemplos rapidos

- Ruim: `processData(true, 10, 20, 30)`
- Bom: `processInvoice({ retry: true, timeoutMs: DEFAULT_TIMEOUT })`

- Ruim: funcao de leitura que tambem escreve no banco
- Bom: separar em `getUserById()` (consulta) e `updateUserStatus()` (mutacao)
