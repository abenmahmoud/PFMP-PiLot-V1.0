-- =====================================================================
-- Sprint 1 - Tenant routing columns
-- =====================================================================

-- Add the columns the TS types expect.
alter table establishments
  add column if not exists slug            text,
  add column if not exists subdomain       text,
  add column if not exists custom_domain   text,
  add column if not exists domain_verified boolean not null default false,
  add column if not exists primary_color   text,
  add column if not exists status          text not null default 'active';

-- Constraint: status must match the TS enum.
alter table establishments
  drop constraint if exists establishments_status_check;
alter table establishments
  add constraint establishments_status_check
    check (status in ('active', 'trial', 'suspended', 'archived'));

-- Backfill: every existing row gets a slug from its name (lower, dashed).
-- If two rows produce the same slug, the second gets a numeric suffix.
with generated_slugs as (
  select
    id,
    lower(trim(both '-' from regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) as base_slug
  from establishments
  where slug is null
),
deduplicated_slugs as (
  select
    id,
    case
      when row_number() over (partition by base_slug order by id) = 1 then base_slug
      else base_slug || '-' || row_number() over (partition by base_slug order by id)
    end as slug
  from generated_slugs
)
update establishments e
   set slug = nullif(d.slug, '')
  from deduplicated_slugs d
 where e.id = d.id;

-- Make slug NOT NULL once backfilled.
alter table establishments alter column slug set not null;

-- Unique indexes: a slug, a subdomain and a custom_domain must each be unique.
-- subdomain and custom_domain stay nullable (can be empty for a tenant that
-- hasn't claimed one yet), but unique when present.
create unique index if not exists establishments_slug_unique
  on establishments(slug);
create unique index if not exists establishments_subdomain_unique
  on establishments(subdomain) where subdomain is not null;
create unique index if not exists establishments_custom_domain_unique
  on establishments(custom_domain) where custom_domain is not null;
