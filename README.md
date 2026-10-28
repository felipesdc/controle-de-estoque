# Controle de estoque

Aplicação unificada em um monorepositório: Angular 18 em `apps/web` e Express/TypeScript em `apps/api`. SQLite substitui PostgreSQL; não é necessário contratar ou iniciar um servidor de banco.

## Executar com Docker

Requer Docker com Compose v2. Na raiz:

```sh
cp .env.example .env
# Preencha JWT_SECRET (32 caracteres ou mais) e ADMIN_PASSWORD (12 ou mais).
docker compose up --build -d
```

Abra http://localhost:8080 e entre com `admin` e a senha definida em `.env`. Se o `.env` já existir, mantenha-o: a preparação local gerou credenciais aleatórias. Consulte esse arquivo para obter a senha. Não o versione.

- API: `/v1`, no mesmo endereço do frontend.
- Documentação existente: http://localhost:8080/api-docs (ainda contém exemplos legados).
- Saúde: http://localhost:8080/health.
- Logs: `docker compose logs -f`.
- Parar mantendo os dados: `docker compose down`.

A API cria o esquema versionado e um administrador somente na primeira inicialização. Alterar `ADMIN_PASSWORD` depois não redefine usuários existentes. As credenciais do PostgreSQL antigo não são utilizadas.

## Dados e backup

O arquivo `/data/estoque.sqlite` fica no volume nomeado `estoque-data` do Compose, juntamente com os arquivos WAL. O banco usa chaves estrangeiras e índices nas relações. Reiniciar ou reconstruir os containers preserva os dados. `docker compose down -v` **apaga a base**.

Para backup consistente, pare a API e copie o diretório completo:

```sh
docker compose stop api
docker compose cp api:/data ./backup-estoque
docker compose start api
```

Guarde o backup fora do repositório. Restaure com a API parada, copiando os arquivos de volta e mantendo a permissão de escrita do usuário `node`.

## Desenvolvimento

A API requer Node >= 22.18, por usar `node:sqlite`. Instale com `npm ci` em cada app. Na API, configure `JWT_SECRET`, `ADMIN_PASSWORD` e opcionalmente `SQLITE_PATH`/`ADMIN_EMAIL` no ambiente ou em `apps/api/.env`, depois execute `npm run dev`. O frontend mantém `http://localhost:3000/v1` em desenvolvimento e usa `/v1` na imagem Docker.

O build Angular usa Node 22. A API mantém temporariamente a interface `query()` dos modelos legados, com parâmetros preparados e conversão explícita de booleanos e datas. O driver é síncrono, adequado ao porte atual; operações extensas precisam ser revistas antes de ampliar o volume de uso.

## Históricos anteriores

Os diretórios Git dos dois projetos foram preservados em `.repository-history/web.git` e `.repository-history/api.git`, ignorados pelo novo repositório. Nada foi publicado, nem os remotos antigos foram alterados. Para consultar o histórico original:

```sh
git --git-dir=.repository-history/web.git log --oneline
git --git-dir=.repository-history/api.git log --oneline
```

O novo repositório raiz contém os dois aplicativos como arquivos normais. Os históricos antigos não foram incorporados à sua linha de commits; mantenha a cópia local até decidir arquivá-los ou importá-los.

## Próxima evolução

Veja [o plano de evolução](docs/evolucao.md). A tela de Movimentações agora possui entrada, saída, histórico e estorno. Os demais módulos preservam grande parte da interface original. As regras de estoque são transacionais e há autorização por perfil para produtos, movimentações, usuários e perfis; os cadastros legados ainda precisam de revisão das regras de negócio.

