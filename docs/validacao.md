# Validação da primeira etapa — 25/10/2026

Executado localmente com Docker:

- Build de produção do Angular e compilação TypeScript da API: aprovados.
- Dois testes de integração SQLite: aprovados (parâmetros posicionais, RETURNING, booleanos, tentativa de injeção e integridade referencial).
- Teste HTTP pelo Nginx: frontend, rota interna, saúde, rejeição sem token, senha incorreta sem token, login válido e criação/listagem de categoria aprovados.
- Reinício da API: categoria permaneceu disponível; exclusão posterior aprovada e registro de teste removido.
- Históricos Git originais consultáveis em `.repository-history`; `.env` e históricos ignorados pelo repositório raiz.

Limitações observadas: aviso de bundle Angular de 1,38 MB acima do limite de aviso de 1,05 MB; auditoria npm reportou 13 vulnerabilidades na árvore da API e 87 na do frontend, incluindo dependências de desenvolvimento. A atualização dessas dependências fica para a etapa de modernização. O módulo SQLite do Node 22 ainda emite aviso experimental.

A interface não passou por redesenho ou inspeção visual nesta etapa. O teste HTTP verifica a entrega do frontend e a integração com a API, sem simular navegação e preenchimento de formulários no navegador.

## Segunda etapa — estoque transacional

- Build de produção dos dois aplicativos aprovado.
- Teste HTTP em uma API isolada com SQLite em memória: saldo inicial gera uma única entrada; quantidade fracionária funciona; saídas sem saldo e quantidades inválidas falham sem gravar histórico; duas saídas concorrentes não causam saldo negativo; repetição da chave não duplica a operação.
- Estorno restaura saldo, mantém o original, não permite duplicação nem estorno de estorno e exige saldo suficiente para reverter uma entrada.
- Edição direta de saldo bloqueada; PUT/DELETE de movimentos retornam 405; responsável obtido do token, ignorando ID enviado no corpo.
- Permissões verificadas na API; conta inativa não reutiliza token; respostas sem hash de senha e edição com senha vazia preserva a credencial.
- Falha de gravação do histórico simulada com trigger SQLite: saldo permaneceu inalterado após rollback.
- Migração de uma base temporária v1 para v2 preservou saldo e histórico legado, sem reaplicar movimentos.
- Inspeção visual no Chrome: login, formulário de movimentação, estado vazio, campo de busca e link no menu lateral. Não foram criados produtos de teste no estoque do usuário. Os cenários com operações foram testados na API isolada, sem preenchimento completo pelo navegador.

As limitações de dependências e tamanho do bundle da primeira etapa permanecem. Paginação, demais permissões, contratos Swagger e redesenho geral ainda estão no plano de evolução.

## Terceira etapa — painel e navegação (25–26/10/2026)

- Build de produção de frontend e API aprovado. Pacote inicial de 1,21 MB, abaixo dos 1,38 MB anteriores, após retirar o carregamento antecipado dos módulos de operação e administração.
- Testes dos indicadores em SQLite isolado aprovados: base vazia, estoque fracionário, limites de 5 unidades e 30 dias, mudança de data no fuso de São Paulo e virada de ano, exclusão de inativos e produtos sem saldo dos alertas de validade, datas inválidas e datas legadas.
- Totais completos validados independentemente dos limites das listas (6 prioridades, 6 vencimentos e 10 movimentos recentes). Responsável e produto dos movimentos conferidos.
- Teste HTTP aprovado: endpoint protegido, rejeição de token inválido e contrato do painel autenticado.
- Validação visual com dados sintéticos em `localhost:8081`: 5 produtos ativos, 2 com estoque baixo, 2 próximos do vencimento, 1 vencido e 6 movimentos. A base da aplicação principal não recebeu esses dados.
- No Chrome, conferidos painel vazio, painel preenchido, navegação para movimentações e menu sobreposto em largura reduzida por zoom, com fechamento após navegar. A página `/home` passou a redirecionar para `/home/dashboard`.
- Aplicação principal permaneceu saudável durante a simulação de falha da API descartável.

Permanecem avisos de orçamento no build: pacote inicial de 1,21 MB para aviso de 1,05 MB e estilo do painel de 3,80 kB para aviso de 2,05 kB. Ambos estão abaixo dos limites de erro; os limites não foram aumentados. Dependências vulneráveis continuam pendentes. Limite de estoque e janela de validade ainda são fixos, e o painel não controla lotes.

