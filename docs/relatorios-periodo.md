# Relatórios de consumo e compras

Em **Relatórios**, escolha **Consumo** ou **Compras e pendências**. O período inicial cobre os últimos 30 dias no calendário de São Paulo. Datas inicial e final são inclusivas; aplique os filtros para atualizar a consulta e liberar a exportação. Todos os perfis autenticados podem consultar e exportar, sem novas permissões de escrita.

## Consumo: saídas operacionais

O relatório conta saídas operacionais auditáveis e agrupa por produto e unidade registrada na operação. O ranking usa número de saídas, sem comparar quantidades de unidades diferentes. Nomes e códigos de produto são atuais.

- Exclui entradas, estornos, operações já estornadas até o momento da consulta, devoluções de compras e ajustes de inventário. Um estorno feito depois do período pode retirar a saída daquele período numa consulta posterior.
- Movimentos legados sem saldo auditável e datas inválidas não entram. Uma saída manual pode ter várias finalidades; o relatório não identifica automaticamente venda, perda ou consumo final.
- A migração 10 passa a guardar unidade e rótulo nas novas movimentações. Não atribui a unidade atual às antigas: saídas sem unidade histórica contam como operações, mas sua quantidade agregada fica vazia.
- Um produto pode ter vários grupos se a unidade ou seu rótulo mudarem. Não há soma entre grupos. O rótulo capturado permanece preservado mesmo após renomear a unidade.
- Quantidades são calculadas em milésimos; grupos acima de 1 trilhão de unidades são rejeitados para preservar precisão de apresentação. Reduza o período nesses casos.

## Compras e pendências

O período seleciona a **data de criação do pedido**, e não a data de recebimento. Os recebimentos e devoluções são acumulados até o momento da consulta, inclusive quando ocorreram depois do período selecionado.

O padrão mostra somente itens a receber de pedidos confirmados ou parciais. Também é possível consultar todas as situações ou uma específica. Rascunhos/cancelados não geram pendência; pedidos encerrados mostram o saldo encerrado. Devoluções não reabrem a quantidade a receber. Pedidos do fluxo legado são excluídos.

Cada linha mostra item, produto, unidade do pedido, quantidades pedida, recebida, devolvida, pendente e encerrada. Os indicadores contam pedidos distintos e itens da seleção; não somam quantidades entre unidades nem apresentam avaliação financeira. Nome do produto e rótulo da unidade são atuais, mas o vínculo de unidade é o gravado no item do pedido. O link do pedido abre seus detalhes.

## Exportação e consistência

Consultas têm paginação de 10, 25 ou 50 linhas, com indicadores sobre toda a seleção. O CSV inclui todas as páginas filtradas, até 10.000 linhas. Usa UTF-8 com BOM, ponto e vírgula, vírgula decimal, escape de aspas/quebras de linha e proteção de fórmulas. Códigos de produto recebem apóstrofo para preservar zeros ao abrir em planilhas. O arquivo é de consulta, sem contrato de reimportação.

Cada consulta ou download usa uma transação consistente. O download é uma nova consulta e pode refletir alterações posteriores à tela. Data de geração e filtros são incluídos nas linhas exportadas. Exportações vazias contêm somente cabeçalhos. A aplicação não reconstrói saldos ou pendências como estavam no fim de uma data histórica.

Endpoints JSON/CSV, documentados no Swagger:

- `/v1/relatorios/consumo` e `/v1/relatorios/consumo.csv`;
- `/v1/relatorios/compras` e `/v1/relatorios/compras.csv`.

Filtros: `inicio`, `fim`, `q`, `pagina`, `tamanho`; compras aceita também `estado` (`pendentes`, `todos`, `rascunho`, `confirmado`, `parcial`, `recebido`, `encerrado`, `cancelado`). Consultas não usam cache.

## Demonstração

Os exemplos da porta 8081 incluem quatro saídas válidas (uma sem unidade histórica), uma saída estornada, uma devolução fora do consumo, um pedido parcial com dois itens pendentes, um encerrado, um cancelado e um rascunho. O fixture `seed-relatorios-periodo-qa.cjs` roda somente na base descartável, após os fixtures de reposição e antes dos inventários.
