# PRD — Tax Report: Assistente de Declaração de IRPF para Renda Variável

## Visão Geral

O Tax Report é uma aplicação desktop que auxilia investidores pessoa física na declaração de Imposto de Renda (IRPF) sobre renda variável. O programa resolve o problema recorrente de calcular manualmente o preço médio de ativos, apurar ganhos e perdas mensais, determinar impostos devidos (DARF) e gerar os dados formatados para preenchimento da declaração anual.

O público-alvo inicial é o próprio desenvolvedor, mas a aplicação deve ter interface simples e intuitiva para viabilizar distribuição futura a outros investidores pessoa física que operam na bolsa de valores brasileira (B3).

O ano-base de referência é sempre o ano anterior ao ano corrente, e as alíquotas de tributação devem ser facilmente atualizáveis para acompanhar mudanças na legislação.

## Objetivos

- **Eliminar cálculo manual de preço médio**: o sistema deve calcular e persistir o preço médio ponderado de cada ativo automaticamente a partir das notas de negociação ou movimentações importadas.
- **Apurar ganhos e impostos mensais**: calcular automaticamente o ganho ou prejuízo líquido de cada mês, aplicar isenções e alíquotas corretas, e informar o valor do DARF devido.
- **Gerar relatório pronto para a declaração**: produzir os textos de discriminação e valores necessários para preencher a seção de Bens e Direitos do programa da Receita Federal.
- **Reduzir erros**: validar dados importados e manter consistência entre operações, preço médio e posição final.

**Métricas de sucesso:**

- O usuário consegue importar notas, calcular preço médio e gerar o relatório de bens e direitos em menos de 10 minutos.
- O cálculo de preço médio e imposto devido confere com cálculos manuais de referência em 100% dos cenários testados.

## Histórias de Usuário

### Persona primária: Investidor PF

1. Como investidor, eu quero **importar notas de negociação em PDF da XP** para que o sistema extraia automaticamente minhas operações de compra e venda sem digitação manual.

2. Como investidor, eu quero **importar um arquivo de movimentações** (CSV/Excel) para registrar operações de forma padronizada quando as notas de negociação não estiverem disponíveis ou forem de outra corretora.

3. Como investidor, eu quero **informar manualmente o preço médio e a quantidade de um ativo** para que o sistema use esses dados como base inicial, especialmente para ativos adquiridos em anos anteriores.

4. Como investidor, eu quero **visualizar o preço médio atualizado de cada ativo** após cada importação para conferir se os dados estão corretos.

5. Como investidor, eu quero **ver a apuração mensal de ganhos e perdas** para saber em quais meses tenho DARF a pagar e qual o valor.

6. Como investidor, eu quero **que o sistema compense automaticamente prejuízos de meses anteriores** para que eu pague apenas o imposto correto.

7. Como investidor, eu quero **gerar um relatório de bens e direitos com a posição em 31/12** do ano-base, com texto de discriminação pronto para copiar no programa da declaração.

8. Como investidor, eu quero **escolher qual operação realizar antes de enviar arquivos** para ter controle sobre o fluxo e não ser forçado a seguir uma sequência fixa.

9. Como investidor, eu quero **que meu preço médio fique salvo entre sessões** para não precisar reimportar todas as notas novamente.

### Caso extremo

10. Como investidor, eu quero **que o sistema me alerte se uma venda for importada para um ativo sem preço médio registrado** para que eu saiba que preciso informar o preço médio manualmente ou importar as compras anteriores.

## Funcionalidades Principais

### F1 — Menu de Operações

O usuário deve poder escolher livremente qual operação deseja realizar ao abrir o programa, sem ordem obrigatória.

**Por que é importante:** Dá flexibilidade ao usuário, que pode querer apenas consultar o relatório, ou apenas importar novas notas, ou corrigir um preço médio.

**Requisitos funcionais:**

- **RF-01**: A tela inicial deve apresentar as seguintes opções: "Importar Notas de Negociação", "Importar Movimentações", "Gerenciar Preço Médio", "Apuração Mensal / DARF", "Relatório de Bens e Direitos".
- **RF-02**: Cada opção deve levar à tela correspondente sem dependência sequencial.

---

### F2 — Importação de Notas de Negociação (PDF)

