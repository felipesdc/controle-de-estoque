# Backup e restauração do SQLite

Execute os comandos na raiz do projeto, com Docker Desktop em execução e a imagem atual da API compilada. Não é necessário instalar SQLite ou Node no computador. Os scripts usam Bash, disponível no macOS e Linux.

## Criar um backup

```sh
./scripts/backup.sh
```

O comando gera uma cópia consistente com a API online, verifica a cópia em um container separado e imprime o diretório completo ao terminar. O diretório padrão é `backups/`, ignorado pelo Git. Nomes usam data/hora UTC e um sufixo aleatório, por exemplo `estoque-20261029T001500Z-AbCdEf`.

Para outro disco ou pasta, use um diretório dedicado:

```sh
BACKUP_DIR="/caminho/para/copias-estoque" ./scripts/backup.sh
```

Cada diretório contém:

- `estoque.sqlite`: banco completo e consistente, incluindo usuários e hashes de senha, permissões, saldos, pedidos, recebimentos, devoluções e histórico.
- `manifesto.json`: data UTC, imagem de origem, versão de esquema, checksum SHA-256, estrutura e contagens/digests das tabelas.

Pastas são privadas (0700) e arquivos, 0600. O comando não copia o `.env`, código nem imagem Docker. Preserve também a configuração necessária para reinstalar a aplicação. Não há expurgo automático ou agendamento instalado; mantenha cópias em outro local/dispositivo conforme sua rotina. Um backup no mesmo disco protege de alterações indevidas, mas não da perda desse disco.

O arquivo principal não é copiado diretamente enquanto está em uso: a ferramenta usa a [API de backup do SQLite do Node 22](https://nodejs.org/download/release/v22.21.0/docs/api/sqlite.html#sqlitebackupsourceDb-destination-options), que considera o estado consistente do banco, inclusive operações registradas no WAL. Não é necessário copiar WAL/SHM junto com o backup produzido por este comando.

Se ocorrer erro, o script retorna código diferente de zero. Uma pasta `.incompleto-*` pode permanecer para diagnóstico; ela não é apresentada como backup concluído. O manifesto e o banco precisam estar juntos. O checksum detecta corrupção ou alterações acidentais; não é uma assinatura digital.

## Verificar uma cópia existente

```sh
./scripts/verificar-backup.sh "backups/estoque-DATA-SUFIXO"
```

O verificador confere:

1. Checksum, integridade SQLite e vínculos de chaves estrangeiras.
2. Esquema, contagem e digest de todas as tabelas em relação ao manifesto.
3. Cópia restaurada em diretório temporário, sem alterar o arquivo original.
4. Inicialização real da API sobre essa cópia e preservação dos dados essenciais, incluindo hashes de credenciais, saldos, pedidos e movimentações.
5. Saúde e consultas autenticadas ao painel, pedidos, usuários e histórico de estoque.

O container de verificação não publica portas, não possui rede externa e não recebe o volume da aplicação principal. O sistema de arquivos da imagem é somente leitura; apenas `/tmp` é gravável. O backup é montado somente para leitura. A verificação usa administrador e sessão temporária exclusivamente na cópia, com segredo JWT aleatório, sem precisar conhecer senhas reais. Dados e credenciais não são impressos nos logs. A cópia e o container são descartados ao terminar.

A inicialização da cópia pode aplicar migrações da imagem atual. Não restaure backups de uma versão mais nova com uma imagem antiga. A verificação precisa passar antes de qualquer troca da base principal. Uma cópia sem administrador ativo também será rejeitada na etapa de validação autenticada.

## Restaurar a base da aplicação

**Este comando substitui a posição atual pelos dados do backup escolhido.** Execute em uma janela de manutenção, sem operações de usuários:

```sh
./scripts/restaurar-backup.sh "backups/estoque-DATA-SUFIXO"
```

O comando bloqueia restaurações concorrentes no volume. Em interrupção abrupta, pode restar um marcador `/data/.restore-lock`; confirme que não há restauração em andamento antes de removê-lo manualmente.

O comando:

1. Verifica o backup em ambiente isolado, antes de parar a aplicação.
2. Gera e verifica um novo backup do estado atual, imprimindo seu caminho.
3. Para somente a API; a interface fica indisponível para consultas/operações durante a troca.
4. Consolida o WAL da base parada e guarda os arquivos anteriores numa pasta `.restore-rollback-*` do volume.
5. Instala o arquivo validado com substituição atômica do banco principal e permissões do usuário da API.
6. Invalida as sessões presentes no backup, sem alterar as senhas ou permissões dos usuários.
7. Reinicia a API e confere a saúde. Se falhar, tenta recolocar o banco anterior e reiniciar a API; o comando retorna erro.

Após sucesso, entre novamente. O backup do estado anterior permanece no diretório de backups; arquivos anteriores também ficam na pasta de recuperação do volume, cujo caminho é exibido. Não são apagados automaticamente. Se o rollback falhar, a API permanece parada e a mensagem orienta a usar o backup anterior.

Os scripts exigem o volume nomeado da API montado em `/data` e `SQLITE_PATH=/data/ARQUIVO.sqlite`. Eles não removem volumes nem usam `docker compose down -v`. A configuração padrão do projeto já atende a esses requisitos. Verificações independentes usam somente a imagem da API; a restauração operacional exige a API em execução inicialmente para criar a cópia de segurança anterior. Recuperar automaticamente uma base principal que já não consegue iniciar não está coberto por este comando; nesse caso, preserve os arquivos existentes e faça a recuperação em uma instalação/volume separado antes de trocar a origem.

## Testar o procedimento sem dados reais

```sh
./scripts/testar-backup.sh
```

O teste cria o projeto Docker `estoque-backup-qa`, sem rede externa nem portas publicadas, com volume e credenciais descartáveis. Cria usuários, produto, saldo, pedido parcial, recebimento e devolução; faz backup, altera o saldo e executa a restauração pelo mesmo comando usado em operação.

Também testa rejeição de arquivo corrompido antes de parar a API, preservação das credenciais e autorização do funcionário, invalidação das sessões antigas e recuperação do estado anterior quando a verificação de saúde é forçada a falhar. Backups, container e volume desse projeto de testes são removidos ao terminar. O volume principal nunca é montado pelo teste.

## Compatibilidade

- Nenhuma migração de dados é criada por esta funcionalidade.
- Backups contêm todos os dados pessoais existentes no banco; mantenha o diretório privado e fora do Git. A pasta padrão já é ignorada, mas um `git add -f` pode forçar sua inclusão.
- Não copie apenas um arquivo SQLite de uma base ativa por meios externos. Para cópia manual, pare a API e preserve o conjunto correto de arquivos; prefira o comando online documentado acima.
- O fluxo não faz sincronização em nuvem, criptografia, retenção automática ou recuperação até um instante entre backups.
