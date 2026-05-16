---
trigger: model_decision
description: Regras de arquitetura em camadas com Clean Architecture
---

# Architecture Rules

A arquitetura do backend deve ser separada em camadas claras dentro de cada bounded context, com composicao local por modulo e composicao global apenas em `backend/src/main.ts`.

## Composition Roots

- `backend/src/main.ts` e o unico composition root global.
- `main.ts` instancia apenas infraestrutura global, como configuracao, conexao com banco, `Http` e `Queue`, alem dos modulos de cada contexto.
- Cada contexto deve possuir um `[context].module.ts` que atua como composition root local.
- O construtor do modulo recebe dependencias globais e os `exports` minimos de modulos upstream quando necessario.
- O modulo deve compor repositories, services, use cases, controllers e handlers no momento da instanciacao.
- O unico contrato publico permitido entre contextos e `module.exports`.
- Nao exponha repositories, registries centrais de rotas nem objetos crus de framework para outros contextos.
- Nao utilize APIs de ciclo de vida como `register()`, `init()`, `start()`, `static` factories globais ou singletons como padrao de integracao entre modulos.

## Domain Layer

- Centraliza regras de negocio independentes de framework.
- Mantenha nesta camada: entidades/agregados, value objects, domain events e interfaces de repositorio.
- Repositories devem persistir e restaurar agregados SOMENTE.
- Queries (CQS) podem receber e devolver DTOs.

## Application Layer

- Orquestre fluxos de negocio sem acoplamento com detalhes de infraestrutura.
- Mantenha nesta camada: use cases, services e portas para servicos externos.
- Utilize uma abordagem CQS; funcoes/metodos que retornam dados nao devem modifica-los.

### Estrutura de Use Cases

- Casos de uso devem ter uma responsabilidade clara e bem definida, representando a intencao do usuario.
- Um caso de uso nao pode depender diretamente de outro caso de uso.
- Siga `@.agents/rules/folder-structure.md` para localizacao e arquivos do use case.
- Use cases devem ter apenas um metodo: `execute(input: InputType): Promise<OutputType>`.
- `InputType` e `OutputType` devem ser exportados no mesmo arquivo do use case.
- Injete dependencias (repositories, portas) via construtor.

## Transport Layer

- Controllers HTTP sao adaptadores de transporte do contexto.
- Controllers devem ser classes em `transport/http/controllers` e registrar suas rotas no construtor usando a abstracao `Http`.
- Validacoes de sintaxe, parsing e restricoes superficiais de payload devem ficar no controller ou em `transport/http/validation`.
- Handlers de fila/eventos devem ser classes em `transport/queue/handlers` e registrar suas assinaturas no construtor usando `Queue`.
- Controllers e handlers devem apenas adaptar entrada/saida e delegar o comportamento para use cases ou services.

## Infrastructure Layer

- Implementa adaptadores concretos para integrar com banco, APIs e bibliotecas externas.
- Mantenha nesta camada: implementacoes de repositorios e clients externos.

## Dependency Rule

- Camadas internas nao podem depender de camadas externas.
- Respeite o fluxo de dependencia: `infra -> transport <- application -> domain`.
- Regras de negocio e aplicacao devem permanecer desacopladas da infraestrutura.
- Prefira inversao de dependencia para integrar camadas.
- Toda interacao com sistemas externos (API, banco de dados, gateway de pagamento etc.) deve ser realizada atraves de portas e adaptadores.
- Como regra geral, bibliotecas externas nao devem ser utilizadas diretamente nas camadas de aplicacao/dominio. Prefira extrair um adaptador para a biblioteca em um conceito claro do que ela representa.
- Excecoes: para manter a simplicidade, bibliotecas que lidam com dados simples e que nao mudam com frequencia como `uuid`, `decimal.js` e `crypto` podem ser utilizadas desde que encapsuladas em uma classe de dominio/aplicacao.
- Nao introduza uma composicao HTTP centralizada fora dos controllers ou dos modulos de contexto como padrao.
