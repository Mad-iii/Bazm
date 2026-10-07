create extension if not exists pgcrypto;

create type user_role as enum ('master', 'organizer');
create type event_type as enum ('ticketed', 'stall');
create type event_status as enum ('draft', 'published', 'closed');
create type booking_status as enum ('pending', 'payment_received', 'approved', 'rejected', 'expired');
create type stall_status as enum ('available', 'held', 'booked', 'blocked');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role user_role not null default 'organizer',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starts_at timestamptz,
  venue text,
  banner_url text,
  type event_type not null,
  status event_status not null default 'draft',
  order_prefix text not null unique,      -- e.g. EXP2026
  order_seq int not null default 0,
  whatsapp_number text,
  cancellation_policy text,
  map_width int not null default 1000,
  map_height int not null default 600,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- source of truth for "which organizer manages which event"
create table event_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  role_scope text not null default 'organizer',
  unique (user_id, event_id)
);

create table ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  total_quantity int not null check (total_quantity >= 0),
  remaining_quantity int not null check (remaining_quantity >= 0),
  created_at timestamptz not null default now()
);

create table stalls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  price numeric(12,2) not null check (price >= 0),
  x numeric not null default 0,
  y numeric not null default 0,
  w numeric not null default 80,
  h numeric not null default 60,
  size_label text,
  category text,
  status stall_status not null default 'available',
  unique (event_id, label)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  event_id uuid not null references events(id) on delete cascade,
  item_type text not null check (item_type in ('ticket', 'stall')),
  tier_id uuid references ticket_tiers(id),
  stall_id uuid references stalls(id),
  buyer_name text not null,
  buyer_company text,
  buyer_email text not null,
  buyer_phone text not null,
  quantity int not null default 1,
  total_price numeric(12,2) not null,
  status booking_status not null default 'pending',
  hold_expires_at timestamptz,
  qr_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on bookings (event_id, status);
create index on bookings (status, hold_expires_at);
create index on bookings (buyer_email);
create index on stalls (event_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  notes text
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  tier_id uuid references ticket_tiers(id) on delete cascade, -- null for stall events
  name text not null,
  email text not null,
  phone text,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  event_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (event_id, created_at desc);

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

-- auto-create profile on signup (everyone starts as organizer)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''), 'organizer');
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- realtime for live stall map / stock
alter publication supabase_realtime add table stalls;
alter publication supabase_realtime add table ticket_tiers;

-- banner storage
insert into storage.buckets (id, name, public) values ('banners', 'banners', true)
on conflict do nothing;

create policy "banners public read" on storage.objects for select using (bucket_id = 'banners');
create policy "banners auth write" on storage.objects for insert to authenticated with check (bucket_id = 'banners');