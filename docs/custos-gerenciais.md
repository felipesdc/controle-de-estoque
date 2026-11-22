# Custos gerenciais de aquisição

Implementação validada e aplicada localmente em 21/11/2026. Migração SQLite 15 aditiva: preserva saldos, custos anteriores, sessões e MFA. Não recalcula recebimentos antigos.

No recebimento, a gestão informa frete, despesas diretamente relacionadas à aquisição, descontos e tributos conforme documento. Valores são enviados em centavos inteiros, limitados a 1 trilhão de centavos por campo. Quantidades mantêm três casas. O valor interno utiliza microcentavos inteiros com BigInt.

A base é o valor dos itens efetivamente recebidos naquela entrega. Frete, despesas e tributos adicionais não recuperáveis aumentam o custo; descontos e tributos recuperáveis já incluídos reduzem o custo. Tributos informativos, recuperáveis adicionais e não recuperáveis já incluídos não geram outro acréscimo. É necessário evitar duplicar valores já embutidos no preço.

O total é rateado pelo valor das mercadorias, com distribuição determinística dos restos em microcentavos. Se todos os preços forem zero, o rateio é igual por linha, sem comparar quantidades de unidades diferentes. Custo total negativo é rejeitado. Recebimento, movimentação e custo são gravados na mesma transação e protegidos por versão e chave de idempotência.

Créditos comerciais são registros separados, imutáveis e idempotentes, vinculados à devolução. Não alteram o saldo, o custo histórico, nem registram recebimento de dinheiro ou emissão de documento fiscal. Valores de crédito não são inferidos do custo médio do estoque.

A margem bruta estimada compara o preço de venda cadastral com o custo médio atual. Exige saldo positivo, custo conhecido e preço positivo. É anterior a tributos da venda, despesas comerciais e descontos; não representa lucro realizado. A seleção de um fechamento antigo não transforma essa estimativa atual em margem histórica.

## Referência tributária

Perfil solicitado: Simples Nacional, São Paulo, hamburgueria. O IBGE relaciona hamburgueria à classe 56.11-2; o CNAE de referência para atendimento típico de lanchonete é 5611-2/03. Serviço completo de restaurante pode exigir outro enquadramento. Isso é referência de desenvolvimento, não alteração do cadastro fiscal da empresa. [IBGE/Concla](https://cnae.ibge.gov.br/?classe=56112&tipo=cnae&versao=9&view=classe).

A LC 214, art. 47, § 9º, impede apropriação de créditos de IBS/CBS pelo optante quando esses tributos forem recolhidos pelo Simples, sem a opção pelo regime regular. O sistema rejeita a classificação recuperável nesse cenário. A opção regular precisa ser efetiva e validada pela contabilidade; marcá-la no formulário apenas registra a informação, não exerce opção fiscal nem comprova direito a crédito. [Texto oficial atualizado, Senado](https://normas.leg.br/?urn=urn%3Alex%3Abr%3Afederal%3Alei.complementar%3A2025-01-16%3B214%21art47).

Não são aplicadas alíquotas universais de IBS/CBS nem calculados DAS, créditos fiscais, segregações de receitas ou enquadramento de produtos. Não há motor de tributação estadual de São Paulo. Os tratamentos dos demais tributos também dependem da classificação documental e validação contábil.

A regra gerencial segue a composição do custo de aquisição descrita no CPC 16, item 11: custos diretamente atribuíveis, descontos e tributos recuperáveis precisam ser considerados sem duplicidade. [CPC 16 publicado pela CVM](https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_16_R1_rev_13.pdf).

## Formulários e compatibilidade

Rotas administrativas antigas encaminham aos formulários atuais. Preços são informados dentro do produto; a API legada de preços mantém consulta para gestão e rejeita escrita com 405. Pedidos usam seletores remotos de fornecedores e produtos ativos, com até 25 opções por página. Entradas monetárias usam conversão decimal exata, sem arredondamento de ponto flutuante.

Custos e créditos de entregas e estimativas de margem ficam restritos à gestão. Recebimentos anteriores continuam consultáveis e não recebem composição tributária presumida.

## Reembolsos de devolução — 22/11/2026

Migração 16 acrescenta um livro de registros de recebimento vinculado a cada crédito comercial. A gestão informa valor já recebido, data, forma (Pix, transferência, dinheiro ou outro), comprovante e motivo. É possível receber parcialmente; a soma líquida não pode ultrapassar o crédito. A data deve ser válida e não posterior ao dia atual em São Paulo.

Este registro não executa transferência nem movimenta contas bancárias. Não substitui conciliação financeira, emissão fiscal ou apuração tributária. Frete, tributos informados e margem estimada continuam seguindo os critérios acima; nenhuma nova alíquota é aplicada nesta etapa.

Registros são imutáveis. Uma correção exige estorno justificado, preserva autor/data/original e reabre o saldo do crédito. O estorno não devolve dinheiro ao fornecedor. Cada recebimento e estorno tem chave de idempotência; transações concorrentes conferem o saldo na mesma transação SQLite. Campos de reembolsos são exibidos somente à gestão, junto aos créditos da devolução. Funcionários permanecem sem acesso financeiro.

Recebimento, crédito comercial e reembolso têm funções distintas: o primeiro forma o custo do estoque; o segundo registra o valor reconhecido pelo fornecedor; o terceiro registra evidência de dinheiro efetivamente recebido. Créditos, reembolsos e seus estornos não reescrevem o custo do estoque.
