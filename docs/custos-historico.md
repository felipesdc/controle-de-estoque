# Custos e análises históricas

**Custos e histórico**, no menu e em Relatórios, permite à gestão consultar custo médio, valor do estoque, posição por data, evolução diária e trilha de avaliações. Administradores e gerentes consultam e avaliam. Funcionários continuam operando quantidades, sem informar ou consultar custos.

## Origem do custo

O método é custo médio móvel **por produto**, compartilhado pelos lotes na mesma unidade. Não é custo por lote, preço de venda ou apuração fiscal.

- Compra: cada recebimento utiliza o preço unitário em centavos do item confirmado do pedido, inclusive entrega parcial. Alterar o preço no cadastro do produto não modifica o custo de saldos já recebidos.
- Entrada manual na tela Movimentações: a gestão pode informar custo unitário em reais. Vazio/null significa desconhecido; zero significa custo gratuito confirmado. O valor faz parte da idempotência da movimentação.
- Saldo inicial: utiliza custo somente quando o preço de compra foi informado explicitamente no cadastro contextual que criou o produto. Vínculo a preço legado não gera avaliação presumida.
- Operação rápida: não solicita dados financeiros. Entradas sem custo deixam a avaliação do produto desconhecida, sem impedir a operação física.
- Saída: baixa proporcionalmente o valor pelo custo médio conhecido. Devolução ao fornecedor também usa o custo médio atual; não é reembolso pelo valor original da compra.
- Inventário: ajustes usam a base média conhecida no início da aprovação. Ela é preservada entre baixas e acréscimos de uma redistribuição entre lotes, mesmo quando o saldo passa temporariamente por zero. Não se presume valor para estoque sem base conhecida.
- Estorno: tenta inverter o valor registrado na operação original. Se o valor não existe, a unidade mudou ou a inversão exigiria valor negativo, o saldo físico pode ser corrigido, mas o custo fica explicitamente desconhecido. A trilha registra essa condição.

Uma entrada com custo conhecido não resolve uma parcela antiga de custo desconhecido: a avaliação inteira do produto permanece desconhecida. Ao zerar o saldo, o valor é zero; um novo ciclo com entradas custeadas volta a ter custo conhecido. Saldos sem custo são excluídos do total conhecido, que aparece como **parcial**, nunca como o valor completo do estoque.

## Avaliar o saldo antigo ou corrigir a base

Na posição de hoje, use **Informar custo-base** em um produto ativo com saldo. Informe custo por unidade e origem/justificativa. A avaliação aplica esse valor à quantidade atual, sem criar entrada, alterar lotes ou reescrever posições anteriores.

O servidor compara a referência de custo exibida. Movimentação ou avaliação concorrente exige nova consulta; repetir exatamente a chave da avaliação não grava outra. O histórico guarda data, responsável, motivo, unidade, quantidade e valor. Uma avaliação incorreta é corrigida por outra avaliação justificada, preservando a anterior.

Alterar unidade com saldo invalida a base de custo: não existe conversão automática. A posição antiga preserva a unidade capturada. Se quantidade/unidade divergir da referência de custo, uma nova referência desconhecida é registrada na próxima operação de reconciliação; não se reaproveita o valor incompatível.

## Histórico e cobertura

A migração 13 captura a posição atual de todos os produtos. Saldos positivos começam com custo desconhecido, mesmo quando há preço cadastrado ou compras antigas. Não altera movimentos, lotes, inventários ou credenciais, nem reaplica recebimentos.

**A cobertura histórica começa nessa atualização.** Datas anteriores são recusadas com a data inicial disponível; não se inventa uma posição financeira retroativa. Novos produtos têm referência zero na criação e só aparecem nas posições a partir do registro.

Posição por data considera os eventos registrados até o final daquele dia no calendário de São Paulo. Para hoje, considera somente o que já foi registrado. Estornos, avaliações e ajustes posteriores afetam o dia do registro, preservando os fechamentos anteriores. Datas são definidas pelo servidor; não há lançamento financeiro retroativo pela API.

A evolução diária mostra valor conhecido, quantidade de produtos e produtos sem custo. Não soma quantidades de unidades diferentes. Produto pode mudar de unidade entre dias, mas cada posição mantém sua referência. Nome, código e situação do produto exibidos são os atuais, explicitamente identificados como tais.

## Precisão e exportação

Quantidades são milésimos inteiros. Valores são calculados com `BigInt` em milionésimos de centavo e guardados como texto inteiro, sem ponto flutuante. Divisões usam arredondamento de metade para cima. Totais são apresentados em reais com duas casas; custo médio por unidade, com seis. O cálculo mantém as frações internas que não aparecem no total arredondado.

A API retorna valores monetários como **strings decimais exatas**, ou null quando desconhecidos. A interface formata sem converter valores grandes para Number. Não há soma de moedas diferentes: valores são gerenciais em reais.

CSV inclui todas as páginas, BOM UTF-8, ponto e vírgula e vírgula decimal. Códigos preservam zeros e textos são protegidos contra fórmulas. Valores com mais de 15 dígitos recebem apóstrofo para evitar perda de precisão ao abrir em planilhas; nesses casos são texto, não números para cálculo automático. Custo desconhecido permanece vazio e sinalizado, distinto de zero.

Limites: até 10.000 produtos por seleção/exportação; páginas de 10/25/50 produtos; evolução de até 366 dias, com limite de 200.000 eventos consultados. Refine produto/período se ultrapassar. Histórico de custo por produto é paginado. O download faz nova consulta consistente e pode refletir atualizações posteriores à tela.

## API

- `GET /v1/relatorios/custos`: `data=AAAA-MM-DD`, `q`, `pagina`, `tamanho`; data padrão é hoje.
- `GET /v1/relatorios/custos.csv`: mesma seleção, todas as páginas.
- `GET /v1/relatorios/custos/evolucao`: `inicio`, `fim`, `q`; período inclusivo.
- `GET /v1/relatorios/custos/evolucao.csv`: todos os dias da seleção.
- `GET /v1/produto/:id/custos/historico`: `pagina`, `tamanho`; eventos sem chaves/solicitação privada.
- `POST /v1/produto/:id/custo-base`: `{evento_id,unitario_centavos,motivo}`, com `Idempotency-Key`.
- Entrada manual: `movimento_custo_unitario_centavos` opcional, exclusivo de gestão. Omitido/null não presume preço de compra atual. Campo não é aceito em saída.

Rotas financeiras exigem autenticação e gestão, com `Cache-Control: no-store`. Custo, movimento e saldos são gravados na mesma transação. Falha na trilha financeira desfaz a movimentação inteira.

Testes: `custos.cjs`, `custos-http.cjs`, `custos-migracao.cjs`, regressões de estoque/compras/inventário e backup/restauração. `seed-custos-qa.cjs` gera exemplos e datas históricas sintéticas **somente** na base descartável da porta 8081.

Esta entrega não calcula frete, tributos, margem de venda, crédito de devolução ou demonstração contábil. Os alertas de validade por lote são descritos em [alertas-lotes.md](alertas-lotes.md).
