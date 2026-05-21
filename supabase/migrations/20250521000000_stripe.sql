-- Add Stripe columns to profiles
alter table profiles add column if not exists trial_ends_at timestamptz default (now() + interval '30 days');
alter table profiles add column if not exists stripe_customer_id text unique;

-- Backfill: existing users get 30 days from their account creation
update profiles set trial_ends_at = created_at + interval '30 days' where trial_ends_at is null;

-- Subscriptions table (written exclusively by webhook via service role)
create table if not exists subscriptions (
  id text primary key,                      -- stripe sub id (sub_…)
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null,                     -- active, trialing, past_due, canceled, incomplete
  price_id text not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on subscriptions(user_id);

-- RLS: users can read their own subs; writes come from webhook via service role (bypasses RLS)
alter table subscriptions enable row level security;
create policy "users read own subs" on subscriptions for select using (auth.uid() = user_id);
