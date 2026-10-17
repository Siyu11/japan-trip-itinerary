create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'zh-CN',
  home_currency text not null default 'CNY',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed', 'archived')),
  total_days integer check (total_days is null or total_days > 0),
  start_date date,
  end_date date,
  is_default boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null check (day_number >= 0),
  item_date date,
  sort_order integer not null default 0,
  time_label text,
  title text not null,
  description text,
  location_name text,
  map_url text,
  official_url text,
  status text not null default 'planned',
  completed boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  category text not null default 'before-trip',
  title text not null,
  url text,
  sort_order integer not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_default_trip_per_user
on public.trips(user_id) where is_default;
create index if not exists itinerary_trip_day_order
on public.itinerary_items(trip_id, day_number, sort_order);
create index if not exists todos_trip_order
on public.todos(trip_id, sort_order);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.todos enable row level security;

revoke all on public.profiles, public.trips, public.itinerary_items, public.todos from anon;
grant select, insert, update, delete on public.profiles, public.trips, public.itinerary_items, public.todos to authenticated;

drop policy if exists "profiles_own_rows" on public.profiles;
create policy "profiles_own_rows" on public.profiles
for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "trips_own_rows" on public.trips;
create policy "trips_own_rows" on public.trips
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "itinerary_own_rows" on public.itinerary_items;
create policy "itinerary_own_rows" on public.itinerary_items
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "todos_own_rows" on public.todos;
create policy "todos_own_rows" on public.todos
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at before update on public.trips
for each row execute function public.set_updated_at();
drop trigger if exists itinerary_set_updated_at on public.itinerary_items;
create trigger itinerary_set_updated_at before update on public.itinerary_items
for each row execute function public.set_updated_at();
drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at before update on public.todos
for each row execute function public.set_updated_at();
