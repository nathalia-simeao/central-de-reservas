// Endereço antigo de "Minhas vendas": agora é a aba Dash.
export const loader = () => new Response(null, { status: 301, headers: { Location: "/guia/dash" } });
