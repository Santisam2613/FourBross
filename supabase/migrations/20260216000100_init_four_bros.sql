-- Four Bros - Supabase/Postgres schema + RLS
-- This migration is designed for Supabase (auth schema available).

begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_item_type') then
    create type public.order_item_type as enum ('service', 'product');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum ('system', 'push');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type public.notification_status as enum ('pending', 'sent', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'payout_status') then
    create type public.payout_status as enum ('requested', 'approved', 'paid', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'wallet_entry_type') then
    create type public.wallet_entry_type as enum ('earning', 'payout', 'adjustment');
  end if;
end $$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.roles (code, name)
values
  ('client', 'Cliente'),
  ('barber', 'Barbero'),
  ('commercial', 'Comercial'),
  ('admin', 'Administrador')
on conflict (code) do nothing;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address text not null,
  phone text,
  timezone text not null default 'America/Mexico_City',
  lat double precision,
  lng double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null references public.roles (code) default 'client',
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  selected_branch_id uuid references public.branches (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_selected_branch_id_idx on public.profiles (selected_branch_id);

create table if not exists public.staff_branches (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (staff_id, branch_id)
);

create index if not exists staff_branches_branch_id_idx on public.staff_branches (branch_id);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 30,
  price_cents integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists services_branch_id_idx on public.services (branch_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name text not null,
  sku text,
  description text,
  price_cents integer not null default 0,
  cost_cents integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (branch_id, sku)
);

create index if not exists products_branch_id_idx on public.products (branch_id);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (branch_id, product_id)
);

create index if not exists inventory_branch_id_idx on public.inventory (branch_id);
create index if not exists inventory_product_id_idx on public.inventory (product_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id),
  branch_id uuid not null references public.branches (id),
  staff_id uuid references public.profiles (id),
  appointment_start timestamptz not null,
  appointment_end timestamptz not null,
  status public.order_status not null default 'pending',
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  deleted_at timestamptz
);

alter table public.orders
add column if not exists timeslot tstzrange
generated always as (tstzrange(appointment_start, appointment_end, '[)')) stored;

alter table public.orders
drop constraint if exists orders_no_overlap_excl;

alter table public.orders
add constraint orders_no_overlap_excl
exclude using gist (staff_id with =, timeslot with &&)
where (staff_id is not null and status in ('pending', 'confirmed') and deleted_at is null);

create index if not exists orders_client_id_idx on public.orders (client_id);
create index if not exists orders_staff_id_idx on public.orders (staff_id);
create index if not exists orders_branch_id_idx on public.orders (branch_id);
create index if not exists orders_appointment_start_idx on public.orders (appointment_start);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_type public.order_item_type not null,
  service_id uuid references public.services (id),
  product_id uuid references public.products (id),
  quantity integer not null default 1,
  unit_price_cents integer not null default 0,
  subtotal_cents integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint order_items_service_xor_product_chk check (
    (item_type = 'service' and service_id is not null and product_id is null) or
    (item_type = 'product' and product_id is not null and service_id is null)
  )
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  client_id uuid not null references public.profiles (id),
  branch_id uuid not null references public.branches (id),
  staff_id uuid references public.profiles (id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists appointments_staff_id_idx on public.appointments (staff_id);
create index if not exists appointments_branch_id_idx on public.appointments (branch_id);
create index if not exists appointments_start_at_idx on public.appointments (start_at);

create table if not exists public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  points integer not null default 0,
  stamps integer not null default 0,
  tier text not null default 'standard',
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (client_id, branch_id)
);

create index if not exists loyalty_cards_branch_id_idx on public.loyalty_cards (branch_id);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  title text not null,
  description text,
  required_points integer not null default 0,
  stock integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists rewards_branch_id_idx on public.rewards (branch_id);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  points_spent integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reward_redemptions_client_id_idx on public.reward_redemptions (client_id);

create table if not exists public.staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint staff_availability_time_chk check (end_time > start_time)
);

create index if not exists staff_availability_staff_id_idx on public.staff_availability (staff_id);
create index if not exists staff_availability_branch_id_idx on public.staff_availability (branch_id);

