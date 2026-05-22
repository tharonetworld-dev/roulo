-- every spin a Pro user makes
create table if not exists wheel_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  wheel_id uuid not null references wheels(id) on delete cascade,
  result_option text not null,                -- the option the wheel landed on
  all_options jsonb not null,                 -- snapshot of the wheel options at spin time
  spun_at timestamptz not null default now()
);
create index on wheel_spins(user_id, spun_at desc);
create index on wheel_spins(wheel_id, spun_at desc);

-- one optional outcome row per spin
create table if not exists wheel_outcomes (
  spin_id uuid primary key references wheel_spins(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating text not null check (rating in ('positive','negative','didnt_try')),
  note text,                                  -- optional free text
  rated_at timestamptz not null default now()
);
create index on wheel_outcomes(user_id, rated_at desc);

-- which spins have had their 24h follow-up email sent (idempotency)
create table if not exists outcome_followups_sent (
  spin_id uuid primary key references wheel_spins(id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table wheel_spins enable row level security;
alter table wheel_outcomes enable row level security;

create policy "users read own spins" on wheel_spins for select using (auth.uid() = user_id);
create policy "users insert own spins" on wheel_spins for insert with check (auth.uid() = user_id);
create policy "users read own outcomes" on wheel_outcomes for select using (auth.uid() = user_id);
create policy "users write own outcomes" on wheel_outcomes for insert with check (auth.uid() = user_id);
create policy "users update own outcomes" on wheel_outcomes for update using (auth.uid() = user_id);
