create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subscription jsonb not null,  -- the full PushSubscription JSON
  created_at timestamptz default now(),
  unique(user_id)  -- one subscription per user (update on re-subscribe)
);

alter table push_subscriptions enable row level security;

create policy "Users manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id);