Na verificação final de 26/10, a API descartável foi pausada mantendo o frontend acessível. A atualização atingiu o limite de 15 segundos e o navegador exibiu o aviso de falha, a ação de tentar novamente e os indicadores da última consulta com seus valores preservados.
A recuperação também foi conferida: ao reativar a API e escolher “Tentar novamente”, o aviso desapareceu e o horário da consulta foi atualizado. Ao final, os containers e a rede descartáveis foram encerrados; a aplicação principal e seu volume foram mantidos.

## Quarta etapa — catálogo de produtos (26/10/2026)

- Builds de frontend e API aprovados; pacote inicial de aproximadamente 1,20 MB. Permanecem avisos de orçamento (painel: 3,80 kB, catálogo: 2,33 kB), abaixo dos limites de erro existentes.
- Teste isolado do catálogo aprovado: paginação e limite de tamanho, ajuste para última página, combinação dos filtros, ordenação estável, busca por código e ID, busca literal de `%` e `_`, rejeição de parâmetros inválidos e tentativas de injeção, categorias/unidades e critérios de validade no calendário de São Paulo.
- Teste de edição cadastral aprovado: movimentação eleva o saldo de 2 para 5; PATCH de nome/código/validade mantém o saldo 5 e não cria movimento adicional. Alteração direta de saldo, datas impossíveis, referências ausentes e estado não booleano são rejeitados.
- Teste HTTP aprovado: autenticação, contrato paginado, compatibilidade do array legado de produtos, validação do cadastro sem efeitos parciais, inativação/reativação e bloqueio de escrita para perfil de consulta.
- Regressão do fluxo transacional de estoque aprovada. Indicadores do painel também passaram após compartilhar a regra de datas com o catálogo.
- Validação visual no Chrome, exclusivamente na instância descartável: paginação de 16 ativos em duas páginas; busca por arroz retorna à primeira página; edição do nome conserva saldo 2; confirmação de inativação remove o item dos ativos; filtro de inativos mostra o saldo preservado e permite reativação.
- Cadastro pelo navegador de um produto sintético com saldo 1,25 concluído; a entrada correspondente apareceu no painel. O formulário de edição mostra o saldo como informação, sem campo para alterá-lo.
- Conta de consulta conferida no navegador: sem botão Novo produto, coluna de ações ou administração; link do painel abre o catálogo com filtro de estoque baixo. Filtros e paginação continuam disponíveis. Conferência responsiva em largura reduzida por zoom, restaurado ao final.

Os dados sintéticos foram usados apenas em `localhost:8081` com banco temporário. A validação não criou nem alterou produtos no banco da aplicação principal. O catálogo não oferece pesquisa completa sem acentos, controle por lote ou filtros persistidos integralmente na URL. As telas administrativas legadas permanecem para uma etapa posterior.

## Quinta etapa — cadastros auxiliares (concluída em 27/10/2026)

- Build de produção aprovado. A primeira tentativa encontrou incompatibilidade de tipagem entre as respostas de salvar e excluir no formulário; a tipagem foi corrigida e o build seguinte passou. O pacote inicial ficou em aproximadamente 1,19 MB; permanecem avisos de orçamento abaixo dos limites de erro, sem aumentar esses limites.
- Os testes inicialmente interrompidos pelo limite de uso da revisão automática foram retomados e concluídos em 27/10.
- Teste isolado de serviço aprovado: nomes normalizados, unicidade com caixa/Unicode/espaços, rejeição de campos desconhecidos e identificadores inválidos, edição parcial, campos opcionais de fornecedor, vínculos de produtos inativos e pedidos, bloqueio de exclusão em uso, exclusão de registro livre, paginação e busca literal.
- Teste HTTP aprovado: contratos novos e antigos, administrador/gerente/consulta, proteção das rotas legadas de escrita e de consulta de usuários/perfis, rejeição de duplicidade em requisições concorrentes e preservação de vínculos.
- Regressões do catálogo e de estoque transacional aprovadas.
- Chrome em ambiente descartável: cadastros exibem 4 produtos para Alimentos e 13 para Descartáveis (incluindo o produto inativo); unidade exibe 17 vínculos; exclusão de registros em uso fica desabilitada.
- Tentativa de categoria duplicada exibiu erro e manteve o nome preenchido; após corrigir o nome, a categoria sintética foi criada. Fornecedor sintético foi salvo com nome, contato e endereço e apareceu na lista.
- Conferidas administração por áreas, acesso à lista administrativa de usuários e redirecionamento de `/admin/categoria` para a nova tela. Exclusão permanente pelo navegador não foi realizada; a operação foi verificada nos testes isolados de API e serviço.

