---
trigger: model_decision
description: Regras de arquitetura em camadas com Clean Architecture
---

# Architecture Rules

A arquitetura deve ser separada em camadas claras dentro do contexto delimitado.

## Domain Layer

- Centraliza regras de negocio independentes de framework.
- Mantenha nesta camada: entidades/agregados, value objects, domain events e interfaces de repositorio.
- Repositories devem persistir e restaurar agregados SOMENTE
- Queries (CQS) podem receber e devolver DTOs

## Application Layer

- Orquestre fluxos de negocio sem acoplamento com detalhes de infraestrutura.
- Mantenha nesta camada: use cases, services e portas para servicos externos.
- Utilize uma abordagem CQS, funções/métodos que retornam dados não devem modificá-los

### Estrutura de Use Cases

Casos de uso devem ter uma responsabilidade clara e bem definida, representando a intenção do usuário.
Um caso de uso não pode depender diretamente de outro caso de uso.
Siga `@.agents/rules/folder-structure.md` para localizacao e arquivos do use case.
Use cases devem ter apenas um método: `execute(input: InputType): Promise<OutputType>`, InputType e OutputType devem ser exportados no mesmo arquivo
Exemplo:
```ts
export interface InputType {
 property: Type
}

export interface OutputType {
 property: Type
}

async execute(input: InputType): Promise<OutputType> {
 // use-case logics
}

```

Injeção de dependências (repositories, portas) via construtor

## Infrastructure Layer

- Implementa adaptadores concretos para integrar com banco, APIs e bibliotecas externas.
- Mantenha nesta camada: implementacoes de repositorios e clients externos.

## Dependency Rule

- Camadas internas nao podem depender de camadas externas.
- Respeite o fluxo de dependencia: `infra -> interface <- application -> domain`.
- Regras de negocio e aplicacao devem permanecer desacopladas da infraestrutura.
- Prefira inversao de dependencia para integrar camadas.
- Toda interação com sistemas externos (API, Banco de dados, Gateway de pagamento etc.) deve ser realizada através de portas e adaptadores.
- Como regra geral, bibliotecas externas não devem ser utilizadas diretamente nas camadas de aplicação/domínio. Prefira extrair um adaptador para a biblioteca em um conceito claro do que ela representa.
  - Exceções: para manter a simplicidade, bibliotecas que lidam com dados simples e que não mudam com frequência como `uuid`, `decimal.js`, `cripto` podem ser utilizadas desde que encapsuladas em uma classe de domínio/aplicação. Ex: VO Money utiliza a biblioteca decimal.js, mas não expõe nada da biblioteca para as outras camadas.