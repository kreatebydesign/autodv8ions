-- 012_crm_archive_and_job_delete.sql
-- Soft-delete for customers (and cascade-archive their jobs).
-- Hard-delete for a single job with related invoices, transactionally.
-- App access remains service-role only (RLS deny-by-default for anon/auth).

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_archived_at
  ON public.customers (archived_at);

CREATE INDEX IF NOT EXISTS idx_jobs_archived_at
  ON public.jobs (archived_at);

CREATE OR REPLACE FUNCTION public.admin_delete_job(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_invoice_count integer := 0;
BEGIN
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  DELETE FROM public.invoices
  WHERE job_id = p_job_id;
  GET DIAGNOSTICS v_invoice_count = ROW_COUNT;

  DELETE FROM public.jobs
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'ok', true,
    'job_id', p_job_id,
    'customer_id', v_job.customer_id,
    'invoices_deleted', v_invoice_count,
    'google_calendar_event_id', v_job.google_calendar_event_id,
    'had_appointment', (
      v_job.google_calendar_event_id IS NOT NULL
      OR v_job.scheduled_at IS NOT NULL
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_customer(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_jobs_archived integer := 0;
  v_job_count integer := 0;
  v_appointment_count integer := 0;
  v_invoice_count integer := 0;
  v_vehicle_count integer := 0;
BEGIN
  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_customer.archived_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_archived', true,
      'customer_id', p_customer_id,
      'archived_at', v_customer.archived_at
    );
  END IF;

  SELECT count(*) INTO v_job_count
  FROM public.jobs
  WHERE customer_id = p_customer_id
    AND archived_at IS NULL;

  SELECT count(*) INTO v_appointment_count
  FROM public.jobs
  WHERE customer_id = p_customer_id
    AND archived_at IS NULL
    AND (
      google_calendar_event_id IS NOT NULL
      OR scheduled_at IS NOT NULL
    );

  SELECT count(*) INTO v_invoice_count
  FROM public.invoices
  WHERE customer_id = p_customer_id;

  SELECT count(*) INTO v_vehicle_count
  FROM public.vehicles
  WHERE customer_id = p_customer_id;

  UPDATE public.customers
  SET archived_at = now()
  WHERE id = p_customer_id;

  UPDATE public.jobs
  SET archived_at = now()
  WHERE customer_id = p_customer_id
    AND archived_at IS NULL;
  GET DIAGNOSTICS v_jobs_archived = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'customer_id', p_customer_id,
    'jobs_archived', v_jobs_archived,
    'job_count', v_job_count,
    'appointment_count', v_appointment_count,
    'invoice_count', v_invoice_count,
    'vehicle_count', v_vehicle_count,
    'archived_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_job(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_archive_customer(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.admin_delete_job(uuid) IS
  'Hard-delete a job and its invoices. Service-role / admin API only.';

COMMENT ON FUNCTION public.admin_archive_customer(uuid) IS
  'Soft-delete a customer and cascade-archive their active jobs. Preserves invoices/vehicles.';
