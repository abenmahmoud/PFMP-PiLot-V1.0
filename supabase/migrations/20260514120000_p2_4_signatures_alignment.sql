-- P2.4 - Signature electronique simple.
-- Additive alignment with the existing document_signatures/tutor_access_tokens
-- schema from 0001_init.sql.

alter table public.generated_documents
  add column if not exists signature_status text not null default 'not_required'
  check (signature_status in ('not_required', 'pending_signatures', 'partial_signed', 'fully_signed'));

alter table public.generated_documents
  add column if not exists required_signers jsonb not null default '[]'::jsonb;

alter table public.generated_documents
  add column if not exists final_signed_pdf_url text;

alter table public.generated_documents
  add column if not exists final_signed_sha256_hex text;

alter table public.generated_documents
  add column if not exists signature_proof jsonb not null default '{}'::jsonb;

alter table public.document_signatures
  add column if not exists signer_phone text;

alter table public.document_signatures
  add column if not exists signer_student_id uuid references public.students(id) on delete set null;

alter table public.document_signatures
  add column if not exists signature_method text
  check (signature_method is null or signature_method in ('click_to_sign', 'draw_signature', 'sms_otp'));

alter table public.document_signatures
  add column if not exists signature_image_url text;

alter table public.document_signatures
  add column if not exists document_hash text;

alter table public.document_signatures
  add column if not exists signed_from_ip text;

alter table public.document_signatures
  add column if not exists signed_from_user_agent text;

alter table public.document_signatures
  add column if not exists magic_link_token_hash text unique;

alter table public.document_signatures
  add column if not exists magic_link_expires_at timestamptz;

alter table public.document_signatures
  add column if not exists magic_link_used_at timestamptz;

alter table public.document_signatures
  add column if not exists otp_code_hash text;

alter table public.document_signatures
  add column if not exists otp_verified_at timestamptz;

create index if not exists idx_signatures_generated_document
  on public.document_signatures(generated_document_id);

create index if not exists idx_signatures_magic_hash
  on public.document_signatures(magic_link_token_hash)
  where magic_link_token_hash is not null;

create table if not exists public.signature_request_emails (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  document_id uuid not null references public.generated_documents(id) on delete cascade,
  signature_id uuid references public.document_signatures(id) on delete cascade,
  signer_email text not null,
  signer_role text not null,
  token_hash text not null,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  reminder_count integer not null default 0,
  last_reminder_at timestamptz
);

create index if not exists idx_signature_request_emails_document
  on public.signature_request_emails(document_id);

create index if not exists idx_signature_request_emails_token_hash
  on public.signature_request_emails(token_hash);

alter table public.signature_request_emails enable row level security;

drop policy if exists signature_request_emails_select on public.signature_request_emails;
create policy signature_request_emails_select on public.signature_request_emails for select
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  );

drop policy if exists signature_request_emails_insert on public.signature_request_emails;
create policy signature_request_emails_insert on public.signature_request_emails for insert
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  );

drop policy if exists signature_request_emails_update on public.signature_request_emails;
create policy signature_request_emails_update on public.signature_request_emails for update
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  )
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  );

create or replace function public.prevent_signed_signature_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status = 'signed' then
    raise exception 'Signed document signatures are immutable';
  end if;
  if tg_op = 'DELETE' and old.status = 'signed' then
    raise exception 'Signed document signatures cannot be deleted';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_signed_signature_update on public.document_signatures;
create trigger trg_prevent_signed_signature_update
  before update on public.document_signatures
  for each row execute function public.prevent_signed_signature_mutation();

drop trigger if exists trg_prevent_signed_signature_delete on public.document_signatures;
create trigger trg_prevent_signed_signature_delete
  before delete on public.document_signatures
  for each row execute function public.prevent_signed_signature_mutation();

comment on column public.generated_documents.signature_status is
  'Signature workflow status for generated PDF instances.';

comment on column public.document_signatures.magic_link_token_hash is
  'SHA-256 hash of the public magic link token. The clear token is never stored.';
