# Segurança e atualização técnica

## Uso

Acesse **Minha segurança** no menu. Cada pessoa pode alterar a própria senha, ativar TOTP em um aplicativo autenticador, renovar códigos de recuperação ou desativar o fator com senha e código. A preparação mostra uma chave manual por até dez minutos. Os dez códigos de recuperação aparecem uma única vez; cada um serve uma vez. Guarde-os fora do tablet. A ativação e a renovação encerram as outras sessões; trocar a senha encerra todas.

O login com MFA retorna um desafio de cinco minutos, nunca uma sessão parcial. Ele aceita cinco verificações. Códigos TOTP já usados não são aceitos novamente, inclusive dentro dos 30 segundos da mesma janela. Aguarde o próximo código se acabou de ativar. Recuperar a senha por e-mail mantém o segundo fator obrigatório. Não existe botão administrativo para ignorar MFA.

As sessões duram duas horas e ficam no `sessionStorage`, por aba. Uma sessão antiga do `localStorage` é migrada e apagada na primeira abertura. Sair avisa as outras abas sem compartilhar tokens. Isso limita a persistência no dispositivo; código malicioso executado na página ainda pode acessar a sessão, portanto CSP e validação continuam necessários.

## Chave e cópias de segurança

Execute `python3 scripts/preparar-seguranca.py` para criar `AUTH_ENCRYPTION_KEY` no `.env` local. O comando preserva uma chave existente, não imprime seu valor e usa 32 bytes aleatórios em base64. Os segredos TOTP e a fila de e-mail usam AES-256-GCM. **Guarde a chave separadamente, junto ao procedimento de recuperação**, sem incluí-la no Git. Não substitua uma chave usada: os segredos atuais não poderão ser decifrados. A ausência de chave desabilita novas ativações e nunca permite ignorar um fator ativo.

O backup contém os segredos cifrados; a chave não está no arquivo SQLite. A verificação usa uma cópia isolada, sem envio de e-mail. A restauração operacional apaga sessões, desafios, links pendentes, fila de e-mail, preparação de MFA e códigos de recuperação antigos para impedir que credenciais já consumidas voltem a funcionar. O TOTP ativo é preservado; após restaurar, aguarde até 90 segundos para uma janela nova do autenticador, entre e gere novos códigos. São necessários o banco, a chave correta e acesso ao autenticador. Guarde os códigos antes de perder o dispositivo; e-mail sozinho não remove MFA.

## Recuperação por e-mail

Preencha no `.env` local:

- `PUBLIC_URL`: URL pública da instalação (HTTPS; HTTP permitido apenas para localhost). O Docker publica por padrão somente em `127.0.0.1:8080`. Acesso por tablet em rede exige publicação e HTTPS configurados no ambiente.
- `SMTP_HOST`, `SMTP_PORT` (587 por padrão), `SMTP_FROM`.
- `SMTP_USER` e `SMTP_PASSWORD`, quando o provedor exigir autenticação.
- `SMTP_SECURE=true` para TLS direto; a porta 465 implica TLS direto. Nas outras portas, STARTTLS é obrigatório e não há fallback sem TLS.
- `AUTH_ENCRYPTION_KEY`, conforme acima.

Recrie a API após configurar: `docker compose up -d --force-recreate api`. Sem configuração completa, a tela informa indisponibilidade. A implementação está pronta, mas a entrega real depende do provedor e das credenciais locais. Não há credenciais de SMTP nos testes e nenhum e-mail real é enviado por eles.

A solicitação retorna a mesma mensagem para e-mail existente e inexistente. Tokens aleatórios de 256 bits expiram em quinze minutos, são armazenados por hash, vinculados à conta e consumidos atomicamente. O link usa fragmento da URL e é retirado do endereço ao abrir a tela; não use ferramentas de análise que capturem o fragmento. A fila armazena destinatário e link cifrados, processa cinco mensagens por ciclo e tenta no máximo três vezes. É um worker do processo único da API, sem suporte a múltiplas réplicas concorrentes.

## Proteções e limites

- Login: 8 tentativas por conta e 120 por IP em quinze minutos; usuário e e-mail da mesma conta compartilham o limite. Senha correta reinicia o limite da conta. Os contadores persistem no SQLite. A API retorna 429 e `Retry-After`.
- MFA: 30 verificações por IP em quinze minutos, além de cinco por desafio. Preparação, ativação, troca de senha e códigos exigem controles próprios e reautenticação.
- Recuperação: 30 solicitações por IP e 3 por e-mail por hora; redefinição: 20 por IP em quinze minutos.
- API verifica HS256 explicitamente, sessão persistida, situação e permissões atuais da conta. Sessões anteriores à ativação de MFA são revogadas.
- Helmet, CSP no Nginx, bloqueio de enquadramento, `nosniff`, política de referência, CORS limitado à origem configurada e requisições até 512 KB.
- O Nginx substitui `X-Forwarded-For` pelo endereço da conexão. A API confia em um proxy e permanece sem porta pública no Compose. Se mudar essa topologia, reveja a confiança do proxy.
- Senhas: mínimo de 12 caracteres e máximo de 72 bytes UTF-8, com bcrypt. Eventos pessoais registram ação e data, sem senhas, tokens ou endereços de rede.

A instalação local continua usando HTTP no loopback. HTTPS e exposição em rede não são provisionados por esta mudança. A política CSP permite estilos inline necessários ao Material, mas não scripts inline na interface. O Swagger utiliza seus próprios assets locais; não salva autorização.

## Modernização

Angular/Material/CDK 22.3, TypeScript 6.0 e RxJS 7.8; Node 22.22.3 ou superior na série 22. Docker é a referência de execução. O bootstrap AOT usa `platformBrowser`, os builders passam a `@angular/build` e as animações são carregadas sob demanda. Imports do shell foram reduzidos; os módulos de negócio existentes permanecem para uma migração incremental.

Vitest substitui Karma/Jasmine. Os specs gerados que apenas verificavam criação de componentes sem suas dependências foram substituídos por testes de sessão e do login em duas etapas. A suíte de integração da API permanece e ganha migração 13→14, MFA, recuperação concorrente e limites persistentes. `scripts/testar-api.sh` executa testes isolados sem rede, excluindo fixtures e o par `http.cjs`/`persistence.cjs`, que exige o Compose com Nginx e preparação própria. O workflow `validacao.yml` verifica build, testes, auditoria e restauração sem publicar a aplicação.

A modernização completa dos formulários CRUD, seletores remotos e contratos monetários legados continua como etapa posterior. Esta entrega atualiza a base técnica e os fluxos de segurança, preservando os contratos operacionais existentes.

Para verificar o proxy sem tocar na base principal, inicie o Compose de `apps/api/tests/dashboard-qa.compose.yaml` e execute `docker compose -f apps/api/tests/dashboard-qa.compose.yaml exec -T api node < scripts/testar-proxy-seguranca.cjs`. O teste recusa a base principal e limpa os contadores artificiais ao concluir.
