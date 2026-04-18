---
name: code-review
description: Executes a comprehensive code review by validating code changes against project rules, technical specifications, and task criteria using git tools. Validates test execution, identifies code smells, and generates a standardized review artifact. Use after task implementation, bug fixes, or whenever code changes need validation. Do not use for initial planning or architecture brainstorming.
---

# Code Review Procedure

This skill performs a comprehensive code review, analyzing code changes against project rules, technical specifications, and defined tasks. Follow these instructions precisely.

## Step 1: Context Gathering
1. Ask the user which task or feature requires review, if not explicitly provided.
2. Read the specific task file (`./docs/tasks/prd-[feature-slug]/[num]_task.md`) to understand the exact scope.
3. Read the technical specification (`./docs/tasks/prd-[feature-slug]/techspec.md`) to understand expected architectural decisions.
4. Read the PRD (`./docs/tasks/prd-[feature-slug]/prd.md`) to understand business requirements.
5. Read project rules (`@.cursor/rules/`) to identify required patterns.

## Step 2: Code Change Analysis
1. Execute git commands to understand the modifications:
   * Run `git status` to see modified files.
   * Run `git diff` and `git diff --staged` to view specific changes.
   * Run `git log main..HEAD --oneline` and `git diff main...HEAD` for branch-level comparisons.
2. Analyze the changes line by line for every modified file. Do not rely solely on the diff; view the complete file context when necessary.
3. Validate that all expected files were correctly modified.

## Step 3: Compliance Validation
1. **Verify Rules:** Confirm nomenclature patterns match project rules, folder structure conforms to project standards, code formatting is followed, no unauthorized dependencies are introduced, and error handling/logging follow established patterns.
2. **Verify TechSpec Adherence:** Compare the implementation against the technical specification to ensure architectural decisions, components, interfaces, data models, and APIs are implemented as specified.
3. **Verify Task Completeness:** Ensure the implemented code addresses the active task, meets all acceptance criteria, and implements task-specific tests.

## Step 4: Test Validation
1. Execute the project's test suite (e.g., `npm test` or `yarn test`).
2. Execute tests with coverage (e.g., `npm run test:coverage`).
3. Verify that **ALL tests pass**. A review cannot be approved if any test fails.
4. Confirm new tests are present for new code and test coverage has not decreased.

## Step 5: Code Quality Assessment
1. Check for code smells and adherence to best practices.
2. Verify function complexity is low, code is not duplicated (DRY), SOLID principles are upheld, naming is clear, comments are used properly, and no obvious security or performance issues exist.

## Step 6: Generate Review Artifact
1. Determine the final decision status:
   * **APROVADO**: All requirements implemented, all tests pass, fully compliant with rules and TechSpec, no high severity issues.
   * **APROVADO COM RESSALVAS**: Main requirements met, tests pass, minor low-medium severity issues left with suggestions.
   * **REPROVADO**: Any test fails, severe rule violation, deviation from TechSpec, or severe security/code smells found.
2. Create a review artifact at `./docs/tasks/prd-[feature-slug]/[num]_task_review.md` using exactly the following format:

```markdown
# Review da Tarefa [num]: [Título da Tarefa]

## Informações Gerais
- **Data do Review**: [data]
- **Branch**: [branch name]
- **Task Revisada**: [num]_task.md
- **Reviewer**: Code Review Agent
- **Status Final**: [APROVADO | APROVADO COM RESSALVAS | REPROVADO]

## Resumo Executivo
[Breve resumo do que foi revisado e o resultado geral]

## Análise de Mudanças de Código
### Arquivos Modificados
- [arquivo1.ext] - [descrição da mudança]
- [arquivo2.ext] - [descrição da mudança]

### Estatísticas
- **Arquivos Modificados**: [X]
- **Linhas Adicionadas**: [Y]
- **Linhas Removidas**: [Z]

## Conformidade com Rules do Projeto
| Rule | Status | Observações |
|------|--------|-------------|
| [rule] | ✅ OK / ❌ NOK | [obs] |

## Aderência à TechSpec
| Decisão Técnica | Implementado | Observações |
|-----------------|--------------|-------------|
| [decisão] | ✅ SIM / ❌ NÃO | [obs] |

## Verificação da Task
### Requisitos da Task
- [x] Requisito 1 - [status]

### Subtarefas
- [x] Subtarefa 1 - [status]

### Critérios de Sucesso
- [x] Critério 1 - [atendido/não atendido]

## Resultados dos Testes
### Testes de Unidade
- **Total**: [X] | **Passando**: [Y] | **Falhando**: [Z] | **Coverage**: [%]

### Testes Específicos da Task
- [ ] [Teste 1] - [status]

## Problemas Encontrados
| Severidade | Arquivo | Linha | Descrição | Sugestão de Correção |
|------------|---------|-------|-----------|---------------------|
| 🔴 Alta | [file] | [line] | [descrição] | [sugestão] |
| 🟡 Média | [file] | [line] | [descrição] | [sugestão] |
| 🟢 Baixa | [file] | [line] | [descrição] | [sugestão] |

## Análise de Qualidade de Código
### Pontos Positivos
- [ponto 1]

### Code Smells Identificados
- [code smell] - [local]

### Boas Práticas Aplicadas
- [prática 1]

## Recomendações
### Ações Obrigatórias (Bloqueantes)
- [ ] [ação 1]

### Melhorias Sugeridas (Não Bloqueantes)
- [ ] [melhoria 1]

## Decisão Final
**Status**: [APROVADO | APROVADO COM RESSALVAS | REPROVADO]

### Justificativa
[Explicação detalhada da decisão]

### Próximos Passos
[Próximas ações após o review]

---
**Observações Finais**: [Comentários adicionais]
```

## Step 7: Final Communication
1. Provide a summary of the review to the user.
2. Indicate clearly whether the review passed (and with what conditions) or failed.
3. Suggest the immediate next steps to the user based on the review outcome.
