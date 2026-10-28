# Evolução do controle de estoque

## Implementado

- Monorepositório com `apps/web` e `apps/api`, Docker Compose, Nginx e SQLite persistente.
- Migração incremental da base até a versão 5, preservando saldos, credenciais e registros anteriores.
- Entrada e saída com saldo e histórico gravados na mesma transação. Saída sem saldo é rejeitada sem gravar movimento.
- Quantidades positivas com até três casas decimais e limite de 1 bilhão. Os cálculos de saldo usam milésimos para evitar resíduos de ponto flutuante.
- Saldo inicial de novos produtos registrado como entrada, junto do cadastro. Alterações posteriores de saldo passam exclusivamente por movimentações.
- Histórico imutável: PUT e DELETE de movimentações retornam 405. Correções são feitas por estorno, com motivo, vínculo ao registro original e responsável autenticado.
- Uma movimentação admite um único estorno. Estorno de entrada exige saldo suficiente; estorno de estorno é bloqueado.
- Repetir uma requisição com a mesma `Idempotency-Key` e o mesmo conteúdo retorna a operação original sem alterar o saldo novamente. Reutilizar a chave com outro conteúdo retorna 409.
- Inativar produto preserva o saldo e o histórico. Produtos inativos não recebem novas movimentações comuns; estornos continuam permitidos.
- API verifica usuário ativo e perfil atual em cada requisição protegida. Administradores (perfil 1) e gerentes (perfil 2) alteram produtos e estoque. Demais perfis consultam. Somente administrador altera usuários e perfis. A exclusão de usuário inativa a conta e preserva sua identificação para auditoria.
- Respostas de usuário não retornam hashes de senha. Editar usuário com senha vazia preserva a senha existente.
- Tela de Movimentações com seleção de produto, saldo disponível, entrada/saída, observação, busca no histórico e estorno com motivo. Disponível no menu lateral e na página inicial.
- Telas antigas de CRUD de movimentação redirecionam para o novo fluxo. A tela de produtos não envia mais operações separadas para alterar saldo e registrar histórico.

## Painel e navegação

- Página inicial redireciona para Visão geral, com indicadores calculados pela API em uma consulta consistente.
- Produtos ativos, estoque abaixo de 5, vencidos com saldo e vencimentos de hoje até 30 dias, com referência no calendário de São Paulo.
- Listas de até 6 prioridades de reposição, 6 vencimentos e 10 movimentos recentes. Os totais não são limitados pelo tamanho das listas.
- Datas inválidas de registros antigos não geram alertas nem quebram a exibição do histórico.
- Estados de carregamento, base vazia e erro; falha na atualização preserva os últimos dados e informa quando foram obtidos. A requisição tem limite de 15 segundos.
- Navegação com menu móvel, links funcionais, saída da sessão, foco visível e atalho para o conteúdo. Cabeçalho e rodapé simplificados.
- Campo de validade opcional no cadastro simplificado de produtos. A validade ainda pertence ao produto, sem controle por lote.
- Módulos de administração e operação carregados sob demanda; pacote inicial reduzido de cerca de 1,38 MB para 1,21 MB.

## Catálogo de produtos

- Catálogo com paginação no servidor (10, 25 ou 50 itens), busca por nome, código de barras ou ID e ordenação por nome, saldo, validade ou cadastro recente.
- Filtros combináveis de situação (ativos/inativos/todos), estoque, categoria e validade. O painel abre o catálogo com o filtro correspondente de reposição ou vencidos.
- Exibição de categoria, unidade, código, saldo fracionário, validade e situação. Dados legados com validade inválida são exibidos sem quebrar a tela.
- Cadastro com nome, categoria, unidade, código de barras, saldo inicial e validade; validação de referências, datas, limites e quantidades. Formulário permanece aberto em caso de falha ao salvar.
- Edição cadastral via PATCH independente de saldo: movimentações concorrentes não são sobrescritas. Produto inativo continua inativo ao editar seus dados.
- Inativação e reativação com confirmação, mantendo saldo e histórico. Administradores e gerentes alteram; demais perfis têm catálogo de consulta, sem ações de escrita.
- Atalho de cada produto ativo abre Movimentações com o produto selecionado. Após cadastrar, o catálogo mostra ativos por ordem de criação, com o novo item primeiro.
- Paginação traduzida para português e estados explícitos de carregamento, erro e consulta sem resultados.

## Cadastros auxiliares e administração

