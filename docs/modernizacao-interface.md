# Modernização da interface e seleção de cadastros

## Atualização no Angular 22

O Angular 22 passou a usar `OnPush` por padrão ([documentação oficial](https://angular.dev/guide/components/advanced-configuration)). Os componentes existentes atualizam propriedades em subscriptions, timers e serviços, sem signals ou AsyncPipe em todos os pontos. A migração precisa preservar explicitamente a estratégia `Eager` nesses componentes; somente adicionar Zone não garante que uma árvore OnPush seja verificada.

A inspeção no Chrome encontrou dados que só apareciam após um clique. A compatibilidade agora está explícita nos componentes existentes. Há teste de renderização da segurança após resposta HTTP dentro da zona, sem clique ou detectChanges adicional. O seletor novo usa OnPush com signals, permitindo modernização gradual sem congelar os fluxos existentes.

O build não faz inline de CSS crítico: essa otimização gerava um script embutido que a CSP bloqueava. Scripts continuam restritos à própria origem. `apps/web/scripts/validar-html.cjs` verifica o HTML de produção e rejeita scripts e handlers inline. O Nginx exige revalidação do index.html para reduzir o uso de HTML antigo após atualizações.

## Produto: categoria, unidade e fornecedor

O formulário de criação/edição usa um seletor remoto compartilhado. Cada consulta retorna até 25 opções, com busca ao digitar e navegação entre páginas. A busca espera 250 ms e cancela consultas anteriores imediatamente, evitando que uma resposta antiga sobrescreva uma consulta nova.

A edição carrega separadamente o ID já selecionado, mesmo fora da primeira página ou do filtro atual. O seletor nunca troca o valor por uma opção parecida. Se o cadastro não existir mais ou a consulta falhar, o formulário impede salvar e oferece correção/repetição. Digitar um texto limpa o ID anterior; é necessário selecionar uma opção da lista. Os campos continuam opcionais e podem ser limpos.

Criar e editar categoria/unidade no próprio diálogo permanece disponível. O cadastro salvo é selecionado automaticamente; mudanças de preços e os demais campos do produto são preservados. Renomear um cadastro compartilhado afeta os outros produtos, conforme o aviso existente. Saldo só muda por movimentação; preços cadastrais não reavaliam o estoque nem alteram pedidos antigos.

A rota autenticada `GET /v1/cadastros/{tipo}/opcoes` aceita `q`, `pagina` e `selecionado`. Retorna somente `id`/`nome`, sem calcular vínculos nem expor contato/endereço do fornecedor. Tipos são fixos, busca escapa `%` e `_`, paginação é estável e o tamanho não pode ser ampliado pelo cliente. As permissões de escrita não mudaram.

## Cobertura e próximos pontos

Os testes cobrem páginas disjuntas, busca literal, limites e filtros inválidos, leitura autenticada, DTO mínimo, preservação de seleção distante, cancelamento de requisição antiga, evento real de digitação e cadastro selecionado inexistente. O link de recuperação tem teste de href navegável.

A implantação não altera o esquema SQLite 14. Formulários administrativos legados, contratos monetários antigos e outros seletores que ainda carregam listas completas permanecem como próximas etapas. A emulação de tablet ajuda a verificar o layout e a navegação; não substitui validação no dispositivo e no leitor físicos.