A base principal não recebeu dados de teste. As validações visuais usaram a instância em `localhost:8081`, com banco temporário e credenciais exclusivas de QA. Não foi necessária migração de esquema. Próximos pontos: modernização de acesso/sessão, regras de pedidos, paginação das movimentações e atualização de dependências.


## Sexta etapa — usuários, perfis e sessões (27/10/2026)

- Build de produção aprovado. Permanecem avisos de orçamento abaixo dos limites de erro; pacote inicial de aproximadamente 1,20 MB.
- Migração isolada de esquema 1 para 3 aprovada: credenciais, saldo e perfil adicional preservados; perfis básicos padronizados e tabela de sessões criada vazia.
- Testes HTTP de acessos aprovados: validação e unicidade, limites de senha em bytes, ausência de hashes, perfis protegidos e associados, bloqueio de auto-inativação/rebaixamento e preservação do último administrador em corrida entre duas contas.
- Sessões verificadas: senha e permissões alteradas revogam tokens; inativação impede login; logout invalida somente a sessão atual; tokens expirados, antigos ou sem registro persistido são rejeitados. Alteração da própria senha exige novo login.
- Regressões HTTP de estoque, cadastros e catálogo aprovadas.
- Chrome na instância descartável: token anterior levou ao login com aviso; login válido abriu o painel; URL antiga de usuários redirecionou para a nova lista. Formulário do próprio administrador bloqueia perfil/situação e mantém senha vazia. Alteração somente do nome completo foi salva mantendo a sessão.
- Aba de perfis exibiu permissões, contagens e ações desabilitadas para os três perfis básicos. Revogação de sessões exclusivamente no banco temporário seguida de navegação retornou ao login com o aviso de sessão encerrada ou expirada.
- Senhas e privilégios não foram alterados pela interface durante a inspeção visual; esses fluxos foram cobertos pelos testes isolados de API. A base principal recebeu a migração, sem produtos ou contas sintéticas.

Os testes visuais usaram `localhost:8081`, banco temporário e credenciais de QA. O ambiente descartável foi encerrado ao concluir; a aplicação principal permaneceu em `localhost:8080`. Usuários existentes precisam entrar novamente após a atualização. Recuperação de senha, MFA e limitação de tentativas permanecem pendentes.

## Sétima etapa — histórico paginado de movimentações (27/10/2026)

- Build de produção aprovado após substituir opções de formatação de data não disponíveis nos tipos TypeScript do frontend. Permanecem os avisos de orçamento existentes, abaixo dos limites de erro.
- Teste isolado do histórico aprovado: paginação de 29 registros, tamanhos permitidos, ajuste da última página, produtos inativos, responsáveis e registros legados, busca literal de `%` e `_`, rejeição de parâmetros inválidos e tentativa de injeção.
- Período inclusivo conferido no limite de meia-noite de São Paulo e em data histórica com horário de verão (UTC-2). Datas inválidas não participam de filtros de período. Vínculos de estorno permanecem presentes fora da página do movimento original.
- Teste HTTP aprovado: autenticação, perfil de consulta, combinação de produto/responsável/tipo/busca, produtos inativos, opções mínimas de responsáveis e compatibilidade do endpoint antigo em array.
- Regressão HTTP de estoque aprovada: saldo inicial, quantidades decimais, atomicidade, concorrência, idempotência, estornos, permissões e inativação.
- Chrome na instância descartável: primeira página mostrou 1–10 de 18; segunda mostrou 11–18 de 18. Busca por Arroz retornou à primeira página com dois registros. Filtro de responsável admin combinado à busca manteve os dois registros. Conferida disposição dos filtros, tabela e ações por captura visual.
- Nenhuma movimentação de teste foi gravada na aplicação principal. Fixtures e validação visual usaram exclusivamente a instância temporária em localhost:8081; seus containers foram encerrados ao final. A aplicação principal permanece em localhost:8080.

A consulta paginada evita transferir todo o histórico para o navegador. Produtos e opções de responsáveis ainda são carregados como listas completas; não foi realizado ensaio de desempenho com milhões de registros. As próximas melhorias de negócio envolvem transições de pedido e recebimento integrado ao estoque.

## Oitava etapa — pedidos e recebimento integral (27/10/2026)

