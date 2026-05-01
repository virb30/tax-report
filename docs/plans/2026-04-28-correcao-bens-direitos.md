# Plano por Etapas — Correção de Bens e Direitos

## Resumo

- Objetivo: corrigir BR-01 a BR-06 sem abrir nova frente funcional ampla; BR-07 entra apenas como guarda de escopo e épico futuro.
- Decisões já fechadas: resolução híbrida de `assetType`; relatório em modo parcial com pendências por item; nada de cobertura nova de eventos patrimoniais nesta rodada.
- Dependência central: transformar `ticker_data` em catálogo operacional do ativo, porque ele passa a sustentar tipo, emissor e saneamento do legado.

## Etapa 0 — Base técnica e testes de caracterização

- Criar testes que reproduzam cada achado do relatório nos fluxos de importação, recálculo, relatório e saldo inicial, para evitar “corrigir um bug e apagar outro”.
- Evoluir `ticker_data` para aceitar catálogo incompleto: adicionar `asset_type`, permitir `cnpj` nulo e manter `name` opcional.
- Expandir `AssetRepository` para suportar leitura por ticker, upsert e consulta de dados faltantes.
- Introduzir um estado compartilhado de resolução de tipo (`resolved_from_file`, `resolved_from_catalog`, `manual_override`, `unresolved`) para não espalhar regra ad hoc por parser, use case e UI.

## Etapa 1 — BR-01: resolver `assetType` na origem e corrigir legado

- Remover todo fallback para `AssetType.Stock` em `PositionCalculatorService` e `RecalculatePositionUseCase`. Se o tipo não estiver resolvido, o fluxo deve falhar com erro de domínio específico.
- Criar um `AssetTypeResolverService` com precedência fixa: coluna `Tipo Ativo` da planilha, catálogo `ticker_data`, override manual da conferência.
- Ampliar preview e confirmação de importação de transações e de posição consolidada para devolver `resolvedAssetType`, `resolutionStatus`, `needsReview` e aceitar `assetTypeOverrides` por ticker.
- Na UI de conferência, mostrar a coluna `Tipo` com a origem da resolução. Se houver item `unresolved`, o botão de confirmar fica desabilitado até o usuário escolher o tipo.
- Quando o usuário informar override manual, persistir o tipo no catálogo do ticker antes de salvar transações ou saldos iniciais, para não pedir a mesma correção de novo.
- Criar um fluxo de saneamento do legado por ticker. Ele deve localizar posições históricas gravadas com fallback antigo, permitir correção manual e reprocessar as posições dos anos afetados após salvar o tipo correto no catálogo.
- Critério de aceite: nenhuma posição nova nasce sem tipo resolvido; nenhum recálculo inventa `stock`; o legado pode ser corrigido sem SQL manual.

## Etapa 2 — BR-02, BR-03 e BR-04: redesenhar o relatório como item declaratório

- Separar o domínio do relatório em três módulos claros: classificação Receita, elegibilidade declaratória e montagem do item copiável.
- Trocar o modelo atual de “uma linha por corretora” por “um item declaratório por ticker/tipo”. A lista de corretoras continua existindo, mas apenas dentro da discriminação consolidada e do resumo visual.
- Calcular `currentYearValue` pela posição de `31/12/{ano-base}` e `previousYearValue` recalculando o ticker até `31/12/{ano-base-1}` a partir do histórico de transações. Se a posição anterior for zero e a atual positiva, marcar `acquiredInYear = true`.
- Ampliar o contrato do relatório com `previousYearValue`, `currentYearValue`, `acquiredInYear`, `eligibilityStatus`, `eligibilityReason`, `pendingIssues`, `canCopy`, `description` e `brokersSummary`.
- Implementar o motor de limiar declaratório por classe suportada: `stock` como participação societária com limite de aquisição `>= 1.000`, `bdr` como ativo negociado em bolsa no Brasil exceto ações e fundos com limite `>= 1.000`, `fii` e `etf` como fundos com saldo de `31/12` `> 140`.
- Remover do contrato e da UI qualquer campo derivado de “custo total por corretora”, porque o modelo atual não armazena custo histórico por custodiante.
- Na UI do relatório, exibir os dois campos separados, mostrar status do item (`obrigatório`, `facultativo`, `abaixo do limiar`, `pendente`) e permitir cópia individual apenas quando `canCopy = true`.
- Critério de aceite: um ticker com duas corretoras gera um único item declaratório; os valores de ano anterior e ano-base aparecem separados; os limiares mudam o status corretamente; itens pendentes não são vendidos como “prontos para declarar”.

## Etapa 3 — BR-05: cadastro operacional de ticker e emissor