- Categorias, unidades e fornecedores reunidos em Cadastros, com busca, paginação no servidor e formulários que preservam os dados em caso de erro.
- Nomes obrigatórios e normalizados; duplicidades de caixa, espaços e representação Unicode são bloqueadas na transação de gravação. Contato e endereço de fornecedor são opcionais.
- Quantidade de vínculos exibida nas listas. Exclusão somente de registros sem vínculos; produtos inativos, itens de pedido e pedidos antigos também bloqueiam a operação. A API retorna 409 com explicação, preservando os registros.
- Administradores e gerentes alteram cadastros; perfis de consulta apenas leem. As rotas antigas também usam validação e permissões equivalentes.
- Escrita em pedidos, itens, estados, histórico de pedidos e preços restrita a administrador ou gerente. Consulta e alteração de usuários e perfis restritas ao administrador, com login público preservado.
- Administração reorganizada por áreas, com retorno aos cadastros existentes. URLs antigas de categorias, unidades e fornecedores redirecionam para as telas novas.
- Fornecedor selecionável no formulário de produto. A lista de categorias abre o catálogo filtrado, incluindo produtos inativos.
- Nenhuma migração de esquema foi necessária nesta etapa. Renomear altera o rótulo nas associações existentes; não converte unidades nem quantidades.

## Usuários, perfis e sessões

- Gestão de acessos em `/admin/acessos/usuarios`, com busca, situação, perfil e paginação no servidor. Edição envia somente campos alterados; senha vazia mantém a atual. Inativação preserva histórico e identidade.
- Senhas novas exigem 12 caracteres e no máximo 72 bytes UTF-8. Usuário e e-mail têm validação e unicidade sem distinção de caixa; hashes nunca são retornados. Data de inscrição é definida no servidor.
- Administrador não pode inativar ou rebaixar a própria conta. A transação revalida o responsável e impede perder o último administrador ativo, inclusive em alterações concorrentes.
- Perfis básicos 1 (Administrador), 2 (Gerente) e 3 (Consulta) têm nomes e permissões protegidos. Perfis adicionais organizam usuários de consulta; não concedem privilégios por nome. Perfis com usuários, inclusive inativos, não podem ser excluídos.
- Sessões de até duas horas persistidas no SQLite. Logout revoga a sessão atual; alteração de senha, perfil ou situação revoga todas as sessões do usuário afetado. Cada requisição verifica sessão, situação e perfil atuais.
- Frontend encerra sessões expiradas ou rejeitadas com 401, informa o motivo no login e sincroniza saída entre abas. Respostas 403 preservam a sessão. Token é enviado somente à API configurada.
- Migração 3 cria o registro de sessões e padroniza os três perfis básicos, mantendo IDs, perfis adicionais, credenciais e saldos. Tokens anteriores deixam de valer: é necessário entrar novamente. URLs administrativas antigas redirecionam para as telas novas.
- Tokens continuam no armazenamento local do navegador. Recuperação por e-mail, MFA e limitação de tentativas de login permanecem pendentes. Saída sem conexão limpa o navegador, mas a revogação no servidor depende de conectividade; a sessão expira no prazo normal.

## Histórico paginado

- Histórico consultado no servidor com páginas de 10, 25 ou 50 registros, total filtrado e ordenação estável por ID decrescente. A interface deixou de baixar todo o histórico para pesquisar localmente.
- Busca por produto, observação ou ID; filtros combináveis de produto (incluindo inativos), responsável, entrada/saída e período inclusivo no calendário de São Paulo. Datas históricas consideram as regras de horário de verão do fuso nomeado.
- Responsáveis listados somente quando possuem movimentos, inclusive contas inativas. Registros antigos sem responsável têm uma opção própria, sem expor e-mails ou outros dados de acesso.
- Estorno e movimento original mantêm seus vínculos mesmo em páginas ou períodos diferentes. O endpoint antigo em array continua disponível para compatibilidade.
- Aplicar ou limpar filtros volta à primeira página; página além do total é ajustada pelo servidor. Requisições substituídas são canceladas e carregamento tem limite de 15 segundos. Falha limpa a lista e mostra erro, evitando associar resultados antigos a filtros novos.
- Produtos e opções de responsáveis ainda são carregados como listas; sua seleção com busca remota pode ser tratada quando o volume desses cadastros exigir.

## Pedidos e recebimento

