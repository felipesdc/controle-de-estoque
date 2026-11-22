# Sugestão de retirada por vencimento

Nas saídas de **Operar estoque** e **Movimentações**, o seletor mostra o lote que vence primeiro entre os elegíveis. Confira a embalagem e toque em **Conferi o lote físico · usar sugestão** para selecioná-lo. A sugestão nunca escolhe um lote sozinha.

## Critérios

- Produto ativo e lote com saldo positivo.
- Validade real no formato AAAA-MM-DD, conhecida e maior ou igual ao dia atual em America/Sao_Paulo. Um lote que vence hoje pode ser sugerido.
- Unidade do lote compatível com o cadastro atual do produto, pelo identificador. Unidade ausente em ambos continua compatível conforme a regra já usada no registro.
- Primeiro a validade mais próxima; em empate, o lote registrado antes e, depois, o menor ID.

A seleção considera todos os lotes do produto, independentemente da busca e da página exibida. Não há janela máxima de 30 dias: se o próximo vencimento for distante, ele continua elegível. A validade cadastral do produto não é utilizada.

Lotes vencidos, zerados, sem validade válida ou com unidade incompatível não são recomendados. A tela informa os grupos excluídos com saldo; eles podem se sobrepor. Saldo sem lote identificado não ganha uma validade presumida. Quando não houver candidato, será necessário conferir e escolher manualmente.

## Confirmação e quantidade

Nas saídas, é preciso escolher explicitamente um lote ou **Sem lote identificado** antes de revisar/registrar. Consultar novamente, atualizar a sugestão ou trocar o produto invalida a escolha anterior. Entradas e consultas mantêm o fluxo existente, sem sugerir retirada.

A quantidade não é preenchida nem repartida automaticamente. Uma movimentação usa um lote. Se o saldo sugerido não bastar, informe a quantidade correspondente e registre outra retirada para o restante, sempre após conferir o estoque físico.

A sugestão é orientação operacional, não uma avaliação da condição física do produto nem uma reserva. Outro usuário pode consumir o saldo entre a consulta e o registro. A API revalida o lote e a quantidade na transação e rejeita saldo insuficiente; nunca troca automaticamente pelo próximo lote ou pelo saldo sem lote.

A seleção manual de outros lotes continua disponível, inclusive para registrar baixas que já eram permitidas. O sistema não cria uma nova política de bloqueio para produtos vencidos; validade e adequação precisam ser conferidas conforme a finalidade da operação. As permissões de funcionários seguem limitadas a entradas e saídas, sem cadastro ou estorno.

## API e implantação

`GET /v1/produto/{produto_id}/lotes` inclui `retirada`, com candidato, motivo, avisos e critério. É leitura autenticada com Cache-Control no-store. O campo `confirmacao_obrigatoria` descreve o fluxo da interface; não adiciona um comprovante de conferência física no corpo da API de movimentações. O contrato de registro, idempotência e histórico é preservado.

Não há migração de dados, reserva de lotes ou nova dependência. O banco continua no esquema 14. Testes cobrem datas inválidas, limites de São Paulo e horário de verão histórico, desempate, lotes fora da primeira página, frações, produto inativo, unidades ausentes/incompatíveis, esgotamento e tentativa com sugestão desatualizada.
