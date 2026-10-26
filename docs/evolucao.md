# Evolução do controle de estoque

## Implementado

- Monorepositório com `apps/web` e `apps/api`, Docker Compose, Nginx e SQLite persistente.
- Migração incremental da base para a versão 2, preservando saldos e registros anteriores.
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

## Compatibilidade com a base anterior

Movimentações anteriores à versão 2 são preservadas como histórico legado, sem recalcular o saldo existente e sem inventar responsáveis. Elas não podem ser estornadas, pois o sistema anterior não garantia que tivessem atualizado o saldo. Corrija eventuais diferenças por uma nova entrada ou saída, com observação explicativa.

Os perfis 1 e 2 seguem a convenção já usada pelo frontend: administrador e gerente. Outros IDs são de consulta neste fluxo. A autorização dos demais cadastros ainda precisa de revisão completa.

## Próximas etapas

1. Modernizar o catálogo de produtos e as telas administrativas, com filtros de estoque/validade e ações alinhadas às permissões.
2. Completar validações, paginação, mensagens padronizadas e permissões dos demais cadastros. A busca atual do histórico é local e carrega todos os registros.
3. Atualizar dependências vulneráveis e revisar o Swagger, ainda com contratos antigos. As novas operações estão documentadas no README.
4. Definir unidades e valores monetários em centavos; as quantidades agora têm precisão explícita, mas os contratos de preço continuam legados.
5. Definir transições de pedido, recebimento e efeitos no estoque antes de integrar pedidos às movimentações.
6. Verificar restauração de backup e adicionar exportação de relatórios.

As referências BibliotecaPI e agenda regulatória não estão nesta pasta. A aproximação visual deve ser feita quando seus códigos ou referências estiverem disponíveis.
