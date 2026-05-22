-- Weekly digest infrastructure for Pro users
-- Tracks sent digests (idempotency) and email rate limiting

-- Idempotency: track which users received digest in which week
create table weekly_digests_sent (
  user_id uuid primary key references profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  digest_week_start date not null
);

create index on weekly_digests_sent(user_id, digest_week_start desc);

-- Rate limiting: count emails sent per user per week by type
create table email_rate_limit (
  user_id uuid not null references profiles(id) on delete cascade,
  email_type text not null check (email_type in ('spin_followup', 'weekly_digest', 'marketing')),
  sent_at timestamptz not null default now(),
  primary key (user_id, email_type, sent_at)
);

create index on email_rate_limit(user_id, email_type, sent_at desc);

-- Enable RLS
alter table weekly_digests_sent enable row level security;
alter table email_rate_limit enable row level security;

-- RLS policies: service role can read/write, users can read their own
create policy "Users can read their own digest tracking"
  on weekly_digests_sent for select
  using (auth.uid() = user_id);

create policy "Users can read their own rate limits"
  on email_rate_limit for select
  using (auth.uid() = user_id);