- Compras em `/home/pedidos`, com lista paginada, busca, situação, detalhes, itens e eventos auditáveis. Administrador e gerente operam; consulta somente lê.
- Fluxo: rascunho → confirmado → parcial → recebido. Rascunhos e confirmados podem ser cancelados com motivo; pedidos parciais permitem encerrar o saldo que não será entregue. Recebidos e encerrados admitem devoluções sem reabrir o pedido. Somente rascunhos podem ser editados, exigindo a versão atual para evitar perda de alterações concorrentes.
- Um fornecedor e de 1 a 100 produtos ativos distintos por pedido. Quantidades usam a unidade do cadastro, com até três casas; não há conversão de embalagens. Unidade é copiada no item e revalidada na confirmação e no recebimento.
- Preços novos e totais em centavos inteiros; arredondamento por item para o centavo mais próximo, metade para cima. Total máximo de 1 trilhão de centavos. Os campos monetários legados permanecem para consulta/compatibilidade e não comandam os cálculos novos.
- Cada recebimento, parcial ou integral, registra uma entrada por item selecionado, vincula os movimentos à entrega e atualiza os saldos e as quantidades na mesma transação. Falha em qualquer item desfaz a operação inteira. Chaves de idempotência e validação de situação/versão impedem duplicar recebimentos.
- Responsável e data são definidos no servidor. Histórico dos pedidos é imutável e inclui criação, edições e transições. Devoluções registram saídas vinculadas ao pedido, com motivo e limite do recebido ainda não devolvido; não reabrem a quantidade a receber. Movimentos de pedidos não podem ser estornados isoladamente. Estornos antigos são preservados.
- Migração 4 preserva pedidos, itens, estados e histórico antigos como legado somente para consulta, sem recalcular valores ou gerar saldo retroativo. Escrita direta nos antigos endpoints de pedido, item, estado e histórico retorna 405; URLs antigas redirecionam para a nova área.
- Custos médios, lotes, tributos, reembolsos e conversões de unidade ficam para etapas posteriores. A confirmação não envia o pedido ao fornecedor.

## Entregas parciais e devoluções

- Detalhes mostram quantidades pedida, recebida, pendente, devolvida e saldo encerrado. Recebimentos podem selecionar apenas parte dos itens e quantidades; zero na interface omite o item da operação.
- Cada entrega guarda documento opcional, data, responsável, motivo, itens e movimentos, sem alteração posterior. Devolução exige motivo, saldo de estoque suficiente e quantidade não superior ao recebido disponível. Não registra crédito financeiro nem reposição automática.
- Pendência é a quantidade pedida menos a recebida acumulada. Devolução não aumenta essa pendência. Encerrar saldo pendente exige justificativa e impede novas entradas pelo pedido; devoluções continuam permitidas.
- Migração 5 adiciona registros de entregas sem converter ou duplicar recebimentos integrais anteriores. Recebimentos anteriores já estornados não ficam disponíveis para devolução e não reabrem pendências.
- Estoque, itens da entrega, versão e eventos do pedido são gravados juntos. A chave de idempotência compara pedido, tipo, responsável, versão e conteúdo normalizado; reutilizar com outro conteúdo retorna conflito. Repetição exata retorna sem efeitos extras.
- Recebimentos exigem produto ativo e unidade igual à do pedido. Devoluções aceitam produto inativo, mas exigem a mesma unidade e saldo suficiente. Limites são calculados em milésimos inteiros.
- Estorno isolado de movimentos de pedidos é bloqueado; histórico direciona para Pedidos. Entregas e devoluções não têm edição, exclusão nem desfazimento nesta etapa.

## Compatibilidade com a base anterior

Movimentações anteriores à versão 2 são preservadas como histórico legado, sem recalcular o saldo existente e sem inventar responsáveis. Elas não podem ser estornadas, pois o sistema anterior não garantia que tivessem atualizado o saldo. Corrija eventuais diferenças por uma nova entrada ou saída, com observação explicativa.

Os perfis 1 e 2 seguem a convenção já usada pelo frontend: administrador e gerente. Outros IDs são de consulta neste fluxo. As permissões de escrita dos cadastros legados também são verificadas na API; suas regras de negócio e telas ainda precisam de modernização.

## Próximas etapas

1. Atualizar dependências vulneráveis e contratos Swagger; depois ampliar relatórios de compras, pendências e devoluções.
2. Completar validações, paginação e mensagens padronizadas dos demais cadastros.
3. Atualizar dependências vulneráveis e revisar o Swagger, ainda com contratos antigos. As novas operações estão documentadas no README.
4. Definir unidades e valores monetários em centavos; as quantidades agora têm precisão explícita, mas os contratos de preço continuam legados.
5. Melhorar seleções de produtos e responsáveis com busca remota conforme o volume de dados.
6. Verificar restauração de backup e adicionar exportação de relatórios.

As referências BibliotecaPI e agenda regulatória não estão nesta pasta. A aproximação visual deve ser feita quando seus códigos ou referências estiverem disponíveis.
