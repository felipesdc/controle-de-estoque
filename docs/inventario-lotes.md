# Inventário físico por lote

As novas contagens abertas pela interface usam o modo **por lote**. Administradores e gerentes podem abrir, contar, revisar, aprovar e cancelar; funcionários, mesmo autorizados a movimentar estoque, não operam inventários.

## Conferir o estoque

1. Abra **Inventário físico → Nova contagem**, informe título e selecione até 100 produtos ativos.
2. Para cada produto, conte separadamente os lotes e o **saldo sem lote identificado**. Lotes zerados na unidade atual também aparecem: informe zero quando confirmar ausência. Campo vazio significa não contado.
3. Use a busca e as páginas de dez contagens de cada produto. Os valores das outras páginas permanecem preservados. O progresso considera todas as páginas, e a soma por produto aceita até 1 bilhão, com três casas decimais.
4. Salve e envie à revisão. Confira cada divergência: o total do produto pode estar correto enquanto dois lotes precisam de ajustes opostos.
5. Aprove com justificativa. Somente essa ação altera o estoque, vinculando os movimentos ao inventário e a cada lote ou saldo sem lote.

Cada inventário admite até 2.000 contagens, incluindo os saldos sem lote. A abertura é recusada integralmente se o limite for excedido; nenhum lote é omitido. Lotes zerados em unidades anteriores permanecem históricos e não são contados na unidade atual.

## Lote encontrado durante a conferência

Salve as contagens já digitadas e use **Identificar lote encontrado** no produto correspondente. Informe código, validade opcional e justificativa. Não é necessário simular uma compra.

Essa ação cadastra o lote com saldo zero, acrescenta uma referência zero ao inventário e registra responsável, data e motivo. Não altera o saldo do produto ou cria entrada de estoque. O novo campo começa vazio e precisa ser contado antes de revisar. Código repetido é recusado: utilize o lote existente.

A identificação permanece cadastrada com seu histórico se o inventário for cancelado; quantidades não aprovadas não entram no estoque. Outros inventários abertos do mesmo produto ficam com referência alterada e precisam ser reiniciados. A própria contagem que registrou o lote mantém uma referência válida e preserva as demais quantidades salvas.

É possível identificar o saldo antigo fisicamente confirmado: por exemplo, referência de 5 sem lote e lote novo zerado, contagem de 1 sem lote e 4 no lote encontrado. A aprovação registra saída de 4 sem lote e entrada de 4 no lote, com total do produto inalterado e ambos os movimentos auditados. Não atribua validade ou lote a quantidades que não foram conferidas.

## Referências e correções

A abertura captura saldo total, unidade, último movimento e composição por lote. Qualquer movimentação posterior do produto, mesmo que depois o total seja restabelecido, bloqueia revisão e aprovação. Mudança de unidade, inativação e mudança no conjunto de lotes também invalidam a referência.

**Reiniciar contagem** captura novamente toda a referência, inclui os lotes novos e limpa todas as quantidades. Os saldos e contagens anteriores, inclusive identificação e validade dos lotes, ficam preservados no evento de recontagem. Não há bloqueio operacional do estoque durante a contagem.

Aprovação é atômica: primeiro são aplicadas as baixas, depois os acréscimos, evitando ultrapassar temporariamente o limite do produto durante uma redistribuição. Falha em qualquer movimento reverte produtos, lotes, vínculos, evento e situação do inventário. Repetir a aprovação com a mesma chave e conteúdo não aplica ajustes novamente.

Inventários aprovados ou cancelados são imutáveis. Ajustes não admitem estorno isolado; abra outra contagem para corrigir. Histórico de movimentações direciona ao inventário. Esses ajustes são excluídos do consumo operacional e não alteram quantidades recebidas/devolvidas de compras.

## Inventários anteriores

A migração 12 preserva os inventários gerais anteriores, suas quantidades, versões, chaves e movimentos. Não inventa referências por lote para contagens antigas, inclusive as que estavam abertas ou em revisão.

Inventários gerais continuam funcionando com as regras anteriores: não podem reduzir produtos com saldo identificado por lote. Para corrigir esses saldos, cancele a contagem geral em andamento e abra uma nova contagem por lote. Nenhum inventário finalizado precisa ser convertido.

## API

- `POST /v1/inventarios`: `{titulo, produtos:[1], modo:'lotes'}`, com `Idempotency-Key`. Omitir modo mantém `produto` por compatibilidade com clientes anteriores.
- `PATCH /v1/inventarios/:id`: `{versao, itens:[{produto:1,lote_id:12,quantidade:2.125},{produto:1,lote_id:null,quantidade:0}]}`. No modo lotes, `lote_id` é obrigatório; `null` identifica saldo sem lote. Aceita salvamento parcial e `quantidade:null` para limpar uma contagem.
- `POST /v1/inventarios/:id/lotes`: `{versao,produto:1,lote:{codigo:'000ABC',validade:null},motivo:'Identificado na conferência física'}`, com `Idempotency-Key`. Somente aberto, modo lotes, produto incluído e referência válida.
- Revisão, aprovação, cancelamento e recontagem mantêm os endpoints anteriores. Aprovação exige `Idempotency-Key`; versões impedem sobrescrever alterações de outra sessão.
- Detalhes incluem `modo`, totais por produto e `itens[].lotes[]`, com código/validade capturados, referência, contado, diferença, saldo atual e movimento de ajuste. Eventos incluem identificação, alterações em milésimos, ajustes e referências anteriores.

Validação: `inventario-lotes.cjs`, `inventario-lotes-http.cjs`, `inventario-lotes-migracao.cjs`, regressões dos fluxos anteriores e teste completo de backup/restauração com contagem aprovada e lote identificado durante conferência. A fixture `seed-inventario-lotes-qa.cjs` exige o ambiente descartável da porta 8081 e os dados de `seed-lotes-qa.cjs`.
