
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Logements
create table public.logements (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'studio',
  title_fr text not null,
  title_de text,
  title_en text,
  description_fr text,
  description_de text,
  description_en text,
  price numeric not null default 0,
  currency text not null default 'FCFA',
  price_unit text not null default 'nuit',
  equipments text[] not null default '{}',
  images text[] not null default '{}',
  available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.logements to anon, authenticated;
grant all on public.logements to authenticated;
grant all on public.logements to service_role;

alter table public.logements enable row level security;

create policy "Anyone can view logements" on public.logements
  for select to anon, authenticated using (true);
create policy "Admins manage logements" on public.logements
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger logements_updated_at before update on public.logements
  for each row execute function public.set_updated_at();

-- Testimonials
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  rating int not null default 5,
  message_fr text not null,
  message_de text,
  message_en text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.testimonials to anon, authenticated;
grant all on public.testimonials to authenticated;
grant all on public.testimonials to service_role;

alter table public.testimonials enable row level security;

create policy "Anyone can view testimonials" on public.testimonials
  for select to anon, authenticated using (true);
create policy "Admins manage testimonials" on public.testimonials
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Reservations
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  arrival_date date not null,
  departure_date date not null,
  guests int not null default 1,
  logement_type text,
  message text,
  status text not null default 'nouvelle',
  created_at timestamptz not null default now()
);

grant insert on public.reservations to anon, authenticated;
grant select, update, delete on public.reservations to authenticated;
grant all on public.reservations to service_role;

alter table public.reservations enable row level security;

create policy "Anyone can create reservation" on public.reservations
  for insert to anon, authenticated with check (true);
create policy "Admins read reservations" on public.reservations
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update reservations" on public.reservations
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete reservations" on public.reservations
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Contact messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  message text not null,
  status text not null default 'nouveau',
  created_at timestamptz not null default now()
);

grant insert on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;

alter table public.messages enable row level security;

create policy "Anyone can create message" on public.messages
  for insert to anon, authenticated with check (true);
create policy "Admins read messages" on public.messages
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update messages" on public.messages
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete messages" on public.messages
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
