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

Veja [o plano de evolução](docs/evolucao.md). A tela de Movimentações agora possui entrada, saída, histórico e estorno. Os demais módulos preservam grande parte da interface original. As regras de estoque são transacionais e há autorização por perfil para produtos, movimentações, usuários e perfis; os demais cadastros ainda precisam de revisão.

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
