# Central de Reservas PMY

Aplicação interna da Portugal Me & You para centralizar reservas, disponibilidade, integrações e operação dos tours em um único painel.

## Stack

- React Router 7
- Shopify Embedded App / App Bridge
- Shopify Admin GraphQL API
- Prisma
- PostgreSQL
- Node.js 20
- Docker
- Northflank

## Principais módulos

- **Dashboard** — faturamento real, ticket médio, vendas por canal, cancelamentos e próximas saídas.
- **Agenda** — reservas, capacidade, bloqueios e checkout por Draft Order Shopify.
- **Integrações** — Shopify, GetYourGuide, Viator, Civitatis, Headout e Tripadvisor quando aplicável.
- **Fila de sincronização** — eventos duráveis, retry e log de sincronização.
- **Guias** — cadastro e gestão operacional.
- **Configurações** — identidade visual, preferências e mapeamentos persistentes por plataforma.
- **Biblioteca de mídia** — catálogo unificado entre PostgreSQL, Shopify Files e imagens de produtos.

## Estrutura principal

```text
app/
  components/pmy/       componentes das áreas da Central
  routes/               rotas HTTP, APIs, webhooks e protocolos de parceiros
  services/             loaders/actions server-side da Central
  utils/                integrações e regras de negócio

prisma/
  schema.prisma
  migrations/
```

A tela principal está em `/`. A rota histórica `/app` apenas autentica e redireciona para a Central.

## Desenvolvimento local

Pré-requisitos:

- Node.js compatível com `package.json`
- PostgreSQL
- Shopify CLI
- App Shopify de desenvolvimento configurado

Instalação:

```bash
npm ci
npm run setup
npm run dev
```

## Build

```bash
npm run build
```

O container de produção executa:

```bash
npm run docker-start
```

O comando aplica `prisma generate`, `prisma migrate deploy` e inicia o servidor React Router.

## Configuração Shopify

- `shopify.app.toml` — produção
- `shopify.app.pmy-nathalia-dev.toml` — desenvolvimento
- `shopify.web.toml` — configuração web do Shopify CLI

Os scopes devem seguir o princípio do menor privilégio e permanecer alinhados com o código em produção.

## Variáveis de ambiente

Nunca commitar credenciais. A produção depende das variáveis configuradas no ambiente de hospedagem, incluindo:

- `DATABASE_URL`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `PMY_PRIMARY_SHOP` (recomendado em produção; usar o domínio canônico `*.myshopify.com`)
- credenciais específicas das integrações habilitadas

Integrações sem credenciais obrigatórias configuradas devem falhar de forma fechada, sem valores padrão no código.

## Modelo de tenancy

A Central de Reservas PMY é **single-tenant por decisão arquitetural**. Os modelos operacionais centrais (`Tour`, `Booking`, `Guide`, `BlockedDate` e relacionados) não são compartilhados entre lojas.

O banco possui um `AppTenantLock` persistente que vincula a base a uma única loja Shopify. O lock é imutável por execução normal e é validado em:

- autenticação administrativa do app;
- instalação/autorização Shopify;
- chamadas administrativas sem sessão;
- webhooks Shopify.

Uma tentativa de usar o mesmo banco por outra loja é bloqueada antes de qualquer gravação operacional. Webhooks de outra loja são autenticados e descartados com HTTP 200 para evitar retries sem contaminar a base.

Quando `PMY_PRIMARY_SHOP` não está configurado, a aplicação tenta inferir a loja já existente a partir de `BusinessSetting`, `PlatformFieldMapping`, `Media` e sessões. Se houver evidência de mais de uma loja, a inicialização falha de forma fechada até `PMY_PRIMARY_SHOP` ser definido explicitamente.

## Banco e migrações

Alterações de schema devem vir acompanhadas de migration em `prisma/migrations`.

```bash
npm run setup
```

Em produção, o mesmo fluxo é executado antes do start da aplicação.

## Deploy

O deploy de aplicação é feito pelo pipeline conectado ao branch `main`. Alterações de configuração do app Shopify em TOML também precisam ser publicadas no Shopify quando aplicável.

O serviço de produção deve manter pelo menos uma instância saudável durante rollouts; um novo commit em `main` também força uma nova execução do pipeline quando for necessário recuperar um deploy interrompido.

A configuração Shopify está padronizada na API `2026-04` tanto no runtime quanto nos webhooks. Antes de publicar a configuração do app, use:

```bash
npm run deploy
```

Esse comando executa um launch guard antes do `shopify app deploy`. O deploy é bloqueado quando:

- `application_url` ainda aponta para domínio temporário (`.code.run`, Northflank), localhost ou URL sem HTTPS;
- `redirect_urls` não contém o callback canônico do domínio de produção;
- `SHOPIFY_APP_URL` não está configurada no ambiente de produção;
- `SHOPIFY_APP_URL` difere do `application_url` do Shopify;
- runtime e webhooks deixam de usar a mesma versão de API.

O domínio definitivo de produção da Central é `https://central.portugalmeandyou.com`. O endereço `code.run` deve permanecer apenas como endpoint temporário de infraestrutura e não deve voltar a ser usado como URL oficial do app.

## GetYourGuide Supplier API

A integração GetYourGuide usa a Supplier API v1 no endereço público canônico:

```text
https://central.portugalmeandyou.com/1
```

Endpoints operacionais:

- `GET /1/get-availabilities`
- `POST /1/reserve`
- `POST /1/cancel-reservation`
- `POST /1/book`
- `POST /1/cancel-booking`

A atualização proativa de disponibilidade usa o endpoint remoto `notify-availability-update`. As credenciais reais do Integrator Portal ficam somente no ambiente de produção, por meio de `GYG_INCOMING_USER`, `GYG_INCOMING_PASS`, `GYG_OUTGOING_USER`, `GYG_OUTGOING_PASS` e `GYG_API_BASE`.

A Central não considera o canal conectado apenas porque essas variáveis existem. O status de conexão exige tráfego autenticado e o painel mantém uma matriz de evidências para Availability, Reserve, Cancel Reservation, Book, Cancel Booking e Notify Availability. A conclusão dessa matriz é evidência técnica interna; a certificação final continua dependendo da aprovação do GetYourGuide.

O mapeamento operacional é feito no nível da opção vendável. Cada `GygProductOption` possui um UUID próprio, usado como `supplier productId`/External Product ID da PMY no Integrator Portal. Categorias de ingresso como ADULT, CHILD, YOUTH e SENIOR permanecem dentro da mesma opção e não ganham product IDs separados. A Central agrupa automaticamente as variantes Shopify por escolha operacional (horário + serviço/pacote), preserva o Tour mestre como entidade-pai e registra o `gygOptionId` remoto em cada opção. O antigo UUID do Tour continua aceito apenas como compatibilidade temporária para self-tests já configurados antes desta migração.

## Manutenção do repositório

O repositório não versiona artefatos gerados em `build/` nem páginas de demonstração do template Shopify.

## Observações de segurança

- Não adicionar segredos, tokens ou credenciais ao repositório.
- Não reintroduzir fallbacks de autenticação em integrações.
- Dados operacionais persistentes devem ficar no PostgreSQL, não em `localStorage`.
- Não remover ou sobrescrever manualmente o `AppTenantLock` em produção sem uma migração deliberada de tenant.
- Ambientes de desenvolvimento não devem apontar para o banco de produção usando uma loja Shopify diferente.
- O diretório `build/` é gerado no CI e não deve ser versionado.
