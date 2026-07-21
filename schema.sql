-- =========================================================
-- Meu Bolso — esquema do banco (Supabase / PostgreSQL)
-- COMO USAR: no painel do Supabase, abra "SQL Editor",
-- cole TUDO isto e clique em "Run". Roda uma vez só.
-- =========================================================

-- PERFIL --------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  monthly_income numeric default 0,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

-- CATEGORIAS ----------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  color text default '#10b981',
  created_at timestamptz default now()
);

-- LANÇAMENTOS (receitas e despesas) -----------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount numeric not null,
  category text,
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- CONTAS A PAGAR ------------------------------------------
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  category text,
  due_date date not null,
  recurring boolean default false,
  repeat_count int,                    -- nº de meses que repete (null = sempre)
  is_invoice boolean default false,    -- é fatura de cartão?
  items jsonb,                         -- itens da fatura: [{desc, category, amount, installments}]
  variable boolean default false,      -- valor muda a cada mês (luz, água)?
  amounts jsonb,                       -- valor por mês quando variável: {"AAAA-MM": valor}
  created_at timestamptz default now()
);

-- PAGAMENTOS DE CONTAS (marca paga por mês) ---------------
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  period text not null,               -- formato 'AAAA-MM'
  paid_at timestamptz default now(),
  unique (bill_id, period)
);

-- ORÇAMENTO POR CATEGORIA ---------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric not null default 0,
  unique (user_id, category)
);

-- METAS DE ECONOMIA ---------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target numeric not null,
  saved numeric not null default 0,
  deadline date,
  created_at timestamptz default now()
);

-- SEGURANÇA (RLS): cada pessoa só acessa os próprios dados -
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.transactions  enable row level security;
alter table public.bills         enable row level security;
alter table public.bill_payments enable row level security;
alter table public.budgets       enable row level security;
alter table public.goals         enable row level security;

drop policy if exists "own profile"       on public.profiles;
drop policy if exists "own categories"    on public.categories;
drop policy if exists "own transactions"  on public.transactions;
drop policy if exists "own bills"         on public.bills;
drop policy if exists "own bill_payments" on public.bill_payments;
drop policy if exists "own budgets"       on public.budgets;
drop policy if exists "own goals"         on public.goals;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own bills" on public.bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own bill_payments" on public.bill_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ao cadastrar, cria o perfil + categorias padrão automaticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.categories (user_id, name, type, color) values
    (new.id, 'Salário',       'income',  '#10b981'),
    (new.id, 'Freelance',     'income',  '#22c55e'),
    (new.id, 'Investimentos', 'income',  '#14b8a6'),
    (new.id, 'Presente',      'income',  '#84cc16'),
    (new.id, 'Outros',        'income',  '#64748b'),
    (new.id, 'Alimentação',   'expense', '#ef4444'),
    (new.id, 'Moradia',       'expense', '#f97316'),
    (new.id, 'Transporte',    'expense', '#f59e0b'),
    (new.id, 'Saúde',         'expense', '#ec4899'),
    (new.id, 'Educação',      'expense', '#8b5cf6'),
    (new.id, 'Lazer',         'expense', '#3b82f6'),
    (new.id, 'Compras',       'expense', '#06b6d4'),
    (new.id, 'Contas',        'expense', '#eab308'),
    (new.id, 'Assinaturas',   'expense', '#a855f7'),
    (new.id, 'Outros',        'expense', '#64748b');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
