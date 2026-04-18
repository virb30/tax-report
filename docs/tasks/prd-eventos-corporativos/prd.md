# Template de Documento de Requisitos do Produto (PRD)

## Visão Geral

Implementar suporte ao cálculo de eventos corporativos primários (Bonificações, Desdobramentos e Grupamentos) e Transferências de Custódia (Transferência entre corretoras) no aplicativo Tax Report. O objetivo é ajustar a matemática do portfólio para calcular corretamente o Preço Médio e as Posições, garantindo estrita precisão com os critérios da Receita Federal (IRPF) sem depender inicialmente de integrações automatizadas complexas.

## Objetivos

- **Como é o sucesso:** O sistema ser capaz de importar planilhas ou receber inputs manuais destes três eventos, calculando o preço médio sem causar distorção no capital investido ou nos lucros apurados.
- **Métricas principais para acompanhar:** 100% de exatidão em simulações manuais de carteiras com splits/bonificações; feedback do usuário ao lidar com alertas de bonificações. 
- **Objetivos de negócio a alcançar:** Elevar a aderência normativa do app para ser usado como base do programa IRPF sem ressalvas na ficha "Bens e Direitos".

## Histórias de Usuário

- Como [Investidor pessoa física], eu quero [que o sistema identifique bonificações na planilha e peça confirmação do custo unitário] para que [meu preço médio não acabe distorcido para baixo (R$ 0), prejudicando o teste de capital e IRPF na hora da alienação (Venda)].
- Como [Investidor pessoa física], eu quero [registrar desdobramentos (splits) e grupamentos] para que [possa refletir o número atualizado de ativos sob custódia, redistribuindo o preço médio passivamente sem alterar o montante em Reais (Custo Total)].
- Como [Investidor pessoa física], eu quero [importar movimentações de "transferência entre corretoras"] para que [os registros reflitam a mudança de instituição custodiante sem alterar os meus custos, quantitativos ou preço médio].
- *Nota: Fluxos limitados apenas à números inteiros, fracionamentos e resíduos em dinheiro via leilão são manuais e fora do fluxo feliz.*


## Funcionalidades Principais

**1. Lançamento Correto de Bonificações de Ações**
- **O que ela faz:** Adiciona suporte ao custo atribuído na operação de Bonificação.
- **Por que é importante:** A Receita Federal dita que os lucros distribuídos dessa forma compõem o valor de aquisição, elevando o "Custo Total" da posição.
- **Requisitos funcionais:**
  1. A planilha de importação (`Ingestion` / CSV) deverá contar com um novo preenchimento opcional do campo de Custo Unitário (`unitCost`).
  2. Caso uma operação de bonificação entre no sistema (via planilhas da B3 ou interface) ostentando o campo `unitCost` VAZIO/ZERO, o upload/processamento deverá emitir um "Alerta" exigindo ou recomendando fortemente ao usuário corrigir a linha com o custo da bonificação (anunciado em Fato Relevante).
  3. A entidade `AssetPosition` passará a processar bônus como: `Custo Total Novo = Custo Total Antigo + (Qtd_recebida * Custo_Unitário)`. O preço médio se ajustará através dessa soma correspondente.

**2. Desdobramentos e Grupamentos (Splits / Reverse Splits)**
- **O que ela faz:** Provê um método transacional passivo para escalar a quantidade contada em custódia.
- **Por que é importante:** O desdobramento altera as cotas na B3 para aumentar a liquidez, mas os extratos padronizados não tratam a matemática fiscal deste rebaixamento numérico de cota.
- **Requisitos funcionais:**
  1. Implementação de novos `TransactionType` ou eventos: `Split` e `ReverseSplit`.
  2. Implementação na entidade `AssetPosition` prevendo um ajuste direto de quantidade (`quantity = quantity * ratio` ou operações afins) mantendo o `totalCost` Rígido.
  3. O `averagePrice` será organicamente empurrado para um novo valor reajustado apenas pela redivisão monetária do bolo numérico.

**3. Transferência entre Corretoras**
- **O que ela faz:** Registra a transição de custódia de um ativo de uma corretora para outra, alterando o broker mas mantendo intactos todos os valores e custos envolvidos.
- **Por que é importante:** A transferência aparece nos extratos do investidor (ex: planilhas B3), mas não constitui uma operação de compra/venda ou alienação; os custos originais precisam acompanhar o ativo de forma passiva.
- **Requisitos funcionais:**
  1. Suportar um novo tipo de evento de importação para `Transferência` que identifica a alocação de carteira entre brokers.
  2. A importação e processamento deste evento deverão registrar a alteração do custodiante sem disparar nenhum recalculo de `averagePrice` ou `totalCost`. 

## Experiência do Usuário

- **Personas:** O pequeno investidor no varejo submetendo a planilha extraída no canal do investidor da B3.
- **Fluxos:** Ao anexar sua planilha e clicar em importar, a tela fará um Parse do lote. Se encontrar lançamentos classificados como `Bonificação` sem valores adicionais, ela **interrompe o fluxo e plota uma modal listando os itens faltantes**, solicitando ao dono digitar o custo (por ativo) antes da digestão ser finalizada e as transações gravadas.
- **Considerações:** Simplificação da UI; a experiência foca em ser um copiloto que sabe "quando a matemática da taxa está errada", servindo como educador fiscal passivo.

## Restrições Técnicas de Alto Nível

- Não existirá, neste escopo, motor de scrapíng web ou integração (APIs OpenFinance, CVM, B3 API) para inferir o preço automaticamente baseando-se no ticker da empresa listada.
- Restrições de persistência: As migrações (`migrations`) do banco (ou estrutura dos stores de Event Sourcing) precisam acomodar nativamente "Split/ReverseSplit" sem quebrar relatórios do ano anterior.

## Fora de Escopo

- Operações complexas não suportadas (Deverão ser registradas à força por lançamentos manuais de Venda Total e Recompra Total / Ajustes Específicos se o usuário decidir improvisar):
  - Amortização de capital (FIIs).
  - Frações (Fração gerada em bonificação ou Split, que ficam restritas à leilão na bolsa devolvendo saldo para corretora em D+30). O sistema presumirá números inteiros.
  - Subscrições ativas/direitos de subscrição.
  - Fusão, Cisão e Incorporação Completa de empresas.
  - Conversão de ativos (Ticker ITSA4 virando Ticker ITSA3).
