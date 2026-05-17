-- P2.10 - Codes eleves PDF + signature avancee OTP Brevo + PDF papier/final.
-- Migration additive uniquement, compatible avec les schemas P2.4/P2.8 existants.

alter table public.students add column if not exists birth_date date;
alter table public.students add column if not exists parent_first_name text;
alter table public.students add column if not exists parent_last_name text;
alter table public.students add column if not exists parent_email text;
alter table public.students add column if not exists parent_phone text;

create or replace function public.is_student_minor(birth date)
returns boolean
language sql
stable
as $$
  select birth is not null and birth > (current_date - interval '18 years')::date
$$;

alter table public.document_signatures
  add column if not exists otp_phone_e164 text,
  add column if not exists otp_sent_at timestamptz,
  add column if not exists otp_verified_at timestamptz,
  add column if not exists otp_attempts smallint not null default 0,
  add column if not exists otp_locked_until timestamptz,
  add column if not exists handwritten_mention text,
  add column if not exists qualified_timestamp_token text,
  add column if not exists assurance_level text not null default 'simple'
    check (assurance_level in ('simple', 'advanced'));

create table if not exists public.signature_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  signature_id uuid not null references public.document_signatures(id) on delete cascade,
  phone_e164 text not null,
  otp_hash text not null,
  otp_salt text not null,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  attempts smallint not null default 0,
  locked_until timestamptz,
  verified_at timestamptz,
  brevo_message_id text
);

create index if not exists idx_otp_challenges_signature
  on public.signature_otp_challenges(signature_id, expires_at);

create index if not exists idx_otp_challenges_active
  on public.signature_otp_challenges(signature_id)
  where verified_at is null;

alter table public.signature_otp_challenges enable row level security;

alter table public.generated_documents
  add column if not exists pdf_kind text not null default 'final'
    check (pdf_kind in ('paper_backup', 'final', 'audit_trail'));