O sistema deve aceitar upload de um ou mais PDFs de notas de negociação da corretora XP (formato SINACOR/B3) e extrair automaticamente os dados de cada operação.

**Por que é importante:** As notas de negociação são o documento fiscal oficial das operações e contêm todos os dados necessários (preço, quantidade, taxas). Automatizar a extração elimina a principal fonte de erro e trabalho manual.

**Requisitos funcionais:**

- **RF-03**: O sistema deve aceitar upload de um ou mais arquivos PDF simultaneamente.
- **RF-04**: O parser deve extrair de cada nota: data do pregão, tipo de operação (compra/venda), ticker do ativo, quantidade, preço unitário, e custos operacionais (corretagem, emolumentos, taxa de liquidação, IRRF retido na fonte).
- **RF-05**: Após o parsing, o sistema deve exibir os dados extraídos em tela para conferência antes de confirmar a importação.
- **RF-06**: Ao confirmar, o sistema deve atualizar o preço médio dos ativos afetados e registrar as operações de venda para apuração de ganhos.
- **RF-07**: O parser deve ser implementado de forma modular (padrão strategy ou similar) para facilitar a adição de outras corretoras no futuro.

---

### F3 — Importação de Movimentações (CSV/Excel)

O sistema deve aceitar upload de um arquivo de movimentações em formato padronizado (CSV ou Excel) definido pelo próprio sistema, para cobrir cenários em que a nota de negociação não está disponível.

**Por que é importante:** Oferece uma alternativa para registrar operações de qualquer corretora, servindo como formato universal de entrada e facilitando a migração de dados existentes.

**Requisitos funcionais:**

- **RF-08**: O sistema deve definir um template de importação com as colunas: Data, Tipo (Compra/Venda), Ticker, Quantidade, Preço Unitário, Taxas Totais, Corretora.
- **RF-09**: O sistema deve disponibilizar o template para download pelo usuário.
- **RF-10**: Após o upload, o sistema deve validar o formato e exibir os dados para conferência antes de confirmar.
- **RF-11**: O processamento deve seguir a mesma lógica de atualização de preço médio e registro de operações da importação por PDF.

---

### F4 — Entrada Manual de Preço Médio

O usuário deve poder informar manualmente o preço médio e a quantidade de qualquer ativo, servindo como base inicial que importações posteriores atualizam.

**Por que é importante:** Permite que o usuário registre posições adquiridas em anos anteriores ou em corretoras sem suporte de importação, garantindo que o cálculo de ganhos futuros seja correto.

**Requisitos funcionais:**

- **RF-12**: O sistema deve oferecer um formulário para informar: Ticker, Preço Médio, Quantidade, Corretora.
- **RF-13**: Dados manuais devem funcionar como base inicial — importações posteriores de compras do mesmo ativo devem recalcular o preço médio considerando a posição manual existente.
- **RF-14**: O usuário deve poder editar e excluir entradas manuais enquanto não houver operações importadas vinculadas.
- **RF-15**: O sistema deve listar todos os ativos com preço médio registrado (manual ou calculado) com possibilidade de visualização e edição.

---

### F5 — Cálculo de Preço Médio

O sistema deve calcular o preço médio ponderado de cada ativo considerando todas as compras e os custos operacionais proporcionais.

**Por que é importante:** O preço médio é a base de cálculo do ganho de capital. Um cálculo incorreto resulta em imposto pago a mais ou a menos.

**Requisitos funcionais:**

- **RF-16**: O preço médio deve ser calculado como média ponderada: `(quantidade_anterior × preço_médio_anterior + quantidade_nova × preço_novo + custos_proporcionais) / (quantidade_anterior + quantidade_nova)`.
- **RF-17**: Custos operacionais (corretagem, emolumentos, taxa de liquidação) devem ser rateados proporcionalmente entre os ativos da nota e incorporados ao preço médio de compra.
- **RF-18**: Operações de venda devem reduzir a quantidade em carteira sem alterar o preço médio unitário.
- **RF-19**: O preço médio deve ser atualizado incrementalmente — o sistema não precisa reprocessar todo o histórico, apenas aplicar as novas operações sobre o preço médio persistido.

---

### F6 — Apuração Mensal de Ganhos e DARF

O sistema deve calcular mensalmente o ganho ou prejuízo líquido por tipo de ativo, aplicar isenções e alíquotas vigentes, compensar prejuízos acumulados e informar o valor do DARF devido.

