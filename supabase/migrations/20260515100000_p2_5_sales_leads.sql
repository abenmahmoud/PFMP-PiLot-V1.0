CREATE TABLE IF NOT EXISTS public.sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization_name TEXT NOT NULL,
  role_label TEXT,
  organization_type TEXT NOT NULL DEFAULT 'lycee' CHECK (
    organization_type IN ('lycee', 'groupe_scolaire', 'rectorat', 'collectivite', 'autre')
  ),
  city TEXT,
  establishments_count INTEGER CHECK (establishments_count IS NULL OR establishments_count >= 0),
  students_count INTEGER CHECK (students_count IS NULL OR students_count >= 0),
  message TEXT,
  needs_demo BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'qualified', 'demo_scheduled', 'proposal_sent', 'won', 'lost', 'archived')
  ),
  source TEXT NOT NULL DEFAULT 'public_devis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_leads_status_created
  ON public.sales_leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_leads_email
  ON public.sales_leads(email);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_leads_superadmin_read ON public.sales_leads;
CREATE POLICY sales_leads_superadmin_read
  ON public.sales_leads
  FOR SELECT
  USING (public.is_superadmin());

DROP POLICY IF EXISTS sales_leads_superadmin_update ON public.sales_leads;
CREATE POLICY sales_leads_superadmin_update
  ON public.sales_leads
  FOR UPDATE
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP TRIGGER IF EXISTS update_sales_leads_updated_at ON public.sales_leads;
CREATE TRIGGER update_sales_leads_updated_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