- Build de API e frontend aprovado após adaptar literais BigInt ao alvo TypeScript existente e usar o tipo já definido de fornecedor. Cálculos continuam inteiros, sem alterar o alvo do compilador. Pacote inicial de aproximadamente 1,20 MB; avisos de orçamento anteriores permanecem abaixo dos limites de erro.
- Migração até esquema 4 aprovada em arquivo temporário: pedidos, estados, itens, histórico, credenciais e saldos preservados. Compras antigas ficaram com fluxo nulo, sem criar movimentos ou eventos de recebimento.
- Teste de serviço aprovado: valores em centavos e arredondamento, limites, produto duplicado, referências, quantidade fracionária, versão de edição, transições, motivo de cancelamento, filtros e preservação do legado.
- Recebimento com segundo produto inativo foi rejeitado e desfez o saldo/movimento do primeiro item. Unidade alterada também bloqueou o recebimento. Após regularizar, a compra foi recebida uma vez, com todos os itens vinculados ao estoque.
- Repetição da chave retornou o mesmo pedido sem novas entradas; outra chave não permitiu receber novamente. Estorno mostrou vínculo nos detalhes, mantendo o pedido recebido e bloqueando nova entrada pelo pedido.
- Teste HTTP aprovado: duas solicitações concorrentes com chaves diferentes produziram um sucesso e um conflito, com saldo alterado uma única vez. Consulta leu lista e detalhes, mas não alterou. Gerente criou, confirmou e cancelou. Endpoints antigos bloquearam escrita com 405 para gestores; leitura em array permaneceu disponível.
- Regressões de estoque e cadastros aprovadas. Teste de migração de acessos atualizado para verificar a versão corrente, mantendo as asserções de preservação de credenciais e perfis.
- Chrome na instância descartável: lista vazia, novo rascunho com fornecedor QA e Arroz QA; quantidade 1,25 kg e preço R$ 1,99 geraram subtotal/total R$ 2,49. Confirmação bloqueou edição, exibiu instrução de recebimento integral e permitiu concluir.
- Pedido recebido exibiu os eventos de criação, confirmação e recebimento e o vínculo ao Movimento #1. Em Movimentações, apareceu uma única entrada de 1,25, saldo posterior 1,25 e observação com pedido/item.
- Captura visual conferiu itens, valores, histórico e instruções de correção. Cabeçalho ajustado para apresentar Pedidos na nova rota.

A validação visual usou exclusivamente localhost:8081 e banco temporário; não foram criados pedidos, produtos ou recebimentos de teste na aplicação principal. O ambiente descartável foi encerrado ao concluir. A base principal recebeu apenas a migração de esquema e segue em localhost:8080. Recebimento parcial, conversões, devolução comercial e custo médio permanecem fora desta etapa.

## Nona etapa — entregas parciais e devoluções (27/10/2026)

- Build de produção aprovado; pacote inicial de aproximadamente 1,20 MB. Permanecem avisos de orçamento anteriores, abaixo dos limites de erro.
- Teste de serviço aprovado: recebimento de parte de um item, quantidade pendente em milésimos, documento, motivo obrigatório, limites de recebimento/devolução, repetição exata e conflito por conteúdo diferente na mesma chave.
- Falha em item posterior reverteu a entrega inteira, sem entrada parcial de saldo nem registros órfãos. Devolução sem saldo suficiente foi rejeitada. Produto inativo pôde ser devolvido com unidade preservada; recebimento exigiu produto ativo.
- Devoluções não reabriram pendências nem pedidos recebidos. Encerramento do restante bloqueou novas entradas, preservando a possibilidade de devolver o já recebido. Estorno isolado de movimento de entrega foi rejeitado.
- Teste HTTP aprovado: concorrência de duas entregas parciais e de duas devoluções gerou um sucesso e um conflito em cada caso; repetição idêntica não duplicou o estoque. Consulta leu detalhes e foi impedida de devolver ou encerrar; estados parcial/encerrado apareceram nos filtros.
- Migração 4 → 5 aprovada em banco temporário com recebimentos integrais antigos e estorno prévio: saldos e movimentos preservados, quantidade já estornada indisponível para devolução, chave antiga repetível sem nova entrada e devolução válida após migração.
- Regressões do fluxo integral de pedidos, estoque e histórico HTTP aprovadas. Migração acumulada do legado e preservação de credenciais/perfis também passaram até a versão 5.
- Chrome em base descartável: pedido com 3 kg de Arroz QA e 2 kg de Feijão QA. Recebimento de 1,25 kg de arroz, zero de feijão e documento NF QA 001 gerou situação Recebido parcialmente e pendências de 1,75 e 2.
- Devolução de 0,25 kg de arroz com motivo exibiu saída vinculada e manteve pendência 1,75. Recebimento e devolução apareceram em registros separados, com responsável, data, documento/motivo e movimentos.
- Saldo restante encerrado com justificativa: situação Saldo encerrado, quantidades encerradas visíveis e ação de receber removida. A ação de devolver permaneceu disponível.
- Histórico exibiu entrada 1,25 e saída 0,25, com saldo final 1 e links para Pedido #1 no lugar de estorno. Foi necessária atualização forçada do navegador para descartar arquivos antigos em cache durante a inspeção. Layout de itens e entregas conferido por captura visual.

