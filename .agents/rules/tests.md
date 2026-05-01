---
trigger: model_decision
description: Testing standards with Jest for TypeScript test files
globs: **/*.{test,spec}.{ts,tsx}
---

# Test Standards

Utilize a biblioteca Jest para definir cenarios de teste e expectativas.

Para rodar os testes, utilize o comando `npm test`.

- Nao crie dependencia entre testes; cada teste deve rodar de forma independente.
- Siga Arrange-Act-Assert (AAA) ou Given-When-Then para manter legibilidade.
- Ao testar comportamento dependente de data/hora, use mock de `Date` para repetibilidade.
- Foque em um comportamento por teste; evite testes muito longos.
- Garanta cobertura total do codigo novo/alterado.
- Crie expectativas consistentes para validar exatamente o comportamento testado.
- Use descricoes claras e descritivas nos blocos de teste.
- Evite excesso de mocks; use apenas quando necessario.
- Teste comportamento, nao detalhes de implementacao.
- Prefira `jest-mock-extended` para criacao de mocks quando fizer sentido.
- Adicione ou atualize testes focados quando comportamento ou limites entre modulos mudarem.

## Exemplo rapido

```typescript
describe('calculateTax', () => {
  it('returns 0 when amount is 0', () => {
    const amount = 0;

    const result = calculateTax(amount);

    expect(result).toBe(0);
  });
});
```
