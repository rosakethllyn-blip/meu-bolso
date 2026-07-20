# Meu Bolso 💰

App de finanças pessoais — receitas e despesas, contas a pagar (com alertas de vencimento),
orçamento por categoria, metas de economia e gráficos. Em português, moeda R$.

- **Frontend:** HTML, CSS e JavaScript puro (sem build).
- **Backend:** Supabase (autenticação + banco Postgres com RLS).
- **Hospedagem:** GitHub Pages.

## Configuração
As chaves públicas do Supabase ficam em [`config.js`](config.js). A estrutura do banco
está em [`schema.sql`](schema.sql) (rodar uma vez no SQL Editor do Supabase).

> As chaves em `config.js` são **públicas** por natureza; a segurança dos dados vem das
> políticas RLS do banco (cada pessoa só acessa os próprios dados).