create table if not exists public.staff_wallet (
  staff_id uuid primary key references public.profiles (id) on delete cascade,
  balance_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status public.payout_status not null default 'requested',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists payouts_staff_id_idx on public.payouts (staff_id);
create index if not exists payouts_status_idx on public.payouts (status);

create table if not exists public.staff_wallet_entries (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  entry_type public.wallet_entry_type not null,
  amount_cents integer not null,
  order_id uuid references public.orders (id) on delete set null,
  payout_id uuid references public.payouts (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists staff_wallet_entries_staff_id_idx on public.staff_wallet_entries (staff_id);
create index if not exists staff_wallet_entries_order_id_idx on public.staff_wallet_entries (order_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  category text not null,
  description text,
  expense_date date not null default current_date,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists expenses_branch_id_idx on public.expenses (branch_id);
create index if not exists expenses_expense_date_idx on public.expenses (expense_date);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  percentage_basis_points integer not null default 0 check (percentage_basis_points between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  channel public.notification_channel not null default 'system',
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  provider text not null default 'fcm',
  status public.notification_status not null default 'pending',
  external_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  deleted_at timestamptz
);

create index if not exists notifications_recipient_id_idx on public.notifications (recipient_id);
create index if not exists notifications_status_idx on public.notifications (status);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  quote text not null,
  rating smallint not null default 5 check (rating between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.benefits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'branches',
    'users',
    'profiles',
    'services',
    'products',
    'inventory',
    'orders',
    'appointments',
    'loyalty_cards',
    'rewards',
    'staff_availability',
    'staff_wallet',
    'payouts',
    'expenses',
    'partners',
    'notifications',
    'testimonials',
    'benefits'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.current_role_code()
returns text
language sql
stable
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.deleted_at is null
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role_code() = 'admin';
$$;

create or replace function public.is_commercial()
returns boolean
language sql
stable
as $$
  select public.current_role_code() = 'commercial';
$$;

create or replace function public.is_barber()
returns boolean
language sql
stable
as $$
  select public.current_role_code() = 'barber';
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
as $$
  select public.current_role_code() = 'client';
$$;

create or replace function public.has_branch_access(target_branch_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.staff_branches sb
      where sb.staff_id = auth.uid()
        and sb.branch_id = target_branch_id
    );
$$;

create or replace function public.is_staff_available(
  p_staff_id uuid,
  p_branch_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns boolean
language plpgsql
stable
as $$
declare
  tz text;
  local_start timestamp;
  local_end timestamp;
  dow int;
begin
  if p_staff_id is null or p_branch_id is null then
    return false;
  end if;
  if p_end_at <= p_start_at then
    return false;
  end if;

  select b.timezone into tz
  from public.branches b
  where b.id = p_branch_id
    and b.deleted_at is null;

  if tz is null then
    tz := 'UTC';
  end if;

  local_start := (p_start_at at time zone tz);
  local_end := (p_end_at at time zone tz);
  dow := extract(dow from local_start);

  if not exists (
    select 1
    from public.staff_branches sb
    where sb.staff_id = p_staff_id
      and sb.branch_id = p_branch_id
  ) then
    return false;
  end if;

  if not exists (
    select 1
    from public.staff_availability sa
    where sa.staff_id = p_staff_id
      and sa.branch_id = p_branch_id
      and sa.day_of_week = dow
      and sa.is_active is true
      and sa.deleted_at is null
      and sa.start_time <= local_start::time
      and sa.end_time >= local_end::time
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.orders o
    where o.staff_id = p_staff_id
      and o.deleted_at is null
      and o.status in ('pending', 'confirmed')
      and tstzrange(o.appointment_start, o.appointment_end, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.credit_staff_wallet(
  p_staff_id uuid,
  p_amount_cents integer,
  p_order_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount_cents must be > 0';
  end if;

  insert into public.staff_wallet (staff_id, balance_cents)
  values (p_staff_id, p_amount_cents)
  on conflict (staff_id) do update
    set balance_cents = public.staff_wallet.balance_cents + excluded.balance_cents;

  insert into public.staff_wallet_entries (staff_id, entry_type, amount_cents, order_id, note)
  values (p_staff_id, 'earning', p_amount_cents, p_order_id, p_note);
end;
$$;

create or replace function public.increment_loyalty(
  p_client_id uuid,
  p_branch_id uuid,
  p_points integer,
  p_stamps integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.loyalty_cards (client_id, branch_id, points, stamps, last_activity_at)
  values (p_client_id, p_branch_id, greatest(p_points, 0), greatest(p_stamps, 0), now())
  on conflict (client_id, branch_id) do update
    set points = public.loyalty_cards.points + greatest(p_points, 0),
        stamps = public.loyalty_cards.stamps + greatest(p_stamps, 0),
        last_activity_at = now();
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.profiles (id, role, first_name, last_name, phone)
  values (
    new.id,
    'client',
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;

  insert into public.loyalty_cards (client_id, branch_id)
  select new.id, b.id
  from public.branches b
  where b.is_active is true and b.deleted_at is null
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.roles enable row level security;
alter table public.branches enable row level security;
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_branches enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.appointments enable row level security;
alter table public.loyalty_cards enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.staff_availability enable row level security;
alter table public.staff_wallet enable row level security;
alter table public.staff_wallet_entries enable row level security;
alter table public.payouts enable row level security;
alter table public.expenses enable row level security;
alter table public.partners enable row level security;
alter table public.notifications enable row level security;
alter table public.testimonials enable row level security;
alter table public.benefits enable row level security;

drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

drop policy if exists "roles_write_admin" on public.roles;
create policy "roles_write_admin"
on public.roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "branches_select_public" on public.branches;
create policy "branches_select_public"
on public.branches
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "branches_write_admin" on public.branches;
create policy "branches_write_admin"
on public.branches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users_select_own_admin_or_commercial" on public.users;
create policy "users_select_own_admin_or_commercial"
on public.users
for select
to authenticated
using (
  deleted_at is null and (
    id = auth.uid()
    or public.is_admin()
    or (
      public.is_commercial()
      and exists (
        select 1
        from public.profiles p
        where p.id = public.users.id
          and p.deleted_at is null
          and p.role = 'client'
      )
    )
  )
);

drop policy if exists "users_write_admin" on public.users;
create policy "users_write_admin"
on public.users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  deleted_at is null and (
    id = auth.uid()
    or public.is_admin()
    or (public.is_commercial() and role = 'client')
    or (
      public.is_barber()
      and exists (
        select 1
        from public.orders o
        where o.staff_id = auth.uid()
          and o.client_id = public.profiles.id
          and o.deleted_at is null
      )
    )
  )
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "staff_branches_select_staff_or_admin" on public.staff_branches;
create policy "staff_branches_select_staff_or_admin"
on public.staff_branches
for select
to authenticated
using (staff_id = auth.uid() or public.is_admin());

drop policy if exists "staff_branches_write_admin" on public.staff_branches;
create policy "staff_branches_write_admin"
on public.staff_branches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "services_select_public" on public.services;
create policy "services_select_public"
on public.services
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "services_write_admin" on public.services;
create policy "services_write_admin"
on public.services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
on public.products
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "products_write_admin" on public.products;
create policy "products_write_admin"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "inventory_select_branch_staff_or_admin" on public.inventory;
create policy "inventory_select_branch_staff_or_admin"
on public.inventory
for select
to authenticated
using (public.has_branch_access(branch_id) and deleted_at is null);

drop policy if exists "inventory_write_admin" on public.inventory;
create policy "inventory_write_admin"
on public.inventory
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "orders_select_by_role" on public.orders;
create policy "orders_select_by_role"
on public.orders
for select
to authenticated
using (
  deleted_at is null and (
    public.is_admin()
    or (public.is_client() and client_id = auth.uid())
    or (public.is_barber() and staff_id = auth.uid())
    or (public.is_commercial() and public.has_branch_access(branch_id))
  )
);

drop policy if exists "orders_insert_client_or_commercial_or_admin" on public.orders;
create policy "orders_insert_client_or_commercial_or_admin"
on public.orders
for insert
to authenticated
with check (
  deleted_at is null
  and (
    public.is_admin()
    or (public.is_client() and client_id = auth.uid() and created_by = auth.uid())
    or (public.is_commercial() and created_by = auth.uid() and public.has_branch_access(branch_id))
  )
);

drop policy if exists "orders_update_by_role" on public.orders;
create policy "orders_update_by_role"
on public.orders
for update
to authenticated
using (
  deleted_at is null and (
    public.is_admin()
    or (public.is_client() and client_id = auth.uid())
    or (public.is_barber() and staff_id = auth.uid())
    or (public.is_commercial() and public.has_branch_access(branch_id))
  )
)
with check (
  deleted_at is null and (
    public.is_admin()
    or (public.is_client() and client_id = auth.uid())
    or (public.is_barber() and staff_id = auth.uid())
    or (public.is_commercial() and public.has_branch_access(branch_id))
  )
);

drop policy if exists "order_items_select_via_order" on public.order_items;
create policy "order_items_select_via_order"
on public.order_items
for select
to authenticated
using (
  deleted_at is null and exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.deleted_at is null
      and (
        public.is_admin()
        or (public.is_client() and o.client_id = auth.uid())
        or (public.is_barber() and o.staff_id = auth.uid())
        or (public.is_commercial() and public.has_branch_access(o.branch_id))
      )
  )
);

drop policy if exists "order_items_insert_via_order" on public.order_items;
create policy "order_items_insert_via_order"
on public.order_items
for insert
to authenticated
with check (
  deleted_at is null and exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.deleted_at is null
      and (
        public.is_admin()
        or public.is_commercial()
        or (public.is_client() and o.client_id = auth.uid() and o.status = 'pending')
      )
  )
);

drop policy if exists "order_items_update_admin_or_commercial" on public.order_items;
create policy "order_items_update_admin_or_commercial"
on public.order_items
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_commercial()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.deleted_at is null
        and public.has_branch_access(o.branch_id)
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_commercial()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.deleted_at is null
        and public.has_branch_access(o.branch_id)
    )
  )
);

drop policy if exists "appointments_select_by_role" on public.appointments;
create policy "appointments_select_by_role"
on public.appointments
for select
to authenticated
using (
  deleted_at is null and (
    public.is_admin()
    or (public.is_client() and client_id = auth.uid())
    or (public.is_barber() and staff_id = auth.uid())
    or (public.is_commercial() and public.has_branch_access(branch_id))
  )
);

drop policy if exists "appointments_write_admin_or_commercial" on public.appointments;
create policy "appointments_write_admin_or_commercial"
on public.appointments
for all
to authenticated
using (public.is_admin() or (public.is_commercial() and public.has_branch_access(branch_id)))
with check (public.is_admin() or (public.is_commercial() and public.has_branch_access(branch_id)));

drop policy if exists "loyalty_cards_select_own_or_admin" on public.loyalty_cards;
create policy "loyalty_cards_select_own_or_admin"
on public.loyalty_cards
for select
to authenticated
using (deleted_at is null and (client_id = auth.uid() or public.is_admin()));

drop policy if exists "loyalty_cards_update_admin_only" on public.loyalty_cards;
create policy "loyalty_cards_update_admin_only"
on public.loyalty_cards
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "rewards_select_public" on public.rewards;
create policy "rewards_select_public"
on public.rewards
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "rewards_write_admin" on public.rewards;
create policy "rewards_write_admin"
on public.rewards
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "reward_redemptions_select_own_or_admin" on public.reward_redemptions;
create policy "reward_redemptions_select_own_or_admin"
on public.reward_redemptions
for select
to authenticated
using (client_id = auth.uid() or public.is_admin());

drop policy if exists "reward_redemptions_insert_own" on public.reward_redemptions;
create policy "reward_redemptions_insert_own"
on public.reward_redemptions
for insert
to authenticated
with check (client_id = auth.uid() or public.is_admin());

drop policy if exists "staff_availability_select_public" on public.staff_availability;
create policy "staff_availability_select_public"
on public.staff_availability
for select
to authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "staff_availability_write_own_or_admin" on public.staff_availability;
create policy "staff_availability_write_own_or_admin"
on public.staff_availability
for all
to authenticated
using (staff_id = auth.uid() or public.is_admin())
with check (staff_id = auth.uid() or public.is_admin());

drop policy if exists "staff_wallet_select_own_or_admin" on public.staff_wallet;
create policy "staff_wallet_select_own_or_admin"
on public.staff_wallet
for select
to authenticated
using (staff_id = auth.uid() or public.is_admin());

drop policy if exists "staff_wallet_write_admin_only" on public.staff_wallet;
create policy "staff_wallet_write_admin_only"
on public.staff_wallet
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "staff_wallet_entries_select_own_or_admin" on public.staff_wallet_entries;
create policy "staff_wallet_entries_select_own_or_admin"
on public.staff_wallet_entries
for select
to authenticated
using (staff_id = auth.uid() or public.is_admin());

drop policy if exists "staff_wallet_entries_write_admin_only" on public.staff_wallet_entries;
create policy "staff_wallet_entries_write_admin_only"
on public.staff_wallet_entries
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "payouts_select_own_or_admin" on public.payouts;
create policy "payouts_select_own_or_admin"
on public.payouts
for select
to authenticated
using (deleted_at is null and (staff_id = auth.uid() or public.is_admin()));

drop policy if exists "payouts_insert_own" on public.payouts;
create policy "payouts_insert_own"
on public.payouts
for insert
to authenticated
with check (staff_id = auth.uid() or public.is_admin());

drop policy if exists "payouts_update_admin_only" on public.payouts;
create policy "payouts_update_admin_only"
on public.payouts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "expenses_select_admin_or_branch" on public.expenses;
create policy "expenses_select_admin_or_branch"
on public.expenses
for select
to authenticated
using (deleted_at is null and (public.is_admin() or public.has_branch_access(branch_id)));

drop policy if exists "expenses_write_admin_only" on public.expenses;
create policy "expenses_write_admin_only"
on public.expenses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "partners_admin_only" on public.partners;
create policy "partners_admin_only"
on public.partners
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications
for select
to authenticated
using (deleted_at is null and (recipient_id = auth.uid() or public.is_admin()));

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid() or public.is_admin())
with check (recipient_id = auth.uid() or public.is_admin());

drop policy if exists "testimonials_select_public" on public.testimonials;
create policy "testimonials_select_public"
on public.testimonials
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "testimonials_write_admin" on public.testimonials;
create policy "testimonials_write_admin"
on public.testimonials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "benefits_select_public" on public.benefits;
create policy "benefits_select_public"
on public.benefits
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "benefits_write_admin" on public.benefits;
create policy "benefits_write_admin"
on public.benefits
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;
