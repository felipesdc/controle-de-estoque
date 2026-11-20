# Alertas de validade por lote

A Visão geral usa **validade e saldo de cada lote**. A data do cadastro do produto continua independente e não é atribuída aos lotes nem ao saldo sem lote identificado.

## Indicadores e prioridades

- Produtos com lotes vencidos: produtos ativos distintos com ao menos um lote com saldo positivo e data anterior a hoje.
- Produtos com lotes a vencer: produtos ativos distintos com lote com saldo positivo entre hoje e 30 dias, inclusive.
- Abaixo de cada indicador aparece a quantidade de lotes correspondente. Um produto pode estar nos dois grupos; esses totais não devem ser somados como produtos distintos.
- Atenção à validade: prévia de seis lotes, vencidos primeiro, depois os que vencem hoje e nos próximos 30 dias. Cada linha informa produto, código do lote, validade, saldo do lote e unidade registrada.
- Saldo sem validade conhecida: produtos ativos com saldo sem lote ou com lote cuja data é ausente/inválida. Prévia de seis saldos, sem somar quantidades entre unidades. Os totais indicam separadamente produtos com saldo sem lote e lotes sem validade; os grupos podem se sobrepor.

A referência usa o calendário nomeado `America/Sao_Paulo`. Lotes zerados, produtos inativos e vencimentos além de 30 dias ficam fora das prioridades. Data inválida é tratada como desconhecida e normalizada para null nas consultas, sem alterar o registro armazenado nem quebrar a formatação da interface.

A ausência de alertas datados **não** confirma que todo o estoque está no prazo: confira também as pendências sem validade conhecida. As consultas não alteram saldos, não selecionam um lote pelo funcionário e não bloqueiam automaticamente saídas por vencimento.

## Consultar todos os alertas

Os indicadores e links da Visão geral abrem `/home/lotes/alertas` com o filtro correspondente. Também é possível chegar pela tela Lotes e validades.

Filtros disponíveis:

- Vencidos e até 30 dias (padrão).
- Somente vencidos ou somente os que vencem hoje.
- Hoje e próximos 30 dias.
- Sem validade conhecida (lotes sem data válida e saldos sem lote).
- Sem lote identificado.
- Todos os saldos positivos, incluindo lotes depois de 30 dias.

Busca por nome do produto, código de barras, código do lote ou ID do produto; `%` e `_` são literais. Paginação de 10, 25 ou 50 registros. Indicadores abrangem toda a seleção, incluindo outras páginas. Filtros e paginação ficam na URL, preservando retorno, atualização e links diretos. Ordenação tem desempates estáveis por produto/código/id.

**Conferir lotes** abre o produto e preenche a busca pelo código do lote, preservando zeros à esquerda. Isso apenas filtra a consulta: não seleciona um lote para movimentação. Para saldo sem lote, o resumo do produto informa a quantidade não identificada. A gestão pode usar inventário por lote para identificar o saldo fisicamente conferido; veja [inventario-lotes.md](inventario-lotes.md).

Catálogo e relatório de posição de estoque mantêm suas datas do **cadastro do produto**, com rótulos e links que distinguem essas consultas dos alertas por lote.

## API e compatibilidade

`GET /v1/lotes/alertas` exige autenticação; todos os perfis autenticados podem consultar. Não amplia permissões de escrita ou acesso financeiro. Respostas de alertas e painel têm `Cache-Control: no-store`.

Parâmetros: `q` (até 100 caracteres), `vencimento=atencao|vencidos|hoje|em_breve|sem_validade|sem_lote|todos`, `pagina`, `tamanho=10|25|50`. Filtros inválidos retornam 400. Página acima do total é ajustada para a última disponível.

Retorno: `itens`, `resumo` da seleção, `total`, paginação, `gerado_em`, `filtros` e `criterios` com data de referência e limite de vencimento. Cada item tem `origem=lote|sem_lote`, produto, identificação, validade normalizada, situação e quantidade na unidade informada. Um saldo sem lote tem `lote_id` e `lote_codigo` nulos.

Em `GET /v1/dashboard`, `totais.vencidos` e `totais.vencem_em_breve` continuam contando produtos, mas agora a partir dos lotes. Novos contadores `lotes_vencidos`, `lotes_vencem_em_breve`, `lotes_vencem_hoje`, `produtos_sem_validade`, `lotes_sem_validade`, `produtos_sem_lote`; nova prévia `pendencias_validade`. `vencimentos` contém linhas por lote, com saldo daquele lote. `criterios.origem_validade=lote` identifica a regra. Não há migração de banco nesta etapa; o esquema permanece na versão 13.

Testes: `dashboard.cjs`, `dashboard-http.cjs`, `alertas-lotes.cjs`, `alertas-lotes-http.cjs`, além das regressões de estoque mínimo, consulta de lotes, catálogo, relatórios e OpenAPI. A fixture `seed-alertas-lotes-qa.cjs`, após os lotes demonstrativos, prepara somente a base descartável da porta 8081: dois produtos/3 lotes vencidos, dois produtos/4 lotes a vencer e prévia limitada a seis de sete alertas. A base principal não recebe dados fictícios.

Sugestão de retirada por vencimento continua como evolução futura, mantendo a confirmação do lote físico. Esta entrega não instala notificações por e-mail ou execução automática de baixas.
