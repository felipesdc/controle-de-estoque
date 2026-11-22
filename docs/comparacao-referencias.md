# Comparação com BibliotecaPI e agenda regulatória

Conferência das referências locais em 22/11/2026. Foram lidos somente código de interface, templates e documentação; bancos, arquivos de ambiente e credenciais das referências não foram acessados. Esta é uma comparação de implementação, não uma homologação visual dos três sistemas em execução.

Referências: `Downloads/BibliotecaPI/bibliotecapi/static/css/styles.css`, `acervo/templates/base_generic.html`; `Downloads/agenda-regulatoria/frontend/src/styles.scss`, `frontend/src/app.html` e `README.md`.

| Aspecto | BibliotecaPI | Agenda regulatória | Controle de estoque |
| --- | --- | --- | --- |
| Identidade e navegação | Papel claro, verde, navegação lateral, títulos serifados | Fundo claro, verde, navegação lateral e tipografia de sistema | Fundo claro, verde e navegação lateral; tipografia de sistema e Material, preservando identidade própria |
| Adaptação de largura | Grades adaptativas, barra lateral reduzida, tabelas com rolagem | Shell e grades adaptativos, filtros e listas responsivos | Menu recolhido em tablet, filtros remotos e grade da operação; tabelas largas mantêm rolagem no próprio contêiner |
| Teclado e foco | Link de salto, foco visível, sumário de erros | Link de salto, foco visível, erros por campo e controles desabilitados durante envio | Link de salto, foco visível, validação por campo, seleção explícita e revisão antes de movimentar |
| Seleção de registros | Formulários próprios do domínio de acervo | Seletores de pessoas com busca, selecionados e ajuda | Busca remota limitada a 25 opções, hidratação de ID, cancelamento de busca anterior; estados Todos/Sem categoria/Legado preservados |
| Auditoria e correção | Fluxos do acervo separados dos cadastros | Histórico, justificativas e evidências | Estoque imutável; reembolsos com comprovante, autor/data e estorno separado; sem alterar custo histórico |
| Banco e operação | Referência de aplicação enxuta com SQLite | README exige PostgreSQL em produção; SQLite é alternativa explícita de desenvolvimento/testes | SQLite persistente em volume Docker, migrações aditivas e restauração testada; não se presume que o banco de produção da agenda seja SQLite |

Conclusão: a linguagem visual, a navegação e os cuidados de foco/validação estão alinhados. O estoque mantém o fluxo específico de operação por funcionário e os contratos de quantidade/preço. A ampliação dos seletores resolve o carregamento integral que ainda existia em movimentações, categorias do catálogo e categorias do relatório. A agenda permanece referência de auditoria e evidência, sem importar sua arquitetura de produção ou seus fluxos regulatórios para o estoque.

A comparação de código foi concluída com as referências disponíveis. Uma comparação visual simultânea dos sistemas em execução e a homologação com hardware físico não foram realizadas nesta conferência.
