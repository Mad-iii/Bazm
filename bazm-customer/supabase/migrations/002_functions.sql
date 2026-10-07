create or replace function is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'master' and status = 'active');
$$;

create or replace function can_manage_event(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_master() or exists (
    select 1 from event_assignments ea
    join profiles p on p.id = ea.user_id
    where ea.user_id = auth.uid() and ea.event_id = eid and p.status = 'active'
  );
$$;

create or replace function event_is_public(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from events where id = eid and status = 'published');
$$;

create or replace function next_order_id(eid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare pfx text; seq int;
begin
  update events set order_seq = order_seq + 1 where id = eid
  returning order_prefix, order_seq into pfx, seq;
  return pfx || '-' || lpad(seq::text, 4, '0');
end $$;

create or replace function release_inventory(b bookings) returns void
language plpgsql security definer set search_path = public as $$
begin
  if b.item_type = 'ticket' then
    update ticket_tiers set remaining_quantity = remaining_quantity + b.quantity where id = b.tier_id;
  else
    update stalls set status = 'available' where id = b.stall_id and status = 'held';
  end if;
end $$;

create or replace function expire_holds() returns int
language plpgsql security definer set search_path = public as $$
declare b bookings; n int := 0;
begin
  for b in
    select * from bookings
    where status = 'pending' and hold_expires_at < now()
    for update skip locked
  loop
    update bookings set status = 'expired', updated_at = now() where id = b.id;
    perform release_inventory(b);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function check_rate_limit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare w timestamptz; c int;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into c;
  return c <= p_max;
end $$;

-- atomic ticket hold: row lock on the tier prevents overselling
create or replace function create_ticket_booking(
  p_event_id uuid, p_tier_id uuid, p_quantity int,
  p_name text, p_email text, p_phone text, p_hold_minutes int default 20
) returns bookings
language plpgsql security definer set search_path = public as $$
declare t ticket_tiers; b bookings;
begin
  perform expire_holds();
  if p_quantity < 1 or p_quantity > 10 then raise exception 'BAD_QUANTITY'; end if;
  if not exists (select 1 from events where id = p_event_id and status = 'published' and type = 'ticketed') then
    raise exception 'EVENT_UNAVAILABLE';
  end if;
  select * into t from ticket_tiers where id = p_tier_id and event_id = p_event_id for update;
  if not found then raise exception 'TIER_NOT_FOUND'; end if;
  if t.remaining_quantity < p_quantity then raise exception 'SOLD_OUT'; end if;

  update ticket_tiers set remaining_quantity = remaining_quantity - p_quantity where id = t.id;

  insert into bookings (order_id, event_id, item_type, tier_id, buyer_name, buyer_email, buyer_phone,
                        quantity, total_price, status, hold_expires_at)
  values (next_order_id(p_event_id), p_event_id, 'ticket', t.id, p_name, p_email, p_phone,
          p_quantity, t.price * p_quantity, 'pending', now() + make_interval(mins => p_hold_minutes))
  returning * into b;
  return b;
end $$;

-- atomic stall hold
create or replace function create_stall_booking(
  p_event_id uuid, p_stall_id uuid,
  p_name text, p_company text, p_email text, p_phone text, p_hold_minutes int default 20
) returns bookings
language plpgsql security definer set search_path = public as $$
declare s stalls; b bookings;
begin
  perform expire_holds();
  if not exists (select 1 from events where id = p_event_id and status = 'published' and type = 'stall') then
    raise exception 'EVENT_UNAVAILABLE';
  end if;
  select * into s from stalls where id = p_stall_id and event_id = p_event_id for update;
  if not found then raise exception 'STALL_NOT_FOUND'; end if;
  if s.status <> 'available' then raise exception 'STALL_UNAVAILABLE'; end if;

  update stalls set status = 'held' where id = s.id;

  insert into bookings (order_id, event_id, item_type, stall_id, buyer_name, buyer_company, buyer_email,
                        buyer_phone, quantity, total_price, status, hold_expires_at)
  values (next_order_id(p_event_id), p_event_id, 'stall', s.id, p_name, p_company, p_email, p_phone,
          1, s.price, 'pending', now() + make_interval(mins => p_hold_minutes))
  returning * into b;
  return b;
end $$;

-- called as the logged-in user (JWT), permission checked inside
create or replace function review_booking(p_booking_id uuid, p_action text, p_notes text default null)
returns bookings
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  perform expire_holds();
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not can_manage_event(b.event_id) then raise exception 'FORBIDDEN'; end if;
  if b.status not in ('pending', 'payment_received') then raise exception 'INVALID_STATE'; end if;

  if p_action = 'payment_received' then
    if b.status <> 'pending' then raise exception 'INVALID_STATE'; end if;
    update bookings set status = 'payment_received', hold_expires_at = null, updated_at = now()
    where id = b.id returning * into b;

  elsif p_action = 'approve' then
    update bookings set status = 'approved', hold_expires_at = null, updated_at = now()
    where id = b.id returning * into b;
    if b.item_type = 'stall' then update stalls set status = 'booked' where id = b.stall_id; end if;
    insert into payments (booking_id, verified_by, verified_at, notes)
    values (b.id, auth.uid(), now(), p_notes);

  elsif p_action = 'reject' then
    update bookings set status = 'rejected', hold_expires_at = null, updated_at = now()
    where id = b.id returning * into b;
    perform release_inventory(b);

  else
    raise exception 'BAD_ACTION';
  end if;

  insert into audit_log (user_id, action, target_type, target_id, event_id, meta)
  values (auth.uid(), 'booking.' || p_action, 'booking', b.id, b.event_id,
          jsonb_build_object('order_id', b.order_id, 'notes', p_notes));
  return b;
end $$;

-- lock down who can call what
revoke execute on function create_ticket_booking(uuid, uuid, int, text, text, text, int) from public, anon, authenticated;
revoke execute on function create_stall_booking(uuid, uuid, text, text, text, text, int) from public, anon, authenticated;
revoke execute on function expire_holds() from public, anon, authenticated;
revoke execute on function check_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function next_order_id(uuid) from public, anon, authenticated;
revoke execute on function release_inventory(bookings) from public, anon, authenticated;
revoke execute on function review_booking(uuid, text, text) from public, anon;
grant execute on function review_booking(uuid, text, text) to authenticated;

grant execute on function create_ticket_booking(uuid, uuid, int, text, text, text, int) to service_role;
grant execute on function create_stall_booking(uuid, uuid, text, text, text, text, int) to service_role;
grant execute on function expire_holds() to service_role;
grant execute on function check_rate_limit(text, int, int) to service_role;

-- hold expiry every minute (enable pg_cron in Dashboard > Database > Extensions first)
create extension if not exists pg_cron;
select cron.schedule('expire-holds', '* * * * *', $$select public.expire_holds()$$);