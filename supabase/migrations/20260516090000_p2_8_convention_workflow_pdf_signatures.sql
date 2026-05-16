-- P2.8 - Convention PDF + signatures multi-signataires
-- Migration additive et idempotente.

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_first_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_last_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone text;

ALTER TYPE public.document_status ADD VALUE IF NOT EXISTS 'generated';
ALTER TYPE public.document_status ADD VALUE IF NOT EXISTS 'pending_signatures';
ALTER TYPE public.document_status ADD VALUE IF NOT EXISTS 'signed';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS generated_document_id uuid
  REFERENCES public.generated_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_generated
  ON public.documents(generated_document_id)
  WHERE generated_document_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_student_minor(birth date)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT birth IS NOT NULL AND birth > (current_date - interval '18 years')::date
$$;