Referências técnicas: [SQLite do Node 22](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html) e [ordem de inicialização do Compose](https://docs.docker.com/compose/how-tos/startup-order/).

## Verificações

Com os containers iniciados:

```sh
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/database.cjs
docker compose exec -T api node < apps/api/tests/http.cjs
```

O primeiro comando testa a compatibilidade SQL e integridade em memória. O segundo testa frontend e API pelo Nginx e cria uma categoria de teste na base local; seu ID fica em `/tmp/estoque-http-test.json` no container da API para a verificação de persistência.

Para concluir esse teste, reinicie a API, aguarde a saúde e confirme a persistência (também remove a categoria criada):

```sh
docker compose restart api
docker compose up -d --wait
docker compose exec -T api node < apps/api/tests/persistence.cjs
```


## Fluxo de estoque

Abra **Movimentações** no menu lateral, ou acesse http://localhost:8080/home/movimentacoes. Cadastre um produto, registre entradas e saídas e consulte o saldo após cada operação. A quantidade aceita até três casas decimais. Administradores e gerentes registram operações; os demais perfis consultam.

O saldo inicial informado no cadastro gera uma entrada automaticamente. Para alterar o saldo depois, registre uma movimentação. Inativar um produto preserva seu estoque. Movimentações confirmadas não podem ser editadas ou excluídas; use **Estornar**, com um motivo. Cada registro admite um estorno, e estornar uma entrada exige saldo disponível.

API:

- `POST /v1/movimentacao-estoque`: corpo com `movimento_produto_id` (número), `movimento_tipo` (`entrada` ou `saida`), `movimento_quantidade` (número positivo) e `movimento_observacao` opcional.
- `POST /v1/movimentacao-estoque/:id/estorno`: corpo `{ "motivo": "Justificativa da correção" }`.
- Ambos exigem JWT e cabeçalho `Idempotency-Key` com chave única de 16 a 80 caracteres (letras, números, sublinhado ou hífen; um UUID é aceito). Reutilize a mesma chave ao repetir a mesma tentativa. Uma operação diferente exige outra chave.
- Data e responsável são definidos pela API. Excluir um usuário inativa a conta e preserva seu vínculo com o histórico. A observação aceita até 500 caracteres; o motivo de estorno, de 3 a 450.
- Erros de validação retornam 400; falta de permissão, 403; registro ausente, 404; saldo insuficiente, operação já estornada ou chave em conflito, 409.

A migração para a versão 2 é automática e preserva a base existente. Movimentações antigas permanecem consultáveis, sem recalcular saldos nem permitir estornos sobre operações que não tinham garantia transacional.

Testes desta etapa usam bases isoladas; não criam produtos no seu estoque:

```sh
docker compose exec -T api node < apps/api/tests/stock-http.cjs
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/stock-rollback.cjs
docker compose exec -T api node < apps/api/tests/migration.cjs
```


## Visão geral

Abra http://localhost:8080/home/dashboard. O painel mostra quantos produtos ativos estão cadastrados, estoque baixo (saldo abaixo de 5), vencimentos de hoje até 30 dias e produtos já vencidos com saldo. A referência de data usa `America/Sao_Paulo`. Produtos inativos não geram alertas; vencimentos exigem saldo positivo e uma data válida.

O painel apresenta até 6 prioridades de reposição, 6 vencimentos e 10 movimentos recentes, incluindo estornos. Os cartões mostram os totais completos. O botão **Atualizar** busca os dados novamente; se houver falha, os últimos indicadores permanecem visíveis com aviso e horário da consulta. O catálogo simplificado agora permite informar a validade opcional.

`GET /v1/dashboard` exige autenticação e retorna `criterios`, `totais`, `baixo_estoque`, `vencimentos`, `movimentos_recentes` e `atualizado_em`. O limite de estoque baixo e a janela de vencimento são fixos nesta versão. Quantidades de unidades diferentes não são somadas em um único saldo.

Testes isolados dos indicadores e da autenticação:

```sh
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/dashboard.cjs
docker compose exec -T api node < apps/api/tests/dashboard-http.cjs
```

Para reproduzir a validação visual com dados sintéticos, use as imagens já construídas:

```sh
docker compose -f apps/api/tests/dashboard-qa.compose.yaml up -d --wait
docker compose -f apps/api/tests/dashboard-qa.compose.yaml exec -T api node < apps/api/tests/seed-dashboard-qa.cjs
```

Essa instância usa http://localhost:8081, banco temporário em memória (`tmpfs`) e credenciais exclusivamente de teste: usuário `admin`, senha `dashboard-qa-only-2026`. Ela não acessa o volume da aplicação principal. Ao terminar, remova apenas os serviços de teste:

```sh
docker compose -f apps/api/tests/dashboard-qa.compose.yaml down
```


## Catálogo de produtos

Abra http://localhost:8080/home/produtos. A listagem padrão mostra ativos, com busca por nome, código de barras ou ID, filtros combináveis de situação, estoque, validade e categoria e paginação de 10, 25 ou 50 itens. `%` e `_` na busca são caracteres literais. A busca usa o comportamento `LIKE` do SQLite e não oferece normalização completa de acentos.

Administradores e gerentes cadastram, editam, inativam e reativam produtos. Perfis de consulta usam os mesmos filtros sem botões de escrita; a API também aplica essa restrição. Inativar ou reativar preserva o saldo e o histórico.

O formulário de edição altera apenas dados cadastrais; não envia um saldo antigo para sobrescrever movimentações recentes. Em caso de erro ao salvar, o formulário e os valores preenchidos permanecem disponíveis. Após cadastrar, a listagem muda para ativos mais recentes para mostrar o novo item. Use o atalho **Movimentar** na linha do produto para abri-lo selecionado no fluxo de entradas e saídas.

Contratos novos, preservando o retorno em array de `GET /v1/produto` para os módulos antigos:

- `GET /v1/catalogo/produtos`: exige autenticação; retorna `itens`, `total`, `pagina`, `tamanho`, `paginas` e `criterios`.
- Parâmetros: `q` (até 100 caracteres), `estado=ativos|inativos|todos`, `estoque=todos|baixo|zerado|disponivel`, `vencimento=todos|vencido|em_breve|sem_validade`, `categoria=<id>|sem`, `ordem=nome|saldo|validade|recentes`, `direcao=asc|desc`, `pagina` e `tamanho=10|25|50`.
- O padrão é ativos, nome ascendente, página 1, 10 itens. Página acima do total é ajustada para a última disponível. Datas sem validade válida ficam no fim da ordenação por validade. Vencidos e próximos do vencimento exigem saldo positivo, com os mesmos critérios do painel.
- `PATCH /v1/produto/:id`: exige administrador ou gerente. Aceita somente descrição, categoria, unidade, fornecedor, preço, validade, código de barras e estado. Campos omitidos permanecem intactos; saldo não é aceito. `produto_estado: false` inativa e `true` reativa.
- Referências devem ser IDs numéricos existentes ou `null`; validade aceita uma data real `AAAA-MM-DD` (ou ISO UTC, normalizada para a data); estado deve ser booleano. Entradas inválidas retornam 400, registro ausente 404 e falta de permissão 403.

Testes isolados:

```sh
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/catalogo.cjs
docker compose exec -T api node < apps/api/tests/catalogo-http.cjs
```

Para ampliar a instância descartável de validação visual, depois de executar `seed-dashboard-qa.cjs`, execute uma única vez:

```sh
docker compose -f apps/api/tests/dashboard-qa.compose.yaml exec -T api node < apps/api/tests/seed-catalogo-qa.cjs
```

A fixture adiciona categorias, unidade, produtos suficientes para duas páginas e a conta de consulta `consulta` / `catalogo-qa-consulta-2026`, válida somente no ambiente descartável de teste. A tela de preços ainda usa o contrato CRUD anterior; pedidos agora possuem fluxo de compras e recebimento; cadastros auxiliares e gestão de acessos já possuem telas unificadas.


## Cadastros auxiliares

Abra http://localhost:8080/home/cadastros/categorias e use as abas **Categorias**, **Unidades** e **Fornecedores**. Todas têm busca e paginação de 10, 25 ou 50 registros. Fornecedores permitem buscar também por contato e endereço. Administradores e gerentes cadastram, editam e excluem; perfis de consulta apenas leem.

Um nome é obrigatório (até 120 caracteres para categoria/unidade, 200 para fornecedor). Espaços são normalizados e nomes equivalentes por caixa e normalização Unicode não podem ser repetidos no mesmo tipo de cadastro. Contato aceita até 200 caracteres e endereço até 500; ambos são opcionais e de texto livre. A busca segue o `LIKE` do SQLite e não tem normalização completa de acentos.

A lista informa os vínculos existentes. A exclusão é permanente, exige confirmação na interface e só é permitida quando não há vínculos: categorias verificam produtos; unidades verificam produtos e itens de pedido; fornecedores verificam produtos e pedidos. Produtos inativos e registros antigos também contam. A checagem e a exclusão ocorrem na mesma transação; registros em uso recebem 409. Renomear preserva associações e saldos, mas não converte unidades de medida.

O formulário de produto passou a oferecer também a escolha do fornecedor. As URLs administrativas antigas dos três cadastros redirecionam para as telas novas; os endpoints antigos preservam os campos e o retorno em array, aplicando as mesmas validações e permissões.

API nova:

- `GET /v1/cadastros/:tipo`, com `tipo=categorias|unidades|fornecedores`, `q`, `pagina` e `tamanho=10|25|50`. Retorna `itens`, `total`, `pagina` e `tamanho`; registros incluem `id`, `nome`, contato/endereço quando aplicáveis e contadores de vínculos.
- `POST /v1/cadastros/:tipo`, corpo `{ "nome": "Nome do cadastro" }`; fornecedores aceitam `contato` e `endereco` opcionais.
- `PATCH /v1/cadastros/:tipo/:id`, para os campos que devem mudar. Campos omitidos são preservados.
- `DELETE /v1/cadastros/:tipo/:id`, retorna 204 se excluído, 404 se ausente e 409 se estiver em uso.
- Todos exigem autenticação; escrita exige administrador ou gerente. Entradas inválidas retornam 400 e nomes duplicados, 409.

As rotas legadas de pedidos, itens, estados, histórico de pedidos e preços também passaram a exigir administrador ou gerente para escrita. Usuários e perfis exigem administrador inclusive para consulta; o login continua público. A interface administrativa legada é restrita a administrador, enquanto Cadastros é acessível pela navegação principal conforme as permissões.

Testes isolados desta etapa:

```sh
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/cadastros.cjs
docker compose exec -T api node < apps/api/tests/cadastros-http.cjs
```


## Usuários e sessões

Abra http://localhost:8080/admin/acessos/usuarios com um administrador. A tela permite buscar, filtrar, paginar, cadastrar, editar e inativar usuários. A aba **Perfis e permissões** apresenta os três níveis fixos e os perfis adicionais de consulta. As URLs antigas de usuários e perfis redirecionam para essa área.

Senhas novas exigem ao menos 12 caracteres e no máximo 72 bytes UTF-8. Senha vazia na edição preserva a existente. O próprio administrador não pode se inativar ou remover seu perfil administrativo; o servidor também protege o último administrador ativo em alterações concorrentes. Perfis básicos não podem ser renomeados nem excluídos; perfis adicionais em uso também não podem ser excluídos.

A migração para o esquema SQLite 3 preserva credenciais, saldos e IDs, padroniza os nomes dos perfis 1–3 e cria sessões persistidas. **Entre novamente após atualizar: os tokens antigos serão rejeitados.** Alterar `ADMIN_PASSWORD` no `.env` continua sem redefinir a senha de uma base existente.

Sessões duram até duas horas. Sair revoga somente a sessão atual; alterar senha, perfil ou situação revoga todas as sessões da conta afetada. Expiração ou resposta 401 leva ao login com aviso; 403 informa falta de permissão sem encerrar a sessão. O navegador sincroniza a saída entre abas. Tokens permanecem em localStorage; recuperação por e-mail, MFA e limitação de tentativas ainda não estão implementadas. Logout offline limpa o navegador, mas a sessão no servidor permanece válida até expirar se a revogação não alcançar a API.

API de acesso:

- `GET /v1/sessao`: usuário autenticado e `expira_em`, em segundos desde a época Unix.
- `POST /v1/sessao/sair`: revoga a sessão autenticada, retorna 204.
- `GET /v1/acessos/usuarios`: exige administrador; filtros `q`, `estado=todos|ativos|inativos`, `perfil` (ID), `pagina` e `tamanho=10|25|50`. Retorna `itens`, `total`, `pagina`, `tamanho`.
- `POST /v1/acessos/usuarios` e `PATCH /v1/acessos/usuarios/:id`: campos `usuario_nome`, `usuario_email`, `usuario_nome_completo`, `usuario_password`, `usuario_perfil_id`, `usuario_status`. PATCH preserva campos omitidos; corpo desconhecido é rejeitado. Cadastro exige nome, e-mail, nome completo e senha; perfil padrão é Consulta e situação padrão é ativa.
- `GET /v1/acessos/perfis`: administrador; inclui nível, proteção e contagem de usuários. Escrita continua em `/v1/perfil`, com as mesmas proteções. DELETE legado de usuário inativa a conta.
- Validação retorna 400; duplicidade ou operação protegida, 409; autenticação inválida, 401; acesso sem permissão, 403. Nenhuma resposta inclui hash de senha.

Testes isolados (não alteram a base principal):

```sh
docker compose exec -T api node < apps/api/tests/acessos-migracao.cjs
docker compose exec -T api node < apps/api/tests/acessos-http.cjs
```


## Histórico paginado de movimentações

Em http://localhost:8080/home/movimentacoes, use **Aplicar filtros** para combinar busca por produto/observação/ID, produto, responsável, tipo e datas inicial/final. As datas incluem o dia inteiro no fuso `America/Sao_Paulo`; a tabela usa esse mesmo fuso. Produtos e responsáveis inativos permanecem disponíveis para consulta; registros anteriores sem responsável têm filtro próprio. A paginação oferece 10, 25 ou 50 itens, com o total da consulta. Limpar filtros retorna à primeira página.

- `GET /v1/movimentacao-estoque/historico`: autenticado, inclusive para consulta. Parâmetros opcionais `q` (até 200 caracteres), `produto` (ID positivo), `responsavel` (ID positivo ou `legado`), `tipo=entrada|saida`, `inicio` e `fim` (`AAAA-MM-DD`), `pagina` (padrão 1) e `tamanho=10|25|50` (padrão 10).
- Retorna `{itens,total,pagina,tamanho}`, ordenados por ID decrescente. Página além do total é ajustada à última; resultado vazio usa página 1. Busca trata `%` e `_` literalmente. Datas impossíveis, intervalo invertido e filtros inválidos retornam 400.
- `GET /v1/movimentacao-estoque/responsaveis`: autenticado; retorna somente `{id,nome}` das contas que possuem movimentos, inclusive inativas. Não depende da permissão de gestão de usuários.
- Registros com data inválida continuam no histórico sem período, mas não entram nos filtros de datas. Datas legadas sem fuso são interpretadas como UTC. Nenhum movimento é removido, recalculado ou reatribuído.
- Estornos preservam o vínculo nos dois sentidos, mesmo fora da página selecionada. O `GET /v1/movimentacao-estoque` anterior continua retornando array para compatibilidade; o frontend novo utiliza a rota paginada.

Testes isolados:

```sh
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/historico.cjs
docker compose exec -T api node < apps/api/tests/historico-http.cjs
```


## Pedidos de compra e recebimento

Abra http://localhost:8080/home/pedidos. Administradores e gerentes podem criar rascunhos com fornecedor, observação e até 100 produtos distintos. Perfis de consulta leem a lista, os detalhes e o histórico. Confirmação bloqueia edição dos itens; o saldo muda somente ao receber. Rascunhos e confirmados podem ser cancelados com motivo. Não há envio automático ao fornecedor nem compromisso financeiro externo.

O recebimento pode ser **parcial ou integral**: informe somente as quantidades que chegaram e foram conferidas. Uma entrada por item, os saldos e o evento de recebimento são gravados na mesma transação. Falha em qualquer produto, unidade ou limite de saldo desfaz tudo. Repetir o recebimento não soma o estoque novamente. Cancelamento de pedido recebido é bloqueado; devoluções são registradas no próprio pedido, sem reabri-lo. Os detalhes mostram entregas, entradas, saídas e eventuais estornos anteriores à migração 5.

Valores novos usam centavos inteiros. O preço unitário pode ser zero, tem máximo de 1 trilhão de centavos e o total do pedido também é limitado a esse valor. Quantidade segue a precisão de três casas já usada no estoque. Cada subtotal é arredondado ao centavo com metade para cima, antes da soma. Itens usam a unidade atual do produto, copiada ao salvar o rascunho; não há conversão de pacotes. Produtos inativos ou com unidade diferente da registrada bloqueiam confirmação e recebimento. Corrija o cadastro ou cancele o pedido e crie outro conforme a situação.

A migração SQLite 4 mantém pedidos, itens, estados e histórico antigos em **Legado · consulta**, sem convertê-los em compras recebíveis e sem gerar estoque retroativo. Valores antigos permanecem como eram. GETs legados continuam disponíveis; POST/PUT/PATCH/DELETE de `/v1/pedido`, `/v1/item-pedido`, `/v1/estado-pedido` e `/v1/historico-estado-pedido` retornam 405 após verificar autenticação e permissão. As telas administrativas antigas redirecionam para Pedidos.

API nova:

- `GET /v1/compras/pedidos`: `q` (ID, fornecedor ou observação, até 200 caracteres), `estado=rascunho|confirmado|recebido|cancelado|legado`, `pagina` e `tamanho=10|25|50`. Retorna `{itens,total,pagina,tamanho}`, ID decrescente, ajustando páginas além do total.
- `GET /v1/compras/pedidos/:id`: pedido com `itens`, `eventos` e `historico_legado`. Itens recebidos incluem `movimento_id` e eventual `movimento_estornado_por`.
- `POST /v1/compras/pedidos`: exige `Idempotency-Key` (16–80 caracteres de letras, números, sublinhado ou hífen). Corpo `{fornecedor: ID, observacao: "", itens: [{produto: ID, quantidade: 1.25, preco_centavos: 199}]}`. Retorna 201. Repetição com a mesma chave e conteúdo inalterado retorna o pedido sem duplicar; conteúdo diferente retorna 409.
- `PATCH /v1/compras/pedidos/:id`: mesmo corpo completo, com `versao` igual ao `pedido_versao` consultado. Apenas rascunhos podem ser alterados. Substitui o conjunto de itens e registra evento; dados de responsável, data, estado e totais não são aceitos do cliente.
- `POST /v1/compras/pedidos/:id/confirmar`: `{versao}`; rascunho → confirmado.
- `POST /v1/compras/pedidos/:id/cancelar`: `{versao,motivo}`, motivo de 3–450 caracteres; rascunho/confirmado → cancelado.
- `POST /v1/compras/pedidos/:id/receber`: `{versao}` e `Idempotency-Key`; confirmado → recebido. Repetir exatamente a requisição e a chave retorna o resultado sem efeitos extras, inclusive com a versão original. Depois de recebido integralmente, outra chave não permite novas entradas.
- Escrita exige administrador ou gerente ativo; consulta exige autenticação. Validação: 400; pedido ausente: 404; transição, versão, produto ou chave em conflito: 409. Mudanças concorrentes exigem reabrir os detalhes antes de tentar outra operação.

Lotes, tributos, crédito financeiro, custo médio e conversões ainda não estão implementados. Seletores de produtos e fornecedores continuam carregando listas completas.

Testes isolados:

```sh
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/pedidos.cjs
docker compose exec -T api node < apps/api/tests/pedidos-http.cjs
docker compose exec -T api node < apps/api/tests/pedidos-migracao.cjs
```

Para validar visualmente em base descartável, suba o compose de QA e execute a fixture uma única vez numa base nova:

```sh
docker compose -f apps/api/tests/dashboard-qa.compose.yaml up -d --wait
docker compose -f apps/api/tests/dashboard-qa.compose.yaml exec -T api node < apps/api/tests/seed-pedidos-qa.cjs
```

Abra http://localhost:8081/home/pedidos e entre com `admin` / `dashboard-qa-only-2026`. A fixture cria um fornecedor e dois produtos com saldo zero, apenas no banco temporário. Ao terminar, encerre com `docker compose -f apps/api/tests/dashboard-qa.compose.yaml down`.


## Entregas parciais, devoluções e encerramento de pendências

Na tela Pedidos, **Registrar recebimento** permite informar a quantidade de cada produto que chegou; zero deixa o item fora desta entrega. A tela mostra recebido acumulado, pendente e devolvido. O pedido passa para **Recebido parcialmente** enquanto houver itens pendentes e para **Recebido** quando toda a quantidade pedida chegar.

**Registrar devolução** exige motivo (3–450 caracteres), quantidade disponível e saldo de estoque suficiente. Devolver não reabre a quantidade a receber, não altera o valor original do pedido e não registra crédito ou reembolso. Uma nova reposição após devolução exige outro pedido. **Encerrar saldo pendente**, disponível em pedidos parciais, exige motivo e impede receber o restante; a quantidade encerrada continua visível. O estoque recebido é preservado, e devoluções continuam possíveis.

Cada operação admite documento/nota de até 120 caracteres e registra data, responsável, itens e movimentos. Entregas e devoluções são imutáveis e não oferecem edição, exclusão ou desfazimento nesta etapa. Revise os dados antes de confirmar. Estorno isolado de movimentos vinculados a pedidos retorna 409; o histórico oferece link para Pedidos. Outros movimentos continuam usando estorno normalmente.

API complementar:

- `POST /v1/compras/pedidos/:id/receber`: `{versao, documento?, itens?: [{item: ID_DO_ITEM_PEDIDO, quantidade: 1.25}]}` e `Idempotency-Key`. `itens` omitido recebe todo o pendente (compatibilidade); array vazio é inválido. Itens enviados devem ter quantidade positiva, até três casas, e não podem repetir nem superar o pendente. Aceita estados `confirmado` e `parcial`.
- `POST /v1/compras/pedidos/:id/devolver`: `{versao,motivo,documento?,itens:[{item,quantidade}]}` e `Idempotency-Key`. Aceita `parcial`, `recebido` e `encerrado`; não pode superar o recebido ainda disponível para devolver. Produto inativo pode ser devolvido se a unidade do cadastro não mudou e houver estoque.
- `POST /v1/compras/pedidos/:id/encerrar`: `{versao,motivo}`; somente `parcial`, encerra o restante sem alterar saldos. Cancelamento simples continua restrito a rascunhos e confirmados sem recebimento.
- Listagem aceita também `estado=parcial|encerrado`. Detalhes incluem `entregas` com itens e vínculos de movimento; os itens incluem `quantidade_recebida`, `quantidade_pendente`, `quantidade_devolvida`, `quantidade_devolvivel` e `quantidade_encerrada`.
- Chave repetida compara pedido, operação, responsável, versão, documento, motivo e itens normalizados. Repetição exata não reaplica a operação; conteúdo diferente retorna 409. Operações concorrentes exigem a versão atual. Documento é uma referência textual, não é validado como documento fiscal e pode aparecer em várias entregas.

A migração SQLite 5 cria o registro de entregas sem duplicar movimentos anteriores. Recebimentos integrais da versão 4 permanecem recebidos e podem ser devolvidos, respeitando estornos já realizados. Pedidos legados anteriores ao fluxo continuam somente para consulta.

Testes adicionais:

```sh
docker compose exec -T -e SQLITE_PATH=:memory: api node < apps/api/tests/entregas.cjs
docker compose exec -T api node < apps/api/tests/entregas-http.cjs
docker compose exec -T api node < apps/api/tests/entregas-migracao.cjs
```

Na base descartável de QA, após `seed-pedidos-qa.cjs`, execute `seed-entregas-qa.cjs` para preparar um pedido confirmado com dois itens pendentes para conferência visual. Essa fixture exige a base temporária de QA e não funciona no banco principal.
