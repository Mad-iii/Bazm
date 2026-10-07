alter table profiles enable row level security;
alter table events enable row level security;
alter table event_assignments enable row level security;
alter table ticket_tiers enable row level security;
alter table stalls enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table waitlist enable row level security;
alter table audit_log enable row level security;
alter table rate_limits enable row level security;  -- no policies = service role only

-- profiles
create policy profiles_read on profiles for select using (id = auth.uid() or is_master());
create policy profiles_master_update on profiles for update using (is_master());

-- events
create policy events_read on events for select using (status = 'published' or can_manage_event(id));
create policy events_insert on events for insert with check (is_master());
create policy events_update on events for update using (can_manage_event(id)) with check (can_manage_event(id));
create policy events_delete on events for delete using (is_master());

-- assignments
create policy assign_read on event_assignments for select using (user_id = auth.uid() or is_master());
create policy assign_write on event_assignments for all using (is_master()) with check (is_master());

-- tiers
create policy tiers_read on ticket_tiers for select using (event_is_public(event_id) or can_manage_event(event_id));
create policy tiers_write on ticket_tiers for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- stalls
create policy stalls_read on stalls for select using (event_is_public(event_id) or can_manage_event(event_id));
create policy stalls_write on stalls for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- bookings: read-only for managers; all writes go through the SQL functions
create policy bookings_read on bookings for select using (can_manage_event(event_id));

-- payments
create policy payments_read on payments for select using (
  can_manage_event((select event_id from bookings where id = booking_id))
);

-- waitlist
create policy waitlist_read on waitlist for select using (can_manage_event(event_id));

-- audit log: master sees all, organizers see their own events
create policy audit_read on audit_log for select using (
  is_master() or (event_id is not null and can_manage_event(event_id))
);