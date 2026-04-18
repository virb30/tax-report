# Template de Documento de Requisitos do Produto (PRD)

## Visão Geral

A funcionalidade de "Exportação de Posição Anual em Excel" permitirá que o usuário faça o download de suas posições de ativos calculadas até o dia 31/12 de um ano recém-selecionado. O arquivo será criado no formato Excel, consolidando de maneira estática a posição atual da carteira. Esse relatório possui dupla finalidade: servir como uma ferramenta de visualização (backup/relatório base) de consulta futura e como um espelho de dados perfeito, pronto para ser usado como "Posição Inicial" na funcionalidade de importação para carteiras de anos subsequentes (ex: carregar posição do fechamento de 2024 para inciar a carteira de 2025).

## Objetivos

 - **Como é o sucesso**: Usuários conseguem gerar o relatório Excel de 31/12 contendo todos os ativos de sua carteira (saldo positivo) e utilizar esse exato arquivo com sucesso no fluxo já existente de *Importação de Posição Inicial*.
 - **Método secundário de transferência**: Criar e estabelecer um meio alternativo à migração direta via sistema, garantindo redundância na persistência da posição inicial e na portabilidade dos dados se necessário (backup estático).
 - **Métricas principais para acompanhar**: Ausência de erros na formatação, download bem-sucedido via UI e o nível de esforço técnico na reutilização da leitura de XLS do pacote parser nativo do projeto (`CsvXlsxConsolidatedPositionParser`).


## Histórias de Usuário

- **Como um investidor**, eu quero exportar a posição com o preço médio e quantidades da minha carteira de ativos no dia 31 de dezembro em um formato de planilha compatível, para que eu tenha um registro de posição estática que me sirva de posição no próximo ano em outra carteira ou conferência externa.
- **Como um investidor com múltiplos ativos liquidados**, eu quero que ativos completamente zerados até o ano de seleção sejam omitidos da extração, para que minha planilha de posição contenha apenas o saldo válido, focando apenas no patrimônio retido real.


## Funcionalidades Principais

As entregas deste PRD estão em gerar e formatar a planilha de acompanhamento e transferência de posição.

- **Exportador em Formato `.xlsx`**: Criação do serviço que captura o estado dos ativos do ano sob seleção, e mapeia esse estado em dados tubulares do Excel.
  - O que ela faz: Exporta os ativos e preços médios em XLSX.
  - Por que é importante: Torna a portabilidade e prestação de contas muito mais tangível e compatível com ferramentas com as quais o investidor tem afinidade ou com o próprio _Tax Report_.
  - Como funciona em alto nível: Uma action dentro de uma nova aba na UI do ano vai interagir com um IPC caller, que calculará as posições e o serviço fará gravação das colunas compatíveis no Excel na máquina do usuário.

- **Requisitos Funcionais**:
  1. A exportação resultará exclusivamente em um arquivo de extensão `.xlsx`.
  2. O documento exportado deve contemplar **obrigatoriamente** as exatas colunas esperadas pelo parser de "posição inicial" já existente na base de código: `Ticker`, `Quantidade`, `Preco Medio` e `Corretora`.
  3. No processamento da carteira de fechamento do ano alvo, quaisquer ativos em que a transação total resulte numa quantidade igual a zero (`0`) devem ser ignorados e omitidos do arquivo final exportado.
  4. Nenhum ativo ou preço médio deverá demonstrar valores negativos.

## Experiência do Usuário

- **Acesso**: A opção de exportação deverá estar disponível em uma **aba separada e dedicada** a isso, possivelmente no nível de listagem dos relatórios/configurações do ano para dar evidência a ação, desassociando de operações comuns do dia a dia.
- **Fluxos**
  - Usuário clica na nova aba de "Exportação de Posição".
  - O usuário aciona o botão de exportar XLS.
  - O app sugere ou pede o caminho onde usuário deseja salvar o arquivo nativamente.
  - Feedback visual exibido alertando sucesso ou falha da extração na tela.


## Restrições Técnicas de Alto Nível

- O formato dos dados (campos numéricos vs texto) no Excel gerado não poderá induzir o parser `CsvXlsxConsolidatedPositionParser` já existente a nenhum erro ou validação rejeitada.
- O arquivo exportado deve se apoiar na mesma biblioteca usada atualmente pelo projeto (ex: SheetJS/`xlsx`) minimizando inchaço das dependências da aplicação primária.

Detalhes de implementação serão abordados na Especificação Técnica.

## Fora de Escopo

- Gerar o arquivo num formato adicional, além do `.xlsx`, como CSV, PDF e TXT. (Apenas `.xlsx` por hora).
- Um fluxo automatizado em um clique de ponteker "Migrar deste Ano para o Próximo", o escopo desta _feature_ se reduz à entrega e download do Excel na máquina do usuário. (Já existe `MigrateYearModal`, a exportação é apenas o documento bruto secundário).
- Preencher colunas além das 4 mandatórias da importação da posição: tickers de notas não farão parte deste dump e sim uma aglomeração macro de médias de ativos.
