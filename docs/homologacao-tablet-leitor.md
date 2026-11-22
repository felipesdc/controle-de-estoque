# Tablet horizontal e leitor de códigos

## Escopo verificável

O leitor suportado funciona como teclado HID (USB ou Bluetooth), sem prefixo e com Enter ao final. O código é texto, com zeros à esquerda preservados. Não há acesso direto à porta USB, Web Bluetooth, câmera ou protocolo proprietário do fabricante.

A aplicação exige seleção, conferência do lote, quantidade, revisão e confirmação. Uma leitura ou Enter repetido não deve gravar uma movimentação. Durante consulta, leituras concorrentes são bloqueadas. Operações exigem conexão; não há fila offline.

## Protocolo com hardware real

Executar no QA (`localhost:8081`, acessível ao tablet conforme a rede local autorizada; o Compose padrão publica apenas no próprio computador). Não ampliar a exposição da aplicação apenas para este teste sem configurar o ambiente adequado.

1. Registrar modelo do tablet, sistema, navegador, leitor, conexão USB/OTG ou Bluetooth e configuração de sufixo. Parear/conectar pelo sistema operacional.
2. Usar funcionário autorizado somente a entradas/saídas. Abrir Operar estoque em orientação horizontal.
3. Configurar HID/teclado, sem prefixo, Enter ao final. Ler `00012345`, conferir zeros e seleção exata. Ler um código alfanumérico suportado pelo dispositivo.
4. Conferir código inexistente, duplicado e produto inativo; nenhum deve gerar saída silenciosa.
5. Repetir Enter e uma segunda leitura durante a consulta. Conferir ausência de movimentos até revisão e confirmação explícitas.
6. Registrar uma entrada e uma saída fictícias no QA; conferir saldo, lote, autor e código lido no histórico. Verificar retorno de foco para a próxima leitura.
7. Desconectar/reconectar o leitor e interromper a rede antes de confirmar. Conferir mensagem de falha, dados preservados e repetição sem duplicidade.
8. Testar teclado virtual, rolagem e orientação horizontal. Registrar capturas, movimentos e resultado por conexão.

## Limite desta execução

Os testes automatizados cobrem o contrato de entrada por teclado, zeros à esquerda, consulta única enquanto há requisição, e ausência de movimentação por leitura/Enter repetido. Eles não demonstram pareamento Bluetooth, alimentação USB/OTG ou funcionamento óptico de um leitor real.

A disponibilidade do dispositivo físico não foi confirmada nesta execução. A homologação USB/Bluetooth permanece pendente de execução do protocolo com o equipamento; não deve ser marcada como aprovada com base em emulação de teclado.

## Evidência de software em 22/11/2026

Chrome nativo com viewport responsivo 1024×768, em orientação horizontal. Conferidas lista de produtos, navegação por teclado, modo leitor, seleção por `00012345`, lote explícito, revisão e confirmação separadas. Enter repetido não confirmou a movimentação; o banco QA permaneceu sem movimentos do funcionário de teste. Revisão apresentou quantidade, produto, lote, saldo previsto e botões separados.

Também conferidos filtro remoto de categoria e registro gerencial de reembolso no QA nessa orientação. O teste de R$ 0,29 atualizou o saldo pendente do crédito sem alterar o estoque. Isso não substitui o protocolo físico acima nem avalia teclado virtual de um tablet real.
