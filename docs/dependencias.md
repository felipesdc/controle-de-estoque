# Consolidação técnica — 4 de novembro de 2026

## Auditoria de dependências

Resultados do `npm audit` sobre os lockfiles, incluindo desenvolvimento. A contagem inclui pacotes afetados transitivamente, não representa quantidade de falhas exploráveis na aplicação.

| Projeto | Antes | Depois | Altas/críticas depois |
| --- | ---: | ---: | ---: |
| API | 13 | 0 | 0 |
| Web | 86 | 21 | 0 |

A auditoria com `--omit=dev` retornou zero ocorrências nos dois projetos.

O detalhe das pendências e seus avisos está em [auditoria-dependencias.json](auditoria-dependencias.json). Os 21 achados restantes são moderados na cadeia de ferramentas de desenvolvimento/build do frontend (CLI, webpack-dev-server, empacotamento e dependências transitivas). O npm propõe Angular CLI/build 22 para concluir as correções; esta entrega mantém o conjunto Angular 21 compatível. Não foram utilizados `npm audit fix --force`, overrides incompatíveis ou exclusão de avisos para ocultar pendências. Uma atualização principal posterior precisa de nova validação funcional e visual.

Na API, os intervalos compatíveis existentes foram preservados e os pacotes transitivos atualizados no lockfile. Angular foi atualizado de 18 para 21.2.26, Material/CDK de 17 para 21.2.14, CLI/build para 21.2.29 e TypeScript para 5.9.3. Componentes de NgModule declaram `standalone: false`; detecção por Zone é explícita e a resolução de módulos usa `bundler`. Os fluxos existentes continuam organizados em módulos.

Use Docker ou Node 22 compatível para desenvolver. O frontend declara Node >=22.12 e <23; a API exige >=22.18. A combinação está baseada na [matriz oficial Angular](https://angular.dev/reference/versions). Não execute o novo frontend com Node 20.17.

Para repetir a auditoria, em cada pasta `apps/api` e `apps/web`:

```sh
npm ci
npm audit
npm audit --omit=dev
```

Os resultados dependem do catálogo de avisos no momento da consulta. Zero avisos no npm não atesta ausência de vulnerabilidades no código, no SQLite, no Node ou nas imagens de sistema. Esta etapa não inclui varredura de imagens do sistema operacional.

## Contratos da API

- Interface local: `/api-docs/`.
- Documento OpenAPI: `/api-docs/openapi.json`.
- Servidor relativo `/v1`, compatível com Nginx/porta configurada; sem endereço de implantação antiga.
- Bearer JWT, login público, sessões e revogação, permissões, controle de versão e chaves de idempotência documentados.
- Fluxos atuais de catálogo/produtos, mínimo, preços contextuais, movimentações/estornos, histórico, painel, compras/entregas/devoluções, reposição, relatórios/CSV e administração de acessos/cadastros.
- Rotas de compatibilidade sinalizadas como depreciadas. Escritas legadas bloqueadas documentam 405; senha de usuário é somente entrada e não aparece nos exemplos de saída.
- Swagger UI usa os próprios arquivos locais de CSS/JS. Autorização não persiste entre recargas.

Em `apps/api`, execute `npm run check:openapi`. O build Docker da API também exige a validação estrutural e as verificações de autenticação/idempotência/CSV/bloqueios do documento. Esse teste não prova equivalência integral entre implementação e documentação; `openapi-http.cjs` verifica amostras dos contratos contra uma API descartável.