**Por que é importante:** O investidor é obrigado a apurar mensalmente seus ganhos em renda variável e recolher o DARF até o último dia útil do mês seguinte. Automatizar esse cálculo evita erros e atrasos.

**Regras de tributação (consolidadas vigentes):**

| Tipo de Ativo | Alíquota | Isenção Mensal |
|---|---|---|
| Ações (swing trade) | 15% | Vendas até R$ 20.000/mês |
| FIIs | 20% | Sem isenção |
| ETFs renda variável | 15% | Sem isenção |
| BDRs | 15% | Sem isenção |

**Requisitos funcionais:**

- **RF-20**: Para cada operação de venda, o sistema deve calcular: `ganho_líquido = (preço_venda × quantidade) - (preço_médio × quantidade) - custos_operacionais_da_venda`.
- **RF-21**: O sistema deve consolidar ganhos e perdas por mês e por tipo de ativo (ações, FIIs, ETFs, BDRs).
- **RF-22**: Para ações, o sistema deve verificar se o total de vendas no mês é inferior a R$ 20.000; em caso positivo, o ganho é isento.
- **RF-23**: Para FIIs, ETFs e BDRs, não há isenção — qualquer ganho é tributável.
- **RF-24**: O sistema deve manter registro de prejuízos acumulados por categoria e compensá-los automaticamente em meses com lucro, respeitando a regra: prejuízos de ações compensam apenas ganhos de ações; prejuízos de FIIs compensam apenas ganhos de FIIs.
- **RF-25**: O sistema deve calcular o imposto devido aplicando a alíquota sobre o ganho líquido após compensação de prejuízos.
- **RF-26**: O sistema deve descontar o IRRF retido na fonte ("dedo-duro") do valor do DARF.
- **RF-27**: O sistema deve exibir para cada mês: total de vendas, ganho/prejuízo bruto, prejuízo compensado, base de cálculo, imposto devido, IRRF a compensar, e valor final do DARF.
- **RF-28**: As alíquotas e o limite de isenção devem ser configuráveis (constantes nomeadas ou configuração) para facilitar atualização quando a legislação mudar.

---

### F7 — Relatório de Bens e Direitos

O sistema deve gerar a posição de carteira em 31/12 do ano-base com todas as informações necessárias para preencher a ficha de Bens e Direitos da declaração de IRPF.

**Por que é importante:** É a saída principal do programa — o usuário precisa desses dados formatados para transcrever no programa da Receita Federal sem erros.

**Requisitos funcionais:**

- **RF-29**: O relatório deve listar cada ativo em carteira em 31/12 com: Ticker, Nome/Razão Social (quando disponível), CNPJ do emissor (quando disponível), Quantidade, Preço Médio Unitário, Valor Total (preço médio × quantidade), Corretora, Grupo e Código conforme classificação da Receita Federal.
- **RF-30**: Para cada ativo, o sistema deve gerar um texto de discriminação formatado e pronto para copiar, no padrão: `"[QTD] ações/cotas [TICKER] - [NOME EMPRESA]. CNPJ: [CNPJ]. Corretora: [CORRETORA]. Custo médio: R$ [PREÇO_MÉDIO]. Custo total: R$ [VALOR_TOTAL]."`.
- **RF-31**: O relatório deve ser exibido em tela com botão de copiar para cada campo/ativo.
- **RF-32**: O sistema deve classificar automaticamente os ativos nos grupos/códigos da Receita: Ações (Grupo 03, Código 01), FIIs (Grupo 07, Código 03), ETFs (Grupo 07, Código 09), BDRs (Grupo 03, Código 01).

---

### F8 — Persistência Local

O sistema deve armazenar localmente o preço médio e a posição de cada ativo para manter continuidade entre sessões.

**Por que é importante:** O usuário não deve precisar reimportar todas as notas cada vez que abre o programa. A persistência garante que o preço médio calculado se mantenha e possa ser atualizado incrementalmente.

**Requisitos funcionais:**

