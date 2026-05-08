-- =====================================================================
-- P0.2.1 - Fix RLS recursion on current_establishment_id()
-- =====================================================================
-- Root cause:
-- current_establishment_id() was SECURITY INVOKER and reads profiles.
-- When called from policies on profiles or tenant-scoped tables, that
-- internal profiles read re-enters RLS and causes stack depth overflow.
--
-- Fix:
-- Run this helper as SECURITY DEFINER with an explicit search_path, in
-- line with the other RLS helpers. Business semantics stay unchanged:
-- superadmin may use active_establishment_id from JWT metadata; all
-- other users fall back to their profiles.establishment_id.

CREATE OR REPLACE FUNCTION public.current_establishment_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select coalesce(
    case
      when current_role_app() = 'superadmin' then
        nullif(
          (auth.jwt() -> 'user_metadata' ->> 'active_establishment_id'),
          ''
        )::uuid
      else null
    end,
    (select establishment_id from profiles where id = auth.uid())
  );
$function$;
