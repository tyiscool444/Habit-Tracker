-- HabitThat cloud sync: run once in the Supabase dashboard (SQL Editor → New query → Run).
-- Each signed-in user gets a single row holding all of their habits, tasks and planner blocks.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  saved_at bigint not null -- client timestamp (ms) of the last upload, used to tell versions apart
);

-- Row level security: a user can only ever see or change their own row
alter table public.user_data enable row level security;

create policy "Users read their own data" on public.user_data
  for select using (auth.uid() = user_id);

create policy "Users insert their own data" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "Users update their own data" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Push changes to other open devices straight away
alter publication supabase_realtime add table public.user_data;
