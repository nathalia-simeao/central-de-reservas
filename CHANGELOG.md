# Changelog — Central de Reservas PMY

## 2026-09

### Plataforma
- Centralização da arquitetura de tours e reservas.
- Separação da interface em Dashboard, Agenda, Integrações, Guias, Automações, Configurações e Banco de Mídias.
- Extração da lógica server-side da rota principal.
- Configurações de negócio persistidas no PostgreSQL.
- Mapeamentos de campos persistentes por plataforma.

### Shopify
- Draft Orders reais com `invoiceUrl`.
- Auditoria e redução dos scopes ao necessário.
- Configuração separada entre produção e desenvolvimento.
- Webhooks e leitura operacional de pedidos.
- Biblioteca de mídia integrada ao Shopify Files.

### Integrações
- Estrutura para GetYourGuide, Viator, Civitatis e Headout.
- Tripadvisor separado entre conteúdo/reviews e canais de reserva.
- Autenticação GetYourGuide sem credenciais fallback.
- Fila durável de sincronização, retry e log operacional.

### Dados e operação
- Dashboard baseado em valores reais dos bookings.
- Disponibilidade e capacidade centralizadas.
- Persistência de bloqueios, reservas, guias e configurações.
- Biblioteca de mídia PMY consolidada com PostgreSQL e Shopify.
