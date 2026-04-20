# Template de Documento de Requisitos do Produto (PRD)

## Visão Geral

A importação atual de planilhas exige uma coluna única "Tipo" para a identificação do tipo de transação (ex: "Compra", "Venda"). Contudo, o padrão real de exportação da B3 não possui essa coluna, e sim duas diferentes: **"Entrada/Saída"** e **"Movimentação"**. O objetivo desta alteração é remodelar a forma de identificar as movimentações para ser aderente e compatível "out-of-the-box" com o formato original da B3, convertendo automaticamente as combinações dessas 2 colunas nos tipos internos do sistema. Isso elimina o trabalho manual prévio do usuário e cria as fundações para um mecanismo escalável e genérico de mapeamento de providers no futuro.

## Objetivos

- **Métrica de Sucesso**: Permitir a importação de uma planilha da área de movimentações da B3 sem que o usuário precise manipular planilhas ou criar uma coluna "Tipo".
- **Objetivos de Negócio**: Diminuir a fricção do _onboarding_ / uso do sistema, mitigando erros do usuário durante o preparo de dados para a declaração de IR.
- Reduzir falsos-erros ou necessidade de preenchimento de todas as linhas de eventos corporativos ignorando ativamente direitos e leilões que não influenciam no preço médio de forma direta (ou que atualmente são fora de escopo).

## Histórias de Usuário

- Como [Investidor], eu quero [importar a planilha de resumo de transações da corretora/B3 diretamente no sistema sem edição manual de colunas] para que [eu economize tempo e não corra o risco de modificar os dados sem querer].
- Como [Investidor], eu quero [ser alertado se uma bonificação estiver faltando o preço unitário] para que [eu possa preenchê-lo e não tenha um impacto incorreto de R$ 0,00 no meu preço médio].
- Como [Administrador do Sistema], eu quero [manter a identificação mapeavel em uma lista/dicionário simples no código] para que [seja fácil de revisar e adicionar mais eventos de corporativos no futuro].

## Funcionalidades Principais

As funcionalidades para atender a esse novo modelo estão delineadas abaixo:

### 1. Leitura de Cabeçalhos Flexíveis
- O que faz: Ao importar, o sistema deve buscar pelas colunas "Entrada/Saída" e "Movimentação".
- Por que é importante: Mantém a importação resiliente a exportações diferentes que tem algumas mudanças de _case_ ou de encoding.
- Requisitos Funcionais:
  1. A leitura dos títulos das colunas deve ser _case-insensitive_ e _accent-insensitive_ (ex. encontrar "entrada/saida", "ENTRADA/SAÍDA").

### 2. Conversão da Direção de Fluxo (Entrada e Saída)
- O que faz: Converte os valores da coluna Entrada/Saída para direções base de crédito ou débito.
- Como funciona:
  1. Se valor de Entrada/Saída = "Credito", a base equivale à entrada de ativos (antiga "Compra").
  2. Se valor de Entrada/Saída = "Debito", a base de equivale à saída de ativos (antiga "Venda").

### 3. Mapeamento de Tipos de Movimentação (Dicionário Isolado)
- O que faz: Avalia o conteúdo da coluna "Movimentação", combinado com "Entrada/Saída", mapeando tudo aos tipos de transações padrão do motor contábil do sistema.
- Requisitos Funcionais:
  1. O mapeamento DEVE ser centralizado em um objeto enumerado/dicionário isolado no código para fácil manutenção.
  2. "Transferência - Liquidação" será mapeado em transação normal: se Entrada/Saída for Credito = "Compra"; se Debito = "Venda".
  3. "Transferência" sinaliza transferência de custódia: se Entrada/Saída for Credito = `transfer_in`, se Debito = `transfer_out`.
  4. "Bonificação em ativos" irá mapear para a transação interna equivalente a transações de bônus, com regras mantidas.
  5. Qualquer tipo não mapeado ou os explicitamente listados como descartados (Eventos de Subscrição, Cessão e Leilão/Frações) devem ser ignorados.

### 4. Validação Antecipada de Preço em Bonificações
- O que faz: Requer que as bonificações contenham um valor unitário.
- Por que é importante: Bonificações na B3 muitas vezes não reportam os preços unitários declarados no balanço e sem ele o Preço Médio fica defasado.
- Requisitos Funcionais:
  1. Se a "Movimentação" for identificada como "Bonificação em ativos", o sistema validará o preço unitário ou o preço total na planilha.
  2. Caso o preço (ou valor total calculável) seja zero ou vazio, a importação dessa linha deverá interromper disparando um erro na validação da linha alertando e solicitando ao usuário que adicione o valor.

### 5. Descarte Silencioso de Operações Fora de Escopo
- O que faz: Impede que certas linhas poluam logs ou parem toda a importação por eventos que sabemos não tratar.
- Requisitos Funcionais:
  1. Eventos identificados e não previstos, incluindo ("Direito de Subscrição", "Exercido", "Não exercido", "Leilão de Fração", "Fração de ativos", "Cessão de direitos") e eventos totais não mapeados, devem ser pulados silenciosamente, sem retornar erro que invalide o arquivo.

## Experiência do Usuário

- A expectativa principal é que a experiência passe a ser completamente invisível. O usuário envia o _excel_ emitido pelo CEI (B3) diretamente.
- A única interação diferente que ocorrerá será se o usuário receber um erro pontual e instrutivo dizendo que: "A operação de Bonificação linha X necessita do valor na planilha". Fora da bonificação, direitos emitidos (como subscrições ou frações) sumirão silenciosamente sem gerar atrito ao usuário.

## Restrições Técnicas de Alto Nível

- O dicionário ou Factory de mapeamento deve receber a _row_ completa e devolver o Transaction Type internamente. Este desacoplamento será fundamental para escalar a importação no futuro para provedores variados que possam chamar coisas parecidíssimas ou diferentes.
- A aplicação não dependerá mais de nenhuma coluna nomeada "Tipo".

## Fora de Escopo

- Processamento ativo de qualquer dos seguintes eventos (estão ativamente sendo excluídos):
  - "Direito de Subscrição"
  - "Direito de Subscrição - Não exercido"
  - "Direito de Subscrição - Exercido"
  - "Cessão de Direitos - Solicitada"
  - "Cessão de Direitos"
  - "Fração em Ativos"
  - "Leilão de Fração"
- Disparo de validações/feedbacks sobre quais itens foram "ignorados" ao fim da importação. Todos serão puramente logados num nível de debug ou completamente descartados, sem interface com o cliente final.
