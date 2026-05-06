-- =====================================================================
-- Sprint 2 - Auth: superadmin tenant switcher via JWT claim
-- =====================================================================
-- Le superadmin peut basculer entre tenants via un dropdown UI. Le switch
-- est materialise par un custom claim JWT `active_establishment_id` pose
-- sur la session via supabase.auth.updateUser({ data: { ... } }).
--
-- current_establishment_id() est mise a jour pour lire d'abord ce claim
-- (uniquement si l'utilisateur est superadmin), puis tomber sur
-- profiles.establishment_id en fallback.

create or replace function current_establishment_id()
returns uuid
language sql stable
as $$
  select coalesce(
    -- superadmin uniquement : lit le claim user_metadata.active_establishment_id
    case
      when (select role = 'superadmin' from profiles where id = auth.uid()) then
        nullif(
          (auth.jwt() -> 'user_metadata' ->> 'active_establishment_id'),
          ''
        )::uuid
      else null
    end,
    -- fallback standard : establishment_id du profil
    (select establishment_id from profiles where id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- Trigger profil auto-cree a la signup
-- ---------------------------------------------------------------------
-- Quand un user est cree via auth.users, on insere un profil minimal
-- dans public.profiles. L'admin du tenant complete ensuite les details
-- (role, classes, assignments) depuis la console.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, establishment_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    'eleve',  -- role par defaut, a promouvoir manuellement
    nullif(new.raw_user_meta_data ->> 'establishment_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- updated_at trigger pour profiles (coherence avec autres tables)
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();