- Criar uma tela própria de catálogo de ativos, seguindo o padrão já usado em corretoras: hook de página, formulário, tabela e modal de edição.
- Expor IPCs para listar e atualizar ticker, tipo, nome do emissor e CNPJ do emissor.
- A tela deve destacar registros incompletos e oferecer filtro “pendentes para relatório”.
- O relatório deve consumir esse catálogo e marcar `pendingIssues` quando faltarem nome ou CNPJ exigidos para a discriminação.
- Escopo desta etapa: preenchimento manual e edição individual. Importação em lote fica fora desta rodada.
- Critério de aceite: o usuário consegue completar metadados sem tocar no banco, e um item pendente passa a copiável depois do enriquecimento.

## Etapa 4 — BR-06: saldo inicial como documento editável e multi-corretora

- Parar de tratar saldo inicial como mutação direta da posição atual. A fonte de verdade deve ser o conjunto de transações `initial_balance` do `ticker + ano`.
- Substituir o comando atual por um payload com `allocations[]`, mantendo `ticker`, `assetType`, `averagePrice` e `year` no nível do documento.
- Ao salvar, apagar as transações `initial_balance` anteriores daquele `ticker + ano`, recriar uma transação por corretora e recalcular a posição; isso torna o fluxo idempotente e corrige o erro de sobrescrever breakdown de forma parcial.
- Adicionar consulta e exclusão de saldo inicial por `ticker + ano`, para suportar edição e remoção na UI.
- Na UI, trocar o formulário de corretora única por uma grade de alocações por corretora; abaixo do formulário, mostrar uma tabela de documentos salvos com ações `Editar` e `Excluir`.
- Se fizer sentido para conferência, manter a tabela de posição final separada da tabela de saldos iniciais, para o usuário não confundir documento-base com posição recalculada.
- Critério de aceite: salvar o mesmo ticker duas vezes no mesmo ano substitui o documento anterior; múltiplas corretoras ficam preservadas; editar ou excluir recalcula a posição corretamente.

## Etapa 5 — BR-07: guarda de escopo e épico futuro

- Não implementar novos eventos patrimoniais nesta rodada.
- Explicitar no produto o escopo suportado: classes `stock`, `fii`, `etf`, `bdr`; eventos `buy`, `sell`, `bonus`, `split`, `reverse_split`, `transfer_in`, `transfer_out` e `initial_balance`.
- Fazer o preview de importação sinalizar ou bloquear linhas com movimentações não suportadas, em vez de simplesmente ignorá-las.
- Adicionar aviso visível em importação e relatório informando que amortização, subscrição, conversão, frações e classes fora da taxonomia atual ainda não entram no cálculo de Bens e Direitos.
- Abrir um épico separado para evolução patrimonial, com prioridade futura para amortização, subscrição e conversão.

## Mudanças de interfaces públicas

- Importações: preview e confirmação passam a trafegar tipo resolvido, status da resolução e overrides manuais.
- Relatório: sai `allocTotalCost` implícito por corretora; entram `previousYearValue`, `currentYearValue`, `acquiredInYear`, status declaratório e pendências.
- Saldo inicial: sai `brokerId`/`quantity` únicos; entra `allocations[]` e comandos de consultar/excluir documento.
- Catálogo de ativos: novos endpoints IPC para listar e atualizar ticker, tipo e metadados do emissor.

## Testes e cenários obrigatórios

- Importar ticker novo sem `Tipo Ativo` e sem cadastro: preview bloqueia confirmação até revisão manual.
- Importar ticker novo com `Tipo Ativo` válido: tipo persiste no catálogo e é preservado no recálculo.
- Corrigir ticker legado antes salvo como `stock`: posições históricas passam a refletir o tipo novo após reprocessamento.
- Gerar relatório de ticker em duas corretoras: deve sair um item único com discriminação consolidada.
- Validar limiar por classe: `stock` e `bdr` em `999,99` ficam abaixo do limiar; `1.000,00` ficam obrigatórios; `fii` e `etf` em `140,00` ficam abaixo; acima disso ficam obrigatórios.
- Item com metadado faltante: aparece como `pendente`, com cópia desabilitada.
- Saldo inicial multi-corretora salvo duas vezes no mesmo ano: a segunda gravação substitui a primeira e não duplica transações.
- Exclusão de saldo inicial: remove o documento e recalcula a posição final do ano.
- Preview com evento não suportado: o usuário recebe bloqueio ou aviso explícito; a linha não some silenciosamente.

## Assunções e referências

- O catálogo operacional continuará usando a tabela `ticker_data`, em vez de uma nova tabela paralela.
- O cálculo de `previousYearValue` usará o histórico de transações até `31/12/{ano-base-1}`, não apenas snapshots persistidos.
- O relatório continuará sendo gerado mesmo com pendências, mas itens pendentes não poderão ser copiados como “prontos”.
- Referências validadas: `docs/reports/2026-04-28-revisao-regras-negocio-bens-direitos.md`, [Manual MIR — Bens Financeiros](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/patrimonio/bens-financeiros), [Perguntas e Respostas IRPF 2026](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/dirpf/p-r-irpf-2026-v1-00-2026-04-23.pdf/view).
