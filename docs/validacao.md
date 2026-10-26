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
