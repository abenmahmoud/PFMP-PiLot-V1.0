-- P1.2.4 - Soft-delete support for application users.
--
-- We intentionally do not add a global RLS filter on archived profiles here.
-- Authentication still needs to read the current user's profile and the UI/server
-- functions filter archived users explicitly where needed.

alter table public.profiles
  add column if not exists archived_at timestamptz null;

create index if not exists idx_profiles_archived_at
  on public.profiles (archived_at)
  where archived_at is not null;

comment on column public.profiles.archived_at is
  'Soft-delete timestamp. NULL = active, NOT NULL = archived/disabled.';