- **RF-33**: O sistema deve utilizar banco de dados local (SQLite) para armazenar os dados.
- **RF-34**: Devem ser persistidos no mínimo: ticker, preço médio atual, quantidade em carteira, corretora, e dados necessários para apuração (prejuízos acumulados por categoria, operações de venda do ano-base).
- **RF-35**: O sistema deve ser capaz de atualizar o preço médio incrementalmente com base no preço médio anterior, sem necessidade de reprocessar o histórico completo.
- **RF-36**: O sistema deve permitir backup e restauração do banco de dados (copiar/colar arquivo SQLite).

---

### F9 — Configuração de Alíquotas e Parâmetros Tributários

As regras de tributação devem ser facilmente atualizáveis para acompanhar mudanças legislativas.

**Por que é importante:** A legislação brasileira de tributação de renda variável pode mudar (ex.: MP 1.303 propõe alteração de alíquotas e limites de isenção). O sistema não deve exigir refatoração para se adaptar.

**Requisitos funcionais:**

- **RF-37**: As alíquotas por tipo de ativo, o limite de isenção mensal para ações e a alíquota de IRRF (dedo-duro) devem ser definidos como configuração centralizada.
- **RF-38**: A configuração deve ser acessível para edição (via interface ou arquivo de configuração).

## Experiência do Usuário

### Persona

Investidor pessoa física com conhecimento básico a intermediário de mercado financeiro. Familiarizado com o programa da Receita Federal mas sem conhecimento contábil avançado. Valoriza simplicidade e confiabilidade nos cálculos.

### Fluxo principal

1. O usuário abre o programa e vê o menu com as operações disponíveis.
2. Para primeira utilização, pode informar preço médio manualmente dos ativos que já possuía antes.
3. Importa notas de negociação (PDF) ou movimentações (CSV/Excel) do ano-base.
4. Confere os dados extraídos e confirma a importação.
5. Consulta a apuração mensal para verificar meses com DARF devido.
6. Gera o relatório de bens e direitos e copia os textos de discriminação para o programa da declaração.

### Requisitos de UI/UX

- Interface limpa com navegação clara entre as funcionalidades.
- Feedback visual imediato após importação (dados extraídos, erros encontrados).
- Botões de copiar visíveis e acessíveis no relatório.
- Mensagens de erro claras e acionáveis (ex.: "Ativo PETR4 possui venda registrada mas não há preço médio. Informe manualmente.").
- Uso de cores para indicar meses com DARF pendente (vermelho) e meses isentos/sem imposto (verde).

### Acessibilidade

- Textos com contraste adequado.
- Navegação por teclado nas funcionalidades principais.
- Labels semânticos em formulários.

## Restrições Técnicas de Alto Nível

- **Plataforma**: Aplicação desktop usando Electron (já definido na arquitetura do projeto).
- **Stack**: TypeScript, React (renderer), Node.js (main process).
- **Persistência**: SQLite local — sem servidor externo, sem necessidade de conexão com internet.
- **Parsing de PDF**: Necessário biblioteca de extração de texto de PDF para processar notas de negociação (formato SINACOR).
- **Extensibilidade de corretoras**: A arquitetura de parsing deve usar padrão que permita adicionar parsers de outras corretoras sem alterar o core.
- **Configurabilidade de regras tributárias**: Alíquotas e limites devem ser parametrizados, não hardcoded no meio da lógica de negócio.
- **Dados sensíveis**: O banco SQLite fica local na máquina do usuário. Não há transmissão de dados para servidores externos.

## Fora de Escopo

- **Day trade**: O MVP considera apenas operações de swing trade. Suporte a day trade poderá ser adicionado em versão futura.
- **Dividendos e JCP**: O sistema não apura rendimentos como dividendos (isentos) ou juros sobre capital próprio (tributável na fonte). Foco em posição de carteira e ganhos de capital.
- **Exportação de relatórios**: O MVP exibe dados em tela com opção de copiar. Exportação para PDF, CSV ou integração com o programa da Receita ficam para versões futuras.
- **Outras corretoras além da XP**: O parsing de notas de negociação em PDF será implementado apenas para a XP no MVP. A arquitetura deve facilitar adição de outras corretoras (Clear, Inter, Rico, etc.).
- **Operações com opções e derivativos**: Não estão no escopo do MVP.
- **Cálculo retroativo de anos anteriores**: O sistema apura o ano-base corrente. Não há funcionalidade de recalcular declarações de anos passados.
- **Integração com APIs da B3 ou Receita Federal**: Toda entrada de dados é via arquivo ou formulário manual.
