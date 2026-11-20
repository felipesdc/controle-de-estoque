# Lotes e validades

A migração 11 cria o controle de lotes sem modificar quantidades existentes. Todo saldo anterior permanece **sem lote identificado**. A data de validade do cadastro do produto continua sendo um dado independente: ela não é copiada para lotes nem representa a validade de todo o estoque.

## Receber e consultar

Em **Pedidos → Registrar recebimento**, a gestão pode informar código do lote e validade opcional. Cada item aceita um lote por entrega; para dois lotes do mesmo produto, registre dois recebimentos parciais. Sem código, o recebimento entra no saldo sem lote. Validade sem código é rejeitada pela interface.

O código preserva zeros e diferencia maiúsculas/minúsculas. O mesmo código no mesmo produto agrega saldo apenas quando validade e unidade são idênticas; divergências exigem corrigir os dados antes da confirmação. Datas inválidas são rejeitadas. Um lote pode não ter validade conhecida. Não há edição ou exclusão de identidade de lotes nesta etapa.

**Lotes e validades**, no menu e no catálogo, mostra saldo total, identificado e sem lote; busca por código, filtro com saldo e paginação. Lotes são ordenados pela validade, com desconhecidas ao final. Rótulos de vencido/hoje/até 30 dias usam a data de São Paulo. O vencimento é informativo e não bloqueia movimentação automaticamente. O painel usa as validades e os saldos dos lotes e separa pendências de validade; veja [alertas-lotes.md](alertas-lotes.md).

## Movimentar e devolver

Operação rápida e formulário de movimentações permitem escolher um lote existente ou “Sem lote identificado”. Não há seleção automática pelo vencimento. Uma movimentação usa um único lote; registre operações separadas quando utilizar mais de um. A revisão no tablet mostra o lote escolhido. Quantidade e associação ao produto/unidade são revalidadas ao confirmar.

Funcionários autorizados continuam restritos a entradas e saídas. Podem escolher lotes existentes; a criação de lotes acontece no recebimento ou na identificação durante inventário, ambos restritos à gestão. Cadastros e estornos permanecem restritos à gestão.

Saída sem lote consome apenas saldo sem lote; saldo de outros lotes não cobre falta no lote selecionado. O estorno usa o lote original e exige saldo nesse lote ao reverter uma entrada. Histórico registra lote e validade.

Devoluções de compra exigem saldo recebido disponível naquele **item e lote**, além do estoque físico disponível no lote. O saldo não reabre a quantidade pendente de compra. Entregas históricas sem lote continuam devolvíveis pelo saldo sem lote, respeitando limites e estornos antigos.

## Integridade e inventário

Os saldos identificados são inteiros em milésimos. O saldo sem lote é a diferença entre saldo total do produto e soma dos lotes. Produto, lote, movimento e entrega são atualizados na mesma transação; falhas revertem toda a operação. Chaves de idempotência incluem o lote escolhido ou sua identidade no recebimento. Repetições exatas concluídas não debitam nem recebem novamente.

A unidade do produto não pode mudar enquanto houver saldo por lote. Lotes históricos impedem excluir a unidade vinculada, inclusive com saldo zero, e preservam seu rótulo capturado. Um lote antigo com outra unidade não pode receber novas movimentações.

As novas contagens usam o inventário por lote, incluindo saldo sem lote e lotes zerados na unidade atual. A gestão pode identificar um lote encontrado na conferência sem simular uma compra; a identificação tem saldo zero e só a aprovação das quantidades cria ajustes. Isso permite atribuir de forma auditável o saldo antigo fisicamente confirmado a um lote, inclusive com total do produto inalterado. Inventários gerais anteriores são preservados com suas restrições. Veja [inventario-lotes.md](inventario-lotes.md).

## API e validação

- `GET /v1/produto/:produto_id/lotes`: autenticado, `Cache-Control: no-store`; filtros `q`, `estado=todos|disponiveis`, `pagina`, `tamanho=10|25|50`.
- Recebimento: item `{item, quantidade, lote?: {codigo, validade?: 'AAAA-MM-DD' | null}}`.
- Devolução: item `{item, quantidade, lote_id?: number | null}`.
- Movimentação: `movimento_lote_id?: number | null`.

Testes isolados: `lotes.cjs`, `lotes-http.cjs`, `lotes-migracao.cjs`, além das regressões de compras, entregas, estoque, inventário, catálogo, códigos e relatórios. Dados demonstrativos devem ser gerados exclusivamente no ambiente descartável da porta 8081.

Indicadores consolidados de validade por lote estão no painel. Próximo passo possível: sugestão pelo vencimento com confirmação do lote físico.
