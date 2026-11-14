# Leitura de código de barras

Na tela **Operar estoque**, escolha **Usar leitor de código**. Conecte um leitor USB/Bluetooth que envie texto como teclado e configure Enter ao final da leitura. Mantenha o campo **Código de barras completo** focado; o aplicativo não captura teclas globalmente. Também é possível digitar o código e tocar em **Localizar produto**.

O produto é selecionado pelo código completo. Confira o nome, a unidade e o saldo, informe a quantidade, revise e confirme. A leitura sozinha nunca grava uma entrada ou saída. Após o sucesso, o campo é limpo e recebe foco para a próxima leitura. A seleção usa quantidade inicial 1 e observação vazia, para não reutilizar dados do produto anterior. A busca manual por nome/código/ID continua disponível.

## Tratamento dos códigos

- Texto de 1 a 80 caracteres, sem caracteres de controle. Não é convertido em número: zeros à esquerda são preservados.
- Correspondência exata e sensível a maiúsculas; não usa nome, ID ou trecho como alternativa. Espaços externos na entrada são removidos; cadastros legados com espaços armazenados precisam ser corrigidos para corresponder ao código canônico.
- Produto inexistente/inativo não é selecionado. Se houver mais de um produto ativo com o mesmo código, a leitura é bloqueada. Um responsável pode corrigir o cadastro; a seleção manual continua disponível quando apropriada.
- Não há imposição de unicidade global que altere cadastros existentes nem validação de dígito verificador EAN/GTIN. Códigos internos alfanuméricos são aceitos. Leitores que enviam prefixos de simbologia, separadores de controle GS1 ou terminador Tab precisam de configuração compatível; não há decodificação desses protocolos nesta etapa.
- O campo não trunca uma leitura longa em um código mais curto: leituras acima do limite são rejeitadas pelo formulário.

## Registro e segurança das operações

A consulta `GET /v1/catalogo/produtos/codigo?codigo=00012345` exige autenticação e não usa cache. Consulta pode localizar produtos; somente administrador, gerente e funcionário explicitamente autorizado podem movimentar.

Ao confirmar uma operação identificada por código, o cliente envia `movimento_codigo_lido` junto da movimentação. O servidor revalida a associação única ao produto na mesma transação que altera o saldo. Se o código foi removido, reassociado ou duplicado após a consulta, a nova operação é rejeitada. Troque o produto e faça uma nova leitura, ou use a busca manual com a seleção consciente do produto.

O código é salvo no movimento imutável e exibido no histórico. Ele também integra a comparação da chave de idempotência: uma repetição exata retorna o movimento original sem novo efeito, mesmo se o cadastro do código mudar depois; reutilizar a chave com outro código, ou sem o código, gera conflito. Operações manuais continuam sem esse campo.

A migração 9 adiciona uma coluna opcional ao histórico, sem alterar saldos, sessões, credenciais ou inventários. Movimentos anteriores ficam com código lido nulo, sem atribuir uma leitura retroativa. A operação exige conexão e mantém a revisão/confirmação já existente; não há fila offline nem uso da câmera.

## Demonstração local

Em `http://localhost:8081/home/operar`, selecione **Usar leitor de código** e experimente:

| Código | Resultado esperado |
| --- | --- |
| `00012345` | Arroz integral, com zeros preservados |
| `00054321` | Café em grãos, unidade fracionária |
| `00000000` | Papel toalha, inicialmente sem saldo |
| `CODE-128-A` | Copos descartáveis |
| `00999999` | Duplicidade de dois produtos ativos; bloqueia seleção |
| `000OFF` | Somente produto inativo; não seleciona |

Conta fictícia de operação: `funcionario` / `funcionario-tablet-2026`. A base usa armazenamento temporário e pode ser recriada. O fixture `apps/api/tests/seed-codigos-qa.cjs` aplica esses códigos somente na demonstração protegida, após os fixtures de estoque mínimo.

A validação desta etapa simulou a entrada de um leitor usando teclado e Enter no Chrome. Um leitor físico e um tablet específico ainda precisam ser conferidos com sua configuração de idioma, prefixos e sufixo. Nenhuma permissão de câmera é solicitada.