Dados sintéticos foram usados exclusivamente em localhost:8081, com SQLite temporário. Nenhuma entrega ou devolução de teste foi gravada no banco principal. Os containers descartáveis foram encerrados ao concluir, e a aplicação principal permaneceu em localhost:8080 com a migração de esquema 5. Não há reembolso financeiro, conversão de unidades nem edição/desfazimento das entregas nesta etapa.

## Décima etapa — relatório de posição de estoque e CSV (28/10/2026)

- Docker Desktop estava parado; foi iniciado para compilar e validar a atualização. Build de API e frontend aprovado, com pacote inicial de aproximadamente 1,20 MB e avisos de orçamento anteriores abaixo dos limites de erro.
- Teste isolado do relatório aprovado: seleção vazia, resumo sobre todos os resultados, paginação, combinação de filtros, ativos/inativos, estoque baixo, zerados, validade no calendário de São Paulo e exportação além da primeira página.
- CSV validado com UTF-8/BOM, ponto e vírgula, aspas, quebras em células, acentos, saldo decimal, códigos com zeros à esquerda e proteção contra fórmulas em campos textuais. Mais de 10.000 produtos bloqueiam a exportação sem impedir a consulta paginada.
- Teste HTTP aprovado: autenticação obrigatória, consulta/exportação para perfil de consulta, cabeçalhos de anexo e no-store, validação de filtros e CSV com todos os produtos da seleção.
- Regressões do catálogo em serviço e HTTP aprovadas, incluindo ordenação, limites de datas, filtros literais, validação de cadastro e edição cadastral preservando saldo.
- Chrome na base descartável: relatório mostrou 16 ativos, 2 abaixo de 5, 1 zerado, 1 vencido e 2 vencimentos em até 30 dias. Segunda página exibiu 11–16 de 16 sem reduzir os indicadores ao tamanho da página.
- Download acionado na segunda página concluiu como estoque.csv. Arquivo efetivamente baixado foi lido com parser CSV: 16 linhas de produtos das duas páginas, filtros ativos, BOM e horário de geração único.
- Alterar busca para Arroz bloqueou exportação/paginação e exibiu aviso de filtro não aplicado. Aplicar retornou à primeira página, com um produto e resumo coerente, reabilitando exportação. Layout conferido por captura visual; rótulos de contagem foram ajustados para não depender de singular/plural.

Dados sintéticos e download foram usados exclusivamente em localhost:8081. Nenhum produto ou saldo foi alterado na base principal e não houve migração de esquema. Containers de QA encerrados ao concluir; aplicação principal em localhost:8080. O relatório é de posição atual, não de evolução histórica nem avaliação monetária. Compras, pendências e devoluções permanecem como futuros relatórios.

## Décima primeira etapa — operação para tablet e produto contextual (28/10/2026)

