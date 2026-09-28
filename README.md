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
- credenciais específicas das integrações habilitadas

Integrações sem credenciais obrigatórias configuradas devem falhar de forma fechada, sem valores padrão no código.

## Banco e migrações

Alterações de schema devem vir acompanhadas de migration em `prisma/migrations`.

```bash
npm run setup
```

Em produção, o mesmo fluxo é executado antes do start da aplicação.

## Deploy

O deploy de aplicação é feito pelo pipeline conectado ao branch `main`. Alterações de configuração do app Shopify em TOML também precisam ser publicadas no Shopify quando aplicável.

## Manutenção do repositório

O repositório não versiona artefatos gerados em `build/` nem páginas de demonstração do template Shopify.

## Observações de segurança

- Não adicionar segredos, tokens ou credenciais ao repositório.
- Não reintroduzir fallbacks de autenticação em integrações.
- Dados operacionais persistentes devem ficar no PostgreSQL, não em `localStorage`.
- O diretório `build/` é gerado no CI e não deve ser versionado.