- Build de produção aprovado. Pacote inicial de aproximadamente 1,23 MB; avisos de orçamento anteriores permanecem abaixo dos limites de erro.
- Teste HTTP integrado aprovado: criação de categorias/unidades, produto com preços em centavos, edição de preço sem alterar saldo nem produto que compartilhava o preço anterior, limpeza da associação e rejeição de valores fracionários em centavos, negativos, excessivos e campos ambíguos.
- Falha no cadastro do produto reverteu também a criação do preço, sem registro órfão. Preços associados a pedidos anteriores não são reescritos pelo fluxo contextual.
- Autorização de funcionário verificada: consulta começou sem escrita; concessão explícita pelo administrador revogou a sessão anterior; novo login permitiu entrada/saída e repetição idempotente. Estorno, produto, preço, cadastro e pedido continuaram bloqueados. Funcionário não pôde conceder a própria autorização. Revogação encerrou a sessão e bloqueou novas movimentações.
- Regressões de estoque transacional e acessos aprovadas; após os ajustes finais, testes de catálogo, cadastros, integração e migração também passaram. Migração 6 preservou contas, saldos e perfis e iniciou a nova autorização desativada.
- Chrome na base descartável: funcionário entrou diretamente em Operar estoque. Seleção por cartões, saída fracionária de 0,5, revisão com saldo previsto e confirmação concluída; saldo do Arroz QA passou de 2 para 1,5 e o movimento recebeu responsável autenticado.
- Conferência em largura reduzida por zoom de 200%: menu recolhido, botões grandes e revisão legível. Zoom restaurado. Isso não substitui ensaio em tablet físico, teclado virtual ou leitura por câmera. Foco e rolagem da revisão foram ajustados ao final.
- Versão final conferida com funcionário: menu limitado a Operar estoque e Movimentações, marca retornando à operação e nenhuma administração. Acesso de leitura existente às demais rotas continua possível por URL.
- Gestor abriu Novo produto, preencheu nome, criou categoria e unidade em diálogos contextuais e voltou com ambos selecionados, sem perder o nome. Renomeou a unidade selecionada no mesmo fluxo, com aviso de efeito nos vínculos.
- Preços de compra R$ 12,99 e venda R$ 19,99 foram salvos com o produto. Ao reabrir, ambos apareceram; venda foi alterada para R$ 20,99. Leitura da base temporária confirmou 1299/2099 centavos e o saldo permaneceu zero.

A validação usou apenas localhost:8081 e credenciais sintéticas. Nenhuma conta real foi autorizada, e nenhum produto ou preço de teste foi gravado na base principal. O ambiente temporário foi encerrado ao concluir; a aplicação principal recebeu somente a atualização e a migração 6. Não há operação offline nem captura por câmera. O CRUD antigo de preços continua legado; o novo fluxo contextual cria associações isoladas por produto.

## Décima segunda etapa — backup e restauração (28/10/2026)

- Imagem da API atualizada para incluir ferramenta operacional em Node/SQLite, sem dependências novas nem migração de esquema. Sintaxe de scripts Bash e CommonJS conferida; diff sem erros de whitespace.
- Backup online gerou arquivo SQLite e manifesto com SHA-256, esquema e contagens/digests das tabelas. Foi necessário inspecionar uma cópia temporária gravável para evitar dependência de sidecars WAL/SHM em um volume de backup somente leitura.
- Verificação isolada passou: checksum, integrity_check, foreign_key_check, todas as tabelas e preservação dos dados essenciais. A API iniciou na cópia com JWT temporário e respondeu ao painel, pedidos, usuários e histórico mediante autenticação criada exclusivamente na cópia.
- Teste completo usou somente o projeto estoque-backup-qa, com volume e credenciais descartáveis e sem rede externa ou portas publicadas. Usuários, hashes de senha, autorização do funcionário, saldo, pedido parcial, recebimento, devolução e movimentos foram preservados após restaurar.
- Arquivo corrompido foi recusado antes de parar a API. Bloqueio no volume impediu uma restauração concorrente. Backup de segurança anterior à troca foi criado e validado.
- Sessões restauradas foram invalidadas; token anterior recebeu 401, e administrador/funcionário entraram com as senhas preservadas.
- Falha de saúde forçada no projeto descartável acionou recuperação: arquivo anterior recolocado, API reiniciada e saldo/histórico posteriores ao backup preservados. Cópias de segurança continuaram verificáveis. Um ensaio anterior foi invalidado por alteração de script durante a execução; a versão estabilizada passou pelo ciclo completo sem novas alterações durante o teste.
- Containers e volume de QA foram removidos ao concluir. A API principal foi atualizada e o Nginx reiniciado; /health respondeu ok pelo frontend.
- Primeiro backup real criado em `backups/estoque-20261029T001418Z-azrJqW` (nome em UTC). Verificação isolada aprovada com esquema 6 e 16 tabelas. Diretórios 0700 e arquivos 0600; manifesto confirmado como ignorado pelo Git.

A base principal não foi restaurada nem substituída. Somente a cópia foi iniciada no verificador, sem modificar sessões, credenciais ou saldos da origem. Restauração operacional exige API inicialmente em execução para criar a cópia de segurança prévia; não foi implementado um fluxo automático de recuperação de uma base principal que já não consegue iniciar. Não há agendamento instalado, retenção automática, criptografia ou cópia remota; esses limites estão documentados no procedimento.